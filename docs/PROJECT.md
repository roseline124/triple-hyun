# 길드 퀘스트 — 프로젝트 개요

주제: "AI로 사라질 직업 1000만 명을 구할 제품" × "채팅창 다음의 인터페이스".
직업을 잃은 IT 실무자가 RPG처럼 전직하고, 길드로 모여 프로젝트(퀘스트)로 수익을 만든다.

## 90초 시연 흐름 (가정)
1. `/scan` 능력 검사: 경력 입력 → Claude가 능력치·제2의 직업·추천 태그 생성 (실제 호출)
2. `/guilds` 검색 → 길드 가입 (가입비는 더미 크레딧에서 차감)
3. `/quests` 게시판 → 신청 → 작업 완료 시 보상 지급

## 제외 범위
로그인(현재 유저는 seed의 `u-me` 고정), 실제 결제, GPS, 길드 랭킹/연합/경매, 평판 시스템.

## 스택
Next.js(App Router) + TypeScript + pnpm. 데이터는 서버 SQLite(libSQL, `src/lib/db.ts`)에 두고 첫 접속 때 seed를 넣는다. 브라우저는 `/api/data/*`, `/api/me/scan`으로 읽고 쓴다.
로컬은 `local.db` 파일, Vercel은 Turso(`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`)를 쓴다. 현재 유저가 고정이라 모든 방문자가 같은 데이터를 공유한다.
`ANTHROPIC_API_KEY`는 서버에만 둔다(`.env.local`, 예시는 `.env.example`).
기본 모델 `claude-sonnet-5-5`.

## 담당과 파일 소유권
| 담당 | 기능 | 소유 폴더 | 화면 | API |
|---|---|---|---|---|
| A | 1 능력 검사, 2 길드 가입, 4 길드 검색 | `src/features/scan`, `src/features/guild` | `/scan`, `/guilds`, `/guilds/[id]` | `/api/scan` |
| B | 3 결제(더미), 5 일감 게시판, 6 신청/완료 | `src/features/wallet`, `src/features/quest` | `/wallet`, `/quests`, `/quests/[id]` | 없음 (`/api/data/*` 읽기 공용) |

공유 파일(`src/lib/*`)은 수정 전 상대에게 알린다. 타입 추가는 가능하면 append-only.

## 계약
- 응답: `{ ok: true, data } | { ok: false, error: { code, message } }` (`src/lib/api.ts`)
- 서비스는 `src/features/*/service.ts` 의 async 함수. 화면은 `useAsync` + `Loadable` 로 4가지 상태를 처리한다.
- 미구현 기능은 화면에 배너로 표시한다. 가짜 성공을 만들지 않는다.
- 여러 store 를 바꾸는 변경(가입비 차감 등)은 `getDb()` 의 단일 transaction 으로 처리한다.
- 교차 의존: 길드 가입(A)은 `wallet` 차감, 작업 완료(B)는 `wallet` 지급을 쓴다.
  `features/wallet/service.ts` 의 `debit(userId, amount, type)` / `credit(...)` 시그니처를 B가 먼저 정해 A에게 알린다.

## 구현 현황
- [x] 뼈대, 공유 타입, seed, SQLite(libSQL) 읽기 서비스, 화면 틀
- [x] `/api/scan` + 폼(입력·로딩·오류·성공) — 실제 Claude 호출 코드는 단위 테스트(mock)만 검증됨
- [ ] 길드 검색 필터 / 가입 (A)
- [ ] 더미 충전, debit/credit, 거래 내역 (B)
- [ ] 퀘스트 검색 / 신청 / 완료 (B)

## 명령
`pnpm dev` · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build` · `pnpm check`(전부)
