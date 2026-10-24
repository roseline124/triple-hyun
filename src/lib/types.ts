export type ContractType = "fixed" | "revenue_share" | "monthly";
export type QuestStatus = "open" | "in_progress" | "done";

export type StatScore = { name: string; score: number };
export type SecondJob = { title: string; reason: string };

/** 능력 검사(/api/scan)의 결과. features/scan 이 생성한다. */
export type ScanResult = {
  archetype: string;
  summary: string;
  stats: StatScore[];
  secondJobs: SecondJob[];
  questTags: string[];
};

export type User = {
  id: string;
  name: string;
  region: string;
  formerJob: string;
  guildId: string | null;
  scan: ScanResult | null;
};

export type Guild = {
  id: string;
  name: string;
  region: string;
  description: string;
  tags: string[];
  ownerId: string;
  memberIds: string[];
  joinFee: number;
};

export type Quest = {
  id: string;
  title: string;
  description: string;
  region: string;
  tags: string[];
  reward: number;
  contract: ContractType;
  status: QuestStatus;
  clientName: string;
  applicantIds: string[];
  assigneeId: string | null;
};

export type WalletTxType = "charge" | "guild_fee" | "quest_reward";
export type WalletTx = {
  id: string;
  userId: string;
  type: WalletTxType;
  amount: number;
  createdAt: string;
};
export type Wallet = { userId: string; balance: number };
