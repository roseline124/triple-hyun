# 길드 모집·생성·가입 스펙

담당: A. 상태: 구현 완료(2026-10-24). 가입비 $35 차감·시작 크레딧 $100으로 확정. 구현 후 변경: 상세 화면 버튼은 입력한 닉네임이 멤버/owner인지에 따라 달라진다(`memberRole`).
UI는 `docs/design/DESIGN-BIBLE.md`를 따르고 화면 문구는 영어다. 사용자 식별은 `docs/specs/ability-test.md` 3절(닉네임 + 4자리 PIN)을 그대로 쓴다.

## 1. 목적
능력 검사 결과로 길드를 찾은 사람이 (1) 모집 중인 길드를 고르고 가입하거나, (2) 맞는 길드가 없으면 직접 만들게 한다.
90초 시연의 두 번째 장면이다.

## 2. 확정된 결정
| 항목 | 결정 |
|---|---|
| 사용자 | 닉네임 + PIN 프로필. 길드 소속은 프로필 id(정규화 닉네임)에 귀속한다. `u-me`는 쓰지 않는다 |
| 소속 수 | **프로필당 길드 1개**. 다른 길드로 옮기려면 먼저 탈퇴한다 |
| 가입비 | **가입 시 $35 차감**(약 5만원, 모든 길드 동일 상수 `JOIN_FEE_USD`). 더미 크레딧에서 빼며 환불은 없다. 길드 생성은 무료이고 생성자는 가입비를 내지 않는다 |
| 모집 | 길드 필드로만: `recruiting`, `maxMembers`, `lookingFor`. 신청·승인 흐름은 없다 |
| 생성 | 누구나(오픈채팅방 방식). 이름·지역·설명·태그 입력(가입비는 입력하지 않음). 생성자가 owner이자 첫 멤버 |
| 선행 조건 | **생성·가입**은 프로필이 없으면 입력한 닉네임+PIN으로 새로 만든다(있으면 PIN 검증). 탈퇴·모집 토글은 기존 프로필이 필요하다(멤버·owner일 때만 가능하므로) |

가입비는 PRD의 "여러 길드에 무분별하게 가입하는 것을 막는 장치"다. "1개만 소속"과 환불 없음이 함께 그 역할을 한다.
탈퇴해도 환불하지 않으므로 길드를 옮길 때마다 $35가 든다(시연에서 이 점을 말할 수 있다).

### 지갑 (프로필 귀속, B의 `wallet`과 계약 필요)
- `wallets`의 키 `userId`에 프로필 id를 쓴다. 지갑이 없는 프로필은 첫 가입 시점에 **시작 크레딧 $100**으로 지갑을 만든다(더미, `STARTING_CREDIT_USD`).
- 가입 transaction 안에서 잔액 확인 → 차감 → `WalletTx { type: "guild_fee", amount: -35 }` 기록 → `memberIds` 추가를 한꺼번에 한다. 하나라도 실패하면 아무것도 바뀌지 않는다.
- 가입비는 B의 `features/wallet/ledger.ts` `debit(tx, userId, amount, "guild_fee", guildId)`로 차감하고, 지갑 생성(시작 크레딧)만 A가 한다. 트랜잭션은 `lib/db.ts`의 `withTransaction`을 공유한다.

## 3. 데이터
### `Guild` 타입 확장 (`src/lib/types.ts`, 공유 파일 → B에게 알림, 추가만)
```ts
type Guild = {
  // 기존: id, name, region, description, tags, ownerId, memberIds, joinFee (새 길드는 항상 35, seed도 35로 통일)
  recruiting: boolean;     // 모집 중 여부. owner가 토글
  maxMembers: number;      // 2~50, 기본 20
  lookingFor: string[];    // 찾는 역할 0~3개, 각 1~3단어(≤ 30자), 영어
};
```
- `memberIds`에는 프로필 id(정규화 닉네임)가 들어간다. seed 길드의 `u-2`, `u-3`은 그대로 둔다.
- seed(`src/lib/seed.ts`)에 `recruiting: true`, `maxMembers`, `lookingFor`를 채운다. 기존 DB 행은 `INSERT OR IGNORE`라 갱신되지 않으므로
  읽을 때 기본값(`recruiting: true`, `maxMembers: 20`, `lookingFor: []`)을 채우는 `withDefaults`를 `service.ts`에 둔다.
- 길드 id: `g-` + 8자 랜덤(`crypto.randomUUID().slice(0, 8)`).
- 길드 이름 유일성: 정규화(trim, 공백 축소, 소문자) 일치를 중복으로 본다.
- "모집 마감"은 `recruiting === false` 또는 `memberIds.length >= maxMembers`다. 화면 상태는 `isOpen(guild)` 순수 함수 하나로 계산한다.

## 4. 규칙
### 입력 검증 (`features/guild/schema.ts`, zod)
| 필드 | 규칙 |
|---|---|
| name | 3~40자, 영문·숫자·공백·`&`·`'`·`-` |
| region | 2~60자 자유 텍스트(예: "Austin, TX" 또는 "Remote") |
| description | 20~280자 |
| tags | 1~5개, 각 1~3단어(≤ 30자). 서버가 공백 축소·중복 제거. 능력 검사 태그와 겹쳐야 추천되므로 입력창 아래에 기존 길드·일감 태그를 칩으로 제안한다 |
| maxMembers | 정수 2~50 |
| lookingFor | 0~3개, tags와 같은 형식 |

### 가입 (`join`)
순서: 입력 검증 → 프로필 확인·생성(`ensureProfile`: 없으면 새로 만들고, 있으면 PIN 검증) → 단일 transaction 안에서
1. 길드 존재(`not_found`)
2. 이미 어떤 길드의 멤버인가(`already_member`, 같은 길드든 다른 길드든)
3. `recruiting === false`면 `closed`, 정원이 찼으면 `full`
4. 잔액이 가입비보다 적으면 B의 `debit`이 `insufficient_funds`(402)로 거절한다
5. 지갑 차감 + 거래 기록 + `memberIds`에 프로필 id 추가

2~5는 transaction 안에서 읽고 쓴다. 마지막 한 자리를 두 사람이 동시에 가입해도 정원을 넘지 않아야 한다.

### 탈퇴 (`leave`)
자격 확인 → 멤버가 아니면 `not_member` → owner면 `owner_cannot_leave`("Guild owners can't leave yet.") → `memberIds`에서 제거.
소유권 이전·길드 삭제는 제외 범위라서 owner는 탈퇴할 수 없다.

### 생성 (`create`)
자격 확인 → transaction 안에서 이미 소속이면 `already_member`, 이름이 중복이면 `name_taken` → 길드를 만들고
`ownerId`와 `memberIds[0]`을 프로필 id로 둔다. `recruiting: true`로 시작한다.

### 모집 토글 (`setRecruiting`)
자격 확인 → owner가 아니면 `forbidden` → `recruiting` 변경. 정원·역할 수정은 제외 범위.

## 5. API
모든 응답은 `{ ok, data | error }`. 읽기는 기존 `/api/data/guilds`를 쓴다. 요청마다 `{ nickname, pin }`을 본문에 포함한다.
| 경로 | 본문 | 성공 응답 |
|---|---|---|
| `POST /api/guilds` | credentials + 3절 입력 | 201 `Guild` |
| `POST /api/guilds/[id]/join` | credentials | `Guild` |
| `POST /api/guilds/[id]/leave` | credentials | `Guild` |
| `POST /api/guilds/[id]/recruiting` | credentials + `{ recruiting: boolean }` | `Guild` |

오류 코드: `invalid_input`(400), `invalid_credentials`(401, "Nickname or PIN doesn't match."), `locked`(429),
`not_found`(404), `already_member`(409, "You're already in a guild. Leave it first."), `insufficient_funds`(402, B의 원장 문구 "You don't have enough credits. Add credits and try again."), `closed`(409, "This guild isn't recruiting."),
`full`(409, "This guild is full."), `name_taken`(409, "A guild with that name already exists."), `not_member`(409),
`owner_cannot_leave`(409), `forbidden`(403), `internal`(500).

- 클라이언트는 `memberIds`를 직접 쓰지 않는다. 쓰기는 모두 서버가 검증한다.
- `memberIds`가 `/api/data/guilds`로 공개되므로 멤버 닉네임이 노출된다. UI는 인원 수만 보여주고, 닉네임은 화면에 렌더링하지 않는다.
  단, API 응답에는 남는다는 점을 12절에 적는다.

## 6. 화면 (UX writing은 영어)
1. **목록** (`/guilds`): 검색 입력 "Search by region or tag", 토글 "Recruiting only", 태그 칩 필터.
   카드: 이름, 지역, `3 / 20 members`, 배지(`Recruiting` / `Full` / `Closed`), `Looking for: <역할>`, 가입비 "Join fee $35".
   상단 버튼 "Create a guild". 빈 결과: "No guilds match. Clear filters or create one."
   필터는 순수 함수 `filterGuilds(guilds, { query, recruitingOnly, tag })`로 계산한다(대소문자 무시, 정확 일치 태그).
2. **상세** (`/guilds/[id]`): 길드 정보 + 가입 패널. 닉네임·PIN 입력과 버튼 "Join guild for $35". 잔액은 미리 조회하지 않고, 부족하면 오류 문구로 알린다. 모집 마감이면 버튼 비활성화 + 이유 문구.
   성공하면 "You joined <name>." 상태 타일 + "Find quests" 링크(`/quests`). 소속된 사람은 "Leave guild"를 보게 되는데, 이를 위해 같은 패널에서 자격을 다시 입력받는다.
   owner는 같은 패널에서 "Close recruiting" / "Reopen recruiting"을 쓴다.
3. **생성** (`/guilds/new`): 3절 입력 폼, 닉네임·PIN, 버튼 "Create guild". 성공하면 `/guilds/[id]`로 이동.
   안내: "Use the nickname and PIN from your scan. No profile yet? Start a scan." (`/scan` 링크)
4. 로딩 "Joining…" / "Creating…", `aria-live="polite"`. 오류는 `role="alert"` + 필드 연결(`aria-describedby`), 입력 유지.
5. 모든 필드에 `<label>`, 배지는 색만이 아니라 텍스트로 구분, 390px에서 1열, 키보드로 전부 조작 가능.
6. 능력 검사 결과의 "Guilds that fit" 카드는 `/guilds/[id]`로 이어진다(변경 없음).

## 7. 파일
| 파일 | 변경 |
|---|---|
| `src/lib/types.ts` | `Guild`에 3개 필드 추가(공유 → 알림) |
| `src/lib/seed.ts` | seed 길드에 모집 필드 추가(공유 → 알림) |
| `src/features/guild/schema.ts` (신규) | 입력 스키마 |
| `src/features/guild/rules.ts` (신규) | `isOpen`, `filterGuilds`, `normalizeGuildName`, `withDefaults` 순수 함수 |
| `src/features/guild/server.ts` (신규, 서버 전용) | `createGuild`, `joinGuild`, `leaveGuild`, `setRecruiting` (transaction) |
| `src/features/guild/service.ts` | 읽기에 `withDefaults` 적용, 클라이언트용 쓰기 호출 |
| `src/app/api/guilds/route.ts`, `[id]/join`, `[id]/leave`, `[id]/recruiting` (신규) | 5절 |
| `src/app/guilds/page.tsx`, `[id]/page.tsx`, `new/page.tsx`(신규) | 6절 UI |

## 8. 선행 조건
`features/scan/profile.ts`(`checkCredentials`, `profiles` 스토어)는 main에 병합되어 있다(2026-10-24 확인). 이 스펙은 `ability-test.md` 12절의 "길드는 `u-me` 유지" 결정을 대체하며, 해당 절은 함께 고쳤다.

## 9. 제외 범위
가입 신청·승인, 강퇴, 소유권 이전, 길드 수정·삭제, owner 탈퇴, 정원·역할 수정, 가입비 환불, 길드별 가입비 설정, 충전 UI(B), 초대 링크, 길드 정렬·평판, 지역 거리 검색, 알림.

## 10. 테스트
- 스키마: name(2/3/40/41자, 허용 문자), description(19/20/280/281자), tags(0/1/5/6개, 4단어), maxMembers(1/2/50/51).
- `rules.ts`: `isOpen`(모집 중·정원 직전·정원 도달·`recruiting: false`), `filterGuilds`(지역·태그·대소문자, 모집 중만, 조건 없음, 결과 없음), 이름 정규화, `withDefaults`.
- `server.ts`(실제 libSQL 메모리/파일 DB):
  가입 성공(잔액 $100 → $65, `guild_fee` 거래 1건)·잔액 부족이면 `insufficient_funds`이고 멤버·잔액 불변·`already_member`(같은 길드/다른 길드)·`closed`·`full`·`not_found`, **정원 1자리에 동시 가입 2건이면 1건만 성공**,
  탈퇴 성공·`not_member`·`owner_cannot_leave`, 탈퇴 후 다른 길드 가입 가능,
  생성 성공(owner = 첫 멤버)·`name_taken`(대소문자·공백 차이 포함)·소속 중 생성 `already_member`,
  모집 토글 owner 성공·비owner `forbidden`, 프로필 없음·틀린 PIN·잠금 중이면 어떤 쓰기도 일어나지 않음.
- 라우트: invalid_input, 상태 코드 매핑(401/403/404/409/429), 응답에 `pinHash`·`pinSalt` 없음.
- 컴포넌트: 목록 필터·빈 결과·배지, 가입 패널 성공·오류(입력 유지)·마감 시 비활성화, 생성 폼 검증 오류와 성공 이동.
- 수동: 스캔 → 길드 가입 → 새로고침 후 같은 PIN으로 탈퇴, 길드 생성 → 다른 프로필로 가입, 390px, 키보드 조작.
- 실행: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`

## 11. 작업 분해 (15~30분 단위)
1. `ability-test` 병합 반영 + `Guild` 타입·seed 확장
2. `schema.ts` + `rules.ts` + 테스트
3. `server.ts` `joinGuild`/`leaveGuild` + 동시성 테스트
4. `server.ts` `createGuild`/`setRecruiting` + 테스트
5. API 라우트 4개 + 테스트
6. `/guilds` 목록(검색·필터·배지) + 컴포넌트 테스트
7. `/guilds/[id]` 가입·탈퇴·모집 토글 패널
8. `/guilds/new` 생성 폼
9. 수동 검증(390px, 키보드), 문구 다듬기, `PROJECT.md` 구현 현황 갱신

## 12. 위험과 열린 질문
- **가입비와 VC 6번**: 일자리를 잃은 사람에게 $35를 받는 것이 미션과 충돌해 보인다. 시작 크레딧 $100과 "첫 퀘스트 보상으로 회수"로 답하되, 첫 길드 할인 등은 팀 결정(PRD 결정 목록 가입비 구조)이 남아 있다.
- **B와의 계약**: 지갑 키가 프로필 id로 바뀌고 시작 크레딧을 A가 만든다. B에게 먼저 알린다(`CURRENT_USER_ID`를 쓰는 `getMyWallet`도 프로필 기준으로 바뀌어야 한다).
- **owner 고착**: owner가 탈퇴·길드 삭제를 못 해서 잘못 만든 길드가 남는다. 데모 DB는 리셋 가능하지만 공개 전에 해결해야 한다.
- **닉네임 노출**: `memberIds`가 읽기 API로 공개된다. 공개 전에 멤버 목록을 서버에서 가공하거나 별도 id를 도입한다.
- **저품질·빈 길드**(VC 15번): 이번에는 `recruiting`/정원/`Full` 표시만 있다. 활동 기반 정렬·숨김은 일감 완료 데이터가 생긴 뒤.
- **프로필 자동 생성**: 생성·가입이 프로필을 만들어서 스캔 없이도 쓸 수 있다. 대신 오타 닉네임이면 새 프로필이 생기고, 나중에 스캔할 때 같은 닉네임+PIN을 써야 이어진다. 가입·생성이 실패해도 프로필은 남는다.
- 기존 DB 행은 새 필드가 없다 → `withDefaults`로 대응하고 테스트로 고정한다.
