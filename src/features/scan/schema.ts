import { z } from "zod";

export const ScanInputSchema = z.object({
  background: z.string().trim().min(10, "경력이나 하던 일을 10자 이상 적어주세요.").max(2000),
  interests: z.string().trim().max(500).optional(),
});
export type ScanInput = z.infer<typeof ScanInputSchema>;

export const ScanResultSchema = z.object({
  archetype: z.string(),
  summary: z.string(),
  stats: z.array(z.object({ name: z.string(), score: z.number().min(0).max(100) })).min(3).max(6),
  secondJobs: z.array(z.object({ title: z.string(), reason: z.string() })).min(2).max(4),
  questTags: z.array(z.string()).min(2).max(6),
});
