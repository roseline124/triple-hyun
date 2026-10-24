# 설치한 Claude 스킬

설치 범위는 이 프로젝트의 `.claude/skills/`다. 사용자 전역 Claude 설정을 덮어쓰지 않는다.
외부 스킬은 Skills CLI로 복사 설치하고 `skills-lock.json`에 출처와 해시를 기록한다.
해시/소스 기록은 공급망 안전을 보증하는 감사 결과가 아니다. 업데이트는 행사 중 자동 실행하지 않는다.

| 용도 | 스킬 | 출처 |
| --- | --- | --- |
| 짧은 문제 정의와 MVP 결정 | `hackathon-plan` | 이 프로젝트의 해커톤용 스킬 |
| 사업기획·PPT·대본 통합 | `hackathon-pitch` | 이 프로젝트의 해커톤용 스킬 |
| 최종 시연·제출 준비 점검 | `demo-gate` | 이 프로젝트의 해커톤용 스킬 |
| 웹·모바일 웹 디자인 | `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) |
| React/Next.js 구현 | `vercel-react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) |
| Expo/React Native 구현 | `vercel-react-native-skills` | Vercel agent-skills |
| UI·접근성 검토 | `web-design-guidelines` | Vercel agent-skills |
| Claude API·서버 통합 | `claude-api` | Anthropic skills |
| 브라우저 조작·검증 | `agent-browser` | [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) |
| 네이티브 앱 조작·검증 | `agent-device` | [callstack/agent-device](https://github.com/callstack/agent-device) |
| 원인 중심 디버깅 | `systematic-debugging` | [obra/superpowers](https://github.com/obra/superpowers) |
| 증거 기반 완료 확인 | `verification-before-completion` | Superpowers |
| 협업 문서 작성 | `doc-coauthoring` | Anthropic skills |
| 실제 PowerPoint 제작·수정 | `pptx` | Anthropic skills |
| 실제 Word 문서 제작·수정 | `docx` | Anthropic skills |
| 고객·대안·사업모델 | `agency-business-strategist` | [agency-agents Business Strategist](https://github.com/msitarzewski/agency-agents/blob/main/specialized/business-strategist.md) 어댑터 |
| 제출 문구와 근거 | `agency-proposal-strategist` | [agency-agents Proposal Strategist](https://github.com/msitarzewski/agency-agents/blob/main/sales/sales-proposal-strategist.md) 어댑터 |
| 장별 메시지·발표 흐름 | `agency-visual-storyteller` | [agency-agents Visual Storyteller](https://github.com/msitarzewski/agency-agents/blob/main/design/design-visual-storyteller.md) 어댑터 |

agency-agents의 원문은 스킬 패키지가 아닌 역할 정의다. 선택한 세 원문과 MIT 라이선스를
각 스킬의 `references/upstream.md`, `LICENSE`에 보존하고, 해커톤용 짧은 `SKILL.md`로 연결했다.
네이티브 하위 에이전트를 별도 실행하는 방식은 아니다.
원문의 장기 기획·SNS 캠페인·예시 성과 수치는 해커톤 요구사항이나 팀의 실적으로 취급하지 않는다.

Superpowers 전체와 brainstorming 원본은 설치하지 않았다. 원본의 여러 문서·승인 단계 대신
20분 내 문제·시연·제외 범위를 결정하는 `hackathon-plan`을 사용한다.
`superlite`는 탐색 당시 검색 결과 설치 수가 매우 낮아 기본 의존성으로 채택하지 않았다.
자동 커밋·푸시나 에이전트 다중 실행을 요구하는 전체 오케스트레이션 패키지도 넣지 않았다.

브라우저 검증은 사용자가 예시로 든 browser-use 대신 로컬 `agent-browser`를 기본으로 선택했다.
Browser Use Cloud용 별도 계정·크레딧 없이 동작하는 CLI이며 Playwright로 반복 검증도 가능하다.
스킬 설치와 런타임 설치는 별개다. `tools/pnpm-lock.yaml`은 CLI/Playwright/문서 제작 도구 버전을 고정한다.
모바일은 agent-device CLI만 준비된다. 현재 Mac에 iOS/Android 실행 환경이 없으므로 네이티브 테스트는 미검증이다.

사용 예:

```text
/hackathon-plan 미션 ... 팀 ...
/hackathon-pitch 배포 URL ... 사용자 관찰 ... 제출용 2장 PPTX와 사업기획 DOCX를 만들어줘
/demo-gate https://... 현재 시각 ... 남은 자리 ...
```

제3자 스킬은 요청한 작업에 필요한 경우에만 읽는다. 스킬 내 예시·명령은 사용자 승인과 비밀 관리 규칙을 대체하지 않는다.
