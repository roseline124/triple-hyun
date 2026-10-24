import { randomUUID } from "node:crypto";
import type { Transaction } from "@libsql/client";
import { txGetOne, txPutOne, withTransaction } from "@/lib/db";
import type { Guild, Wallet } from "@/lib/types";
import { debit } from "@/features/wallet/ledger";
import { checkCredentials, ensureProfile, ProfileError } from "@/features/scan/profile";
import type { Credentials } from "@/features/scan/schema";
import { normalizeGuildName, recruitStatus, withDefaults } from "./rules";
import { JOIN_FEE_USD, STARTING_CREDIT_USD, type CreateGuildInput } from "./schema";

/**
 * 길드 쓰기(서버 전용). 가입·탈퇴·생성·모집 토글은 요청마다 닉네임+PIN을 검증하고,
 * 여러 스토어를 바꾸는 변경은 하나의 write transaction 으로 처리한다.
 */
export type GuildErrorCode =
  | "not_found"
  | "already_member"
  | "closed"
  | "full"
  | "name_taken"
  | "not_member"
  | "owner_cannot_leave"
  | "forbidden";

const MESSAGES: Record<GuildErrorCode, string> = {
  not_found: "Guild not found.",
  already_member: "You're already in a guild. Leave it first.",
  closed: "This guild isn't recruiting.",
  full: "This guild is full.",
  name_taken: "A guild with that name already exists.",
  not_member: "You're not a member of this guild.",
  owner_cannot_leave: "Guild owners can't leave yet.",
  forbidden: "Only the guild owner can do that.",
};

export class GuildError extends Error {
  constructor(readonly code: GuildErrorCode) {
    super(MESSAGES[code]);
  }
}

/** 탈퇴·모집 토글용. 프로필이 없으면 틀린 PIN과 구분하지 않고 같은 오류를 낸다. */
async function requireProfile(credentials: Credentials, now: Date) {
  const profile = await checkCredentials(credentials, now);
  if (!profile) throw new ProfileError("invalid_credentials");
  return profile;
}

async function readGuilds(tx: Transaction): Promise<Guild[]> {
  const rs = await tx.execute("SELECT data FROM guilds ORDER BY rowid");
  return rs.rows.map((r) => withDefaults(JSON.parse(String(r.data)) as Guild));
}

const saveGuild = (tx: Transaction, guild: Guild) =>
  tx.execute({
    sql: "INSERT INTO guilds (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data",
    args: [guild.id, JSON.stringify(guild)],
  });

const inAnyGuild = (guilds: Guild[], profileId: string) => guilds.some((g) => g.memberIds.includes(profileId));

export async function joinGuild(credentials: Credentials, guildId: string, now: Date = new Date()): Promise<Guild> {
  // 프로필이 없으면 입력한 닉네임+PIN으로 새로 만든다. 있으면 PIN을 검증한다.
  const profile = await ensureProfile(credentials, now);
  return withTransaction(async (tx) => {
    const guilds = await readGuilds(tx);
    const guild = guilds.find((g) => g.id === guildId);
    if (!guild) throw new GuildError("not_found");
    if (inAnyGuild(guilds, profile.id)) throw new GuildError("already_member");
    const status = recruitStatus(guild);
    if (status !== "recruiting") throw new GuildError(status);

    // 지갑이 없는 프로필은 첫 가입 때 시작 크레딧으로 만든다. 가입비는 B의 원장으로 차감한다(잔액 부족이면 402).
    if (!(await txGetOne<Wallet>(tx, "wallets", profile.id))) {
      await txPutOne<Wallet>(tx, "wallets", { userId: profile.id, balance: STARTING_CREDIT_USD });
    }
    await debit(tx, profile.id, guild.joinFee, "guild_fee", guild.id);
    const joined: Guild = { ...guild, memberIds: [...guild.memberIds, profile.id] };
    await saveGuild(tx, joined);
    return joined;
  });
}

export async function leaveGuild(credentials: Credentials, guildId: string, now: Date = new Date()): Promise<Guild> {
  const profile = await requireProfile(credentials, now);
  return withTransaction(async (tx) => {
    const guild = (await readGuilds(tx)).find((g) => g.id === guildId);
    if (!guild) throw new GuildError("not_found");
    if (!guild.memberIds.includes(profile.id)) throw new GuildError("not_member");
    if (guild.ownerId === profile.id) throw new GuildError("owner_cannot_leave");
    const left: Guild = { ...guild, memberIds: guild.memberIds.filter((id) => id !== profile.id) };
    await saveGuild(tx, left);
    return left;
  });
}

export async function createGuild(input: CreateGuildInput, now: Date = new Date()): Promise<Guild> {
  const { nickname, pin, name, region, description, tags, maxMembers, lookingFor } = input;
  // 길드를 만들 때는 프로필이 없으면 닉네임+PIN으로 새로 만든다. 있으면 PIN을 검증한다.
  const profile = await ensureProfile({ nickname, pin }, now);
  return withTransaction(async (tx) => {
    const guilds = await readGuilds(tx);
    if (inAnyGuild(guilds, profile.id)) throw new GuildError("already_member");
    const key = normalizeGuildName(name);
    if (guilds.some((g) => normalizeGuildName(g.name) === key)) throw new GuildError("name_taken");
    const guild: Guild = {
      id: `g-${randomUUID().slice(0, 8)}`,
      name,
      region,
      description,
      tags,
      ownerId: profile.id,
      memberIds: [profile.id],
      joinFee: JOIN_FEE_USD,
      recruiting: true,
      maxMembers,
      lookingFor,
    };
    await saveGuild(tx, guild);
    return guild;
  });
}

export async function setRecruiting(
  credentials: Credentials,
  guildId: string,
  recruiting: boolean,
  now: Date = new Date(),
): Promise<Guild> {
  const profile = await requireProfile(credentials, now);
  return withTransaction(async (tx) => {
    const guild = (await readGuilds(tx)).find((g) => g.id === guildId);
    if (!guild) throw new GuildError("not_found");
    if (guild.ownerId !== profile.id) throw new GuildError("forbidden");
    const updated: Guild = { ...guild, recruiting };
    await saveGuild(tx, updated);
    return updated;
  });
}
