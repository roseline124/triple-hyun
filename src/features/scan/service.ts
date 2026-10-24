import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ScanResult } from "@/lib/types";
import { ScanResultSchema, type ScanInput } from "./schema";

export const SCAN_MODEL = "claude-sonnet-5-5";

const SYSTEM = `You are a hidden-skills scanner for US tech workers whose jobs are being reshaped by AI.
From the user's experience and interests, uncover skills they may not realize they have and present them like an RPG character sheet.
- archetype: a short class name for their current role (e.g. "Documentation Alchemist")
- stats: 3-6 skills, each scored 0-100. Never invent skills the input doesn't support.
- secondJobs: 2-4 second-career options in the US tech market, each with a reason grounded in the input
- questTags: 2-6 English tags for searching the quest board (e.g. "Technical writing", "QA automation")
Write every value in natural American English. Be concrete and avoid hype.`;

export class ScanError extends Error {
  constructor(
    readonly code: "refusal" | "empty_output" | "timeout" | "upstream",
    message: string,
  ) {
    super(message);
  }
}

type MessagesClient = Pick<Anthropic, "messages">;

export function createAnthropicClient(): Anthropic {
  return new Anthropic({ timeout: 60_000, maxRetries: 1 });
}

export async function runScan(input: ScanInput, client: MessagesClient): Promise<ScanResult> {
  const userText = `[Experience]\n${input.background}\n\n[Interests]\n${input.interests || "(none)"}`;
  try {
    const res = await client.messages.parse({
      model: SCAN_MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: userText }],
      output_config: { effort: "low", format: zodOutputFormat(ScanResultSchema) },
    });
    if (res.stop_reason === "refusal") {
      throw new ScanError("refusal", "The model declined to respond to this input.");
    }
    if (!res.parsed_output) {
      throw new ScanError("empty_output", "Couldn't interpret the result. Please try again.");
    }
    return res.parsed_output;
  } catch (e) {
    if (e instanceof ScanError) throw e;
    if (e instanceof Anthropic.APIConnectionTimeoutError) {
      throw new ScanError("timeout", "The scan is taking too long. Please try again.");
    }
    throw new ScanError("upstream", "The AI request failed. Please try again in a moment.");
  }
}
