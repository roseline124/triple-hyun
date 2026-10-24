# worktree (길드 퀘스트) — 프로젝트 개요

주제: "AI로 사라질 직업 1000만 명을 구할 제품" × "채팅창 다음의 인터페이스".
직업을 잃은 IT 실무자가 RPG처럼 전직하고, 길드로 모여 프로젝트(퀘스트)로 수익을 만든다.

## 90초 시연 흐름 (가정)
1. `/scan` 능력 검사: 닉네임+PIN, 이력서 붙여넣기 → AI 적응형 질문 → Claude가 근거 있는 능력·제2의 직업·태그 생성 (실제 호출). 태그가 겹치는 길드·일감을 바로 보여준다
2. `/guilds` 검색 → 길드 가입 (가입비는 더미 크레딧에서 차감)
3. `/quests` 게시판 → 신청 → 작업 완료 시 보상 지급

## 제외 범위
로그인(현재 유저는 seed의 `u-me` 고정), 실제 결제, GPS, 길드 랭킹/연합/경매, 평판 시스템.

## 스택
Next.js(App Router) + TypeScript + pnpm + Tailwind CSS v4(테마는 `docs/design/tailwind-theme.css`). 데이터는 서버 SQLite(libSQL, `src/lib/db.ts`)에 두고 첫 접속 때 seed를 넣는다. 브라우저는 `/api/data/*`(길드·일감·지갑)로 읽는다. 능력 검사 프로필(닉네임+PIN)은 별도 `profiles` 스토어에 두고 `/api/scan*`, `/api/profile/lookup`으로만 접근한다(브라우저 읽기 비허용). 스펙은 `docs/specs/ability-test.md`.
로컬은 `local.db` 파일, Vercel은 Turso(`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`)를 쓴다. 현재 유저가 고정이라 모든 방문자가 같은 데이터를 공유한다.
`ANTHROPIC_API_KEY`는 서버에만 둔다(`.env.local`, 예시는 `.env.example`).
기본 모델 `claude-sonnet-5-5`.

## 디자인
서비스 이름은 `worktree`. 색, 글꼴, 컴포넌트 규칙과 PR 체크리스트는 `docs/design/DESIGN-BIBLE.md`를 따른다. 토큰은 `docs/design/tokens.css`가 기준이고 `globals.css`가 직접 import한다.

## 담당과 파일 소유권
| 담당 | 기능 | 소유 폴더 | 화면 | API |
|---|---|---|---|---|
| A | 1 능력 검사, 2 길드 가입, 4 길드 검색 | `src/features/scan`, `src/features/guild` | `/scan`, `/guilds`, `/guilds/[id]` | `/api/scan` |
| B | 3 결제(더미), 5 일감 게시판, 6 신청/완료 | `src/features/wallet`, `src/features/quest` | `/wallet`, `/quests`, `/quests/[id]` | `/api/me/wallet/charge`, `/api/me/transactions`, `/api/quests/[id]/*` |

공유 파일(`src/lib/*`)은 수정 전 상대에게 알린다. 타입 추가는 가능하면 append-only.

## 계약
- 응답: `{ ok: true, data } | { ok: false, error: { code, message } }` (`src/lib/api.ts`)
- 서비스는 `src/features/*/service.ts` 의 async 함수. 화면은 `useAsync` + `Loadable` 로 4가지 상태를 처리한다.
- 미구현 기능은 화면에 배너로 표시한다. 가짜 성공을 만들지 않는다.
- 여러 store 를 바꾸는 변경(가입비 차감 등)은 `getDb()` 의 단일 transaction 으로 처리한다.
- 교차 의존: 길드 가입(A)은 `wallet` 차감, 작업 완료(B)는 `wallet` 지급을 쓴다.
  서버 전용 `features/wallet/ledger.ts` 의 `debit(tx, userId, amount, type, ref?)` / `credit(...)` 를 쓴다.
  `tx` 는 `withTransaction`(`src/lib/db.ts`)이 넘겨주는 트랜잭션이고, 그 안에서는 `txGetOne`/`txPutOne` 만 쓴다.
  잔액 부족은 `ApiFailure("insufficient_funds", …, 402)` 를 throw 하고 route 는 `failFrom` 으로 응답한다.

## 구현 현황
- [x] 뼈대, 공유 타입, seed, SQLite(libSQL) 읽기 서비스, 화면 틀
- [x] 능력 검사(A): 닉네임+PIN 프로필, 적응형 질문, 근거 검증, 태그 매칭, `/scan/lookup` — 실제 Claude 호출은 아직 미검증(단위 테스트는 mock). 고정 유저 `u-me`(지갑·길드)와는 의도적으로 분리
- [x] 태그 큐레이션(A): 결과 화면에서 나와 맞는 태그 추천·추가·제거·저장, 길드·일감 추천 즉시 갱신 — `POST /api/profile/tags`, 스펙 4.1절
- [ ] 길드 검색 필터 / 가입 (A)
- [x] 시연 데이터 초기화 `POST /api/admin/reset`(헤더 `x-reset-token` = env `RESET_TOKEN`, 없으면 항상 401). seed store만 되돌리고 `profiles`는 유지
- [x] 헬스체크 `GET /api/health`(DB `SELECT 1`, 실패 시 503 `unavailable`)
- [x] 더미 충전, debit/credit, 거래 내역 (B) — `POST /api/me/wallet/charge`, `GET /api/me/transactions`
- [x] 퀘스트 검색 / 신청 / 완료 (B) — 검색은 클라이언트 필터, `POST /api/quests/:id/apply`(신청 즉시 배정), `POST /api/quests/:id/complete`(보상은 담당자 지갑에 바로 지급)

## 명령
`pnpm dev` · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build` · `pnpm check`(전부)
