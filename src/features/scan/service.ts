import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ScanResult } from "@/lib/types";
import { ScanResultSchema, type ScanInput } from "./schema";

export const SCAN_MODEL = "claude-sonnet-5-5";

const SYSTEM = `당신은 AI 때문에 직업이 흔들리는 사람의 '마력 탐지기'입니다.
사용자의 경력과 관심사에서 본인이 몰랐던 능력을 찾아 RPG 캐릭터처럼 정리하세요.
- archetype: 현재 직업 클래스 이름(예: "문장 연금술사")
- stats: 3~6개 능력치와 0~100 점수. 입력에 근거 없는 능력은 만들지 않는다.
- secondJobs: 제2의 직업 후보 2~4개와 입력에 근거한 이유
- questTags: 일감 게시판에서 검색할 한국어 태그 2~6개
모든 값은 한국어로, 과장 없이 구체적으로 쓰세요.`;

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
  const userText = `[경력/하던 일]\n${input.background}\n\n[관심사]\n${input.interests || "(없음)"}`;
  try {
    const res = await client.messages.parse({
      model: SCAN_MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: userText }],
      output_config: { effort: "low", format: zodOutputFormat(ScanResultSchema) },
    });
    if (res.stop_reason === "refusal") {
      throw new ScanError("refusal", "모델이 이 입력에 대한 응답을 거절했습니다.");
    }
    if (!res.parsed_output) {
      throw new ScanError("empty_output", "결과를 해석하지 못했습니다. 다시 시도해주세요.");
    }
    return res.parsed_output;
  } catch (e) {
    if (e instanceof ScanError) throw e;
    if (e instanceof Anthropic.APIConnectionTimeoutError) {
      throw new ScanError("timeout", "분석이 너무 오래 걸립니다. 다시 시도해주세요.");
    }
    throw new ScanError("upstream", "AI 호출에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
}
