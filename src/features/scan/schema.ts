import { z } from "zod";

export const NICKNAME_PATTERN = /^[A-Za-z0-9 _-]{2,20}$/;

export const CredentialsSchema = z.object({
  nickname: z
    .string()
    .trim()
    .regex(NICKNAME_PATTERN, "Nickname must be 2-20 characters: letters, numbers, spaces, _ or -."),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits."),
});
export type Credentials = z.infer<typeof CredentialsSchema>;

const contentShape = {
  background: z
    .string()
    .trim()
    .min(20, "Paste at least 20 characters of your résumé or experience.")
    .max(6000, "Keep your résumé text under 6,000 characters."),
  interests: z.string().trim().max(500, "Keep interests under 500 characters.").optional(),
};

export const AnswerSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1, "Answer every question.").max(500, "Keep each answer under 500 characters."),
});
export type Answer = z.infer<typeof AnswerSchema>;

export const QuestionsInputSchema = CredentialsSchema.extend(contentShape);
export type QuestionsInput = z.infer<typeof QuestionsInputSchema>;

export const ScanInputSchema = CredentialsSchema.extend({
  ...contentShape,
  answers: z.array(AnswerSchema).max(4).default([]),
});
export type ScanInput = z.infer<typeof ScanInputSchema>;

export const QuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  kind: z.enum(["single", "text"]),
  options: z.array(z.string()).min(3).max(4).optional(),
});
export type Question = z.infer<typeof QuestionSchema>;

export const QuestionsOutputSchema = z.object({
  questions: z.array(QuestionSchema).min(3).max(4),
});

const secondJobShape = z.object({ title: z.string(), reason: z.string() });

/** 모델이 만드는 형태. `source` 는 서버가 근거 위치를 보고 채운다. */
export const ModelScanSchema = z.object({
  archetype: z.string(),
  summary: z.string(),
  skills: z
    .array(z.object({ name: z.string(), score: z.number().min(0).max(100), evidence: z.string() }))
    .min(3)
    .max(6),
  secondJobs: z.array(secondJobShape).min(2).max(4),
  tags: z.array(z.string()).min(2).max(6),
});

/** 저장·응답에 쓰는 최종 형태. */
export const ScanResultSchema = z.object({
  archetype: z.string(),
  summary: z.string(),
  skills: z
    .array(
      z.object({
        name: z.string(),
        score: z.number().min(0).max(100),
        evidence: z.string().max(300),
        source: z.enum(["resume", "answer"]),
      }),
    )
    .min(3)
    .max(6),
  secondJobs: z.array(secondJobShape).min(2).max(4),
  tags: z.array(z.string()).max(6),
});

export type ScanInputRecord = {
  background: string;
  interests: string;
  answers: Answer[];
};

/** /api/profile/lookup 응답. pinHash 등 내부 필드는 포함하지 않는다. */
export type ProfileView = {
  nickname: string;
  scan: z.infer<typeof ScanResultSchema> | null;
  scanInput: ScanInputRecord | null;
  updatedAt: string;
};
