import { z } from "zod";
import { CredentialsSchema } from "@/features/scan/schema";

/** 모든 길드가 같은 가입비(USD). 약 5만원. */
export const JOIN_FEE_USD = 35;
/** 지갑이 없는 프로필이 처음 가입할 때 받는 더미 크레딧(USD). */
export const STARTING_CREDIT_USD = 100;
export const DEFAULT_MAX_MEMBERS = 20;

const collapse = (s: string) => s.trim().replace(/\s+/g, " ");

/** 1~3단어, 30자 이하. */
const labelSchema = z
  .string()
  .transform(collapse)
  .pipe(
    z
      .string()
      .min(1, "Tags can't be empty.")
      .max(30, "Keep each tag under 30 characters.")
      .refine((s) => s.split(" ").length <= 3, "Keep each tag to 3 words or fewer."),
  );

/** 대소문자 무시하고 중복을 제거한다. 먼저 나온 표기를 남긴다. */
const dedupe = (labels: string[]) => {
  const seen = new Set<string>();
  return labels.filter((l) => {
    const key = l.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const GuildInputSchema = z.object({
  name: z
    .string()
    .transform(collapse)
    .pipe(z.string().regex(/^[A-Za-z0-9 &'-]{3,40}$/, "Name must be 3-40 characters: letters, numbers, spaces, &, ' or -.")),
  region: z
    .string()
    .transform(collapse)
    .pipe(z.string().min(2, "Enter a region, like Austin, TX or Remote.").max(60, "Keep the region under 60 characters.")),
  description: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(20, "Describe the guild in at least 20 characters.")
        .max(280, "Keep the description under 280 characters."),
    ),
  tags: z.array(labelSchema).min(1, "Add at least 1 tag.").max(5, "Add up to 5 tags.").transform(dedupe),
  maxMembers: z
    .number()
    .int("Max members must be a whole number.")
    .min(2, "A guild needs room for at least 2 members.")
    .max(50, "Max members can't be more than 50.")
    .default(DEFAULT_MAX_MEMBERS),
  lookingFor: z.array(labelSchema).max(3, "List up to 3 roles.").default([]).transform(dedupe),
});

export const CreateGuildSchema = CredentialsSchema.and(GuildInputSchema);
export type CreateGuildInput = z.infer<typeof CreateGuildSchema>;

export const SetRecruitingSchema = CredentialsSchema.and(z.object({ recruiting: z.boolean() }));
