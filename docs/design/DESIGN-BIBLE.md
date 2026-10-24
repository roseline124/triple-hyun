# worktree 디자인 바이블

두 명이 따로 화면을 만들어도 한 제품처럼 보이게 하는 규칙이다.
화면에 보이는 문구(UX writing)는 영어, 이 문서의 설명은 한국어다.

| 파일 | 역할 |
|---|---|
| `docs/design/DESIGN-BIBLE.md` | 이 문서. 원칙, 규칙, 컴포넌트, 체크리스트 |
| `docs/design/assets/worktree-icon.svg` | 로고(원본 그대로). 색 팔레트의 출처 |
| `docs/design/assets/worktree-mark-on-dark.svg` | 어두운 면 위에서 쓰는 로고 마크(타일 없음) |
| `docs/design/tokens.css` | 토큰의 기준 파일(CSS 변수) |
| `docs/design/tailwind-theme.css` | 같은 토큰의 Tailwind v4 `@theme` 버전. 두 파일은 항상 같이 고친다 |
| `docs/design/reference/guild-detail.html` | 기준 화면. 모호하면 이 화면과 똑같이 만든다 |
| `docs/design/concepts/` | 컨셉 탐색 기록(v1~v4). 구조는 `v4/1-canopy`를 따르고, 색은 로고 기준으로 다시 정했다 |

## 0. 한 줄 규칙

1. 색, 글꼴, 반경, 간격은 토큰만 쓴다. 코드에 새 hex 값이나 `[13px]` 같은 임의값을 쓰지 않는다.
2. 필요한 값이 토큰에 없으면 화면에서 만들지 말고, 토큰 추가 PR을 먼저 올린다(10절).
3. 애매하면 `reference/guild-detail.html`을 그대로 따라 한다.

## 1. 로고와 컨셉: 깔끔 + 따뜻 + 신뢰

서비스 이름 `worktree`는 "일자리가 열리는 나무"이고, IT 종사자에게는 `git worktree`라는 말장난으로도 읽힌다.

### 로고가 말하는 것
로고(`assets/worktree-icon.svg`)는 한 사람의 경력이 여러 갈래의 일로 뻗는 나무다. 로고의 색과 모양이 그대로 제품의 색 의미가 된다.

| 로고 요소 | 색 | 제품에서의 의미 |
|---|---|---|
| 배경 타일 | 브라운 `#140C09` | 구조, 글자, 화면의 주인공(hero) 면 |
| 줄기와 가지 | 크림 `#FFF4E8` | 어두운 면 위의 글자, 바탕 |
| 뿌리(가로선) | 샌드 `#E8C49A` | 길드, 함께 버티는 기반 |
| 열매 두 개 | 샌드 `#E8C49A` | 찾아낸 그 밖의 일 |
| 맨 위 열매 | 오렌지 `#FF6A2B` | **지금 고른 다음 일.** 한 화면에서 시선을 모으는 단 하나 |

| 느낌 | 이 제품에서 만드는 방법 |
|---|---|
| 깔끔 | 크림·흰색 바탕, 그림자 없음, 글자는 브라운 한 색, 글꼴은 Noto Sans 계열 하나 |
| 따뜻 | 샌드와 오렌지 계열의 따뜻한 면, 알약·아치·잎 모양, 사람(멤버 캡슐)을 숫자보다 먼저 보여줌 |
| 신뢰 | 돈과 기록을 숨기지 않음(정산 속도, 완료 수, 평점이 항상 보임), 대비 기준 준수, 구체적인 오류 문구 |

길드 요소는 장식이 아니라 정보로만 쓴다: 등급(Seedling, Sapling, Oak), 멤버 캡슐, 퀘스트 완료 점(dot).
방패, 문장, 중세풍 장식은 쓰지 않는다.

### 로고 사용 규칙
- **파일:** 앱 아이콘, 파비콘, 밝은 면(크림·흰색·샌드) 위의 헤더 로고는 `worktree-icon.svg`를 그대로 쓴다. 어두운 브라운 면 위에서는 타일이 배경에 묻히므로 `worktree-mark-on-dark.svg`(타일 없는 마크)를 쓴다.
- **원본은 고치지 않는다.** 색을 바꾸거나, 늘리거나, 회전하거나, 윤곽선·그림자를 붙이지 않는다. 마크를 새로 그려야 하면 먼저 로고 담당과 상의한다.
- **크기:** 헤더에서는 32px 정사각형. 24px보다 작게 쓰지 않는다(파비콘은 예외이고, 16px 가독성은 아직 확인하지 않았다).
- **여백:** 아이콘 폭의 25% 이상 비운다.
- **워드마크:** 마크 옆에 `worktree`(소문자)를 Noto Sans Display 700, 자간 `-0.03em`으로 쓴다. 밝은 면에서는 `brown-950`, 어두운 면에서는 `cream-100`. 아이콘과 워드마크 사이는 8px.
- **접근성:** 워드마크 글자가 이름을 전달하므로 옆의 아이콘 `<img>`에는 `alt=""`를 쓴다. 아이콘만 단독으로 쓰면 `alt="worktree"`.
- `worktree-icon.svg`의 `<title>`은 한국어(`워크트리 Worktree`)다. 화면 문구는 영어 규칙이므로 `<img>`로 불러 쓰고, SVG를 인라인으로 넣을 때는 `<title>`을 `worktree`로 바꾼다.

## 2. 디자인 원칙

1. **화면마다 말하는 면은 하나다.** 가장 큰 브라운 타일(hero)이 그 화면의 주인공이다. 나머지는 조용한 보조 타일이다.
2. **오렌지는 아껴 쓴다.** 로고에서 오렌지 열매가 하나뿐인 것처럼, 한 화면에서 오렌지는 **행동 하나(주요 버튼) + 표식 하나(작은 점이나 열매)** 까지만 쓴다. 오렌지 면(큰 타일)은 쓰지 않는다.
3. **색은 의미를 가진다.**
   - 브라운: 구조, 글자, hero
   - 샌드: 길드와 기반(멤버, 보상)
   - 샌드 100·오렌지 100: 조용한 보조 정보(평점, 속도)
   - 오렌지: 다음에 할 일
   - 초록·빨강: 성공과 오류 상태에만 쓴다(기능 색)
4. **모양도 의미를 가진다.** 잎 모양은 보상과 평점에만, 캡슐은 사람에만, 아치는 한 화면에 한 번만 쓴다.
5. **그림자와 그라디언트를 쓰지 않는다.** 깊이는 색 면과 2px 브라운 윤곽선으로 만든다.
6. **숫자는 증거다.** 통계는 "무엇을 세었는지" 한 줄 설명과 같이 보여준다. 근거 없는 숫자나 비교를 만들지 않는다.

## 3. 색 토큰

로고에서 온 색은 **LOGO** 표시. 나머지는 로고 색에서 밝기만 바꾼 파생색이거나 기능 색이다.

| 토큰(Tailwind 클래스) | 값 | 용도 |
|---|---|---|
| `brown-950` **LOGO** | `#140C09` | 글자, 윤곽선, hero 타일, 기본 버튼 |
| `brown-800` | `#2B1D17` | 기본 버튼 hover, 보조 어두운 타일 |
| `cream-50` | `#FFFAF3` | 페이지 바탕 |
| `cream-100` **LOGO** | `#FFF4E8` | 어두운 면 위의 글자, 부드러운 면 |
| `sand-100` | `#F6E6D0` | 조용한 보조 타일 |
| `sand-300` **LOGO** | `#E8C49A` | 멤버 타일, 보상 배지, 지갑 표시 |
| `orange-500` **LOGO** | `#FF6A2B` | 다음 일. 주요 버튼, 표식 점. **위의 글자는 brown-950만** |
| `orange-400` | `#FF8450` | 오렌지 버튼 hover |
| `orange-100` | `#FFE1D1` | 부드러운 강조 타일 |
| `white` | `#FFFFFF` | 카드·목록 바탕 |
| `muted` | `#634D40` | 보조 글자 |
| `line` | `#EBDCC8` | 장식용 구분선. 의미를 담지 않는다 |
| `skeleton` | `#EFE3D2` | 로딩 자리 표시 |
| `success` / `success-soft` | `#1F6B3A` / `#E0F0E3` | 성공 상태(기능 색) |
| `danger` / `danger-soft` | `#B42318` / `#FDE7E4` | 오류 상태(기능 색) |
| `on-dark-muted` | `#D9C6B4` | 브라운 바탕 위 보조 글자 |

코드에서는 의미 토큰(`--color-text`, `--color-primary`, `--color-accent` 등)을 우선 쓰고, 색 이름 토큰(`--wt-sand-300`)은 타일 배경처럼 색 자체가 의미일 때 쓴다.

### 글자와 바탕 조합표 (WCAG AA 4.5:1, 직접 계산)

| 글자 | 바탕 | 대비 | 허용 |
|---|---|---|---|
| brown-950 | cream-50 / white / cream-100 | 18.6 / 19.3 / 17.8 | O |
| brown-950 | sand-100 / sand-300 / orange-100 | 15.8 / 11.8 / 15.6 | O |
| brown-950 | orange-500 / orange-400 | 6.8 / 8.0 | O |
| muted | cream-50 / white / sand-100 | 7.6 / 7.9 / 6.4 | O |
| muted | sand-300 / orange-100 | 4.8 / 6.4 | O |
| **muted** | **orange-500** | **2.8** | **금지** |
| **white** | **orange-500** | **2.9** | **금지. 오렌지 위에서는 brown-950만** |
| **orange-500 (글자)** | **cream-50** | **2.8** | **금지. 오렌지를 글자색으로 쓰지 않는다** |
| cream-100 | brown-950 / brown-800 | 17.8 / 15.0 | O |
| on-dark-muted | brown-950 / brown-800 | 11.7 / 9.8 | O |
| success | white / success-soft | 6.5 / 5.5 | O |
| danger | white / danger-soft / cream-50 | 6.6 / 5.5 / 6.3 | O |

- 글자 대비는 4.5:1 이상, 큰 글자(24px 이상, 또는 굵은 19px 이상)와 의미 있는 그래픽·입력창 테두리는 3:1 이상.
- 샌드·크림·오렌지 100 면은 장식 바탕이다(크림 위 샌드 300은 1.6:1이라 경계로 읽히지 않는다). 의미를 담는 경계와 입력창 테두리는 2px `brown-950` 윤곽선으로 만든다. `line`은 경계로 쓰지 않는다.
- 색만으로 상태를 구분하지 않는다. 오류와 성공에는 제목 글자와 윤곽선을, 평점에는 숫자를 같이 둔다.
- 오렌지(다음 일)와 `danger`(오류)는 가까운 색상이므로, 오류 면은 항상 `danger-soft` 바탕 + 빨강 제목 + 2px 윤곽선으로 오렌지와 구분한다.

## 4. 타이포그래피

| 역할 | 글꼴 | 굵기 | 크기 | 비고 |
|---|---|---|---|---|
| 표시(hero 이름, 큰 숫자) | Noto Sans Display | 800 | `text-display` 3rem | 자간 `tracking-display` -0.02em |
| 제목 h1/h2/h3 | Noto Sans Display | 700~800 | 2rem / 1.5rem / 1.1875rem | 줄 높이 1.1~1.3 |
| 본문 | Noto Sans | 400~500 | `text-body` 1.0625rem | 줄 높이 1.55, 한 줄 최대 65자 |
| 보조 | Noto Sans | 400~600 | `text-small` 0.9375rem | |
| 캡션 | Noto Sans | 400 | `text-caption` 0.8125rem | 이보다 작은 글자는 쓰지 않는다 |

- 금액과 숫자는 `tabular-nums`로 정렬한다. 금액에는 Display 700을 쓴다.
- 문장형 대문자 라벨(전부 대문자)과 글자 사이를 벌린 라벨을 쓰지 않는다. 문장 첫 글자만 대문자(sentence case).
- 제목의 한 단어만 색이나 이탤릭으로 강조하지 않는다.
- 사용자 대상은 미국 IT 종사자라 영어 글꼴만 불러온다. 한국어 화면이 생기면 `Noto Sans KR`을 추가하고 바이블을 갱신한다.

### Next.js에서 불러오기 (적용 시 참고)
```ts
// src/app/layout.tsx
import { Noto_Sans, Noto_Sans_Display } from "next/font/google";

const body = Noto_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body-loaded", display: "swap" });
const display = Noto_Sans_Display({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-display-loaded", display: "swap" });
```
`next/font`는 빌드 때 글꼴을 내려받아 같은 도메인에서 제공한다. 적용할 때 `--font-body`, `--font-display` 값에 위 변수를 연결한다.

## 5. 레이아웃과 모양

- **페이지:** 최대 폭 `72rem`, 좌우 여백 1.5rem, 바탕 `cream-50`.
- **간격:** 4px 배수(`space-1`~`space-16`). 벤토 타일 사이 간격은 16px(`gap-4`).
- **그리드:** 12열 벤토. 데스크톱(`md` 768px 이상)에서 타일이 열을 나눠 갖고, 그 미만에서는 한 열로 쌓인다.
  - hero는 7열 2행, 보조 타일은 5열 또는 4열을 쓴다. 화면 순서는 DOM 순서와 같게 둔다(CSS로 순서를 바꾸지 않는다).
- **반경(모양이 의미):**

| 토큰 | 값 | 어디에 |
|---|---|---|
| `rounded-input` | 14px | 입력창, 선택 상자 |
| `rounded-tile` | 28px | 보조 타일, 목록 카드, 상태 카드 |
| `rounded-hero` | 40px | hero 타일, 큰 흰색 목록 컨테이너 |
| `rounded-pill` | 999px | 버튼, 칩, 지갑 표시, 캡슐 |
| `rounded-leaf` | `999px 6px 999px 6px` | **보상 배지와 평점 잎에만** |
| `rounded-tl-arch` | 160px (한 모서리) | **한 화면에 타일 하나, 한 모서리만** |

- **타일 구성:** 한 화면에서 같은 색 타일을 나란히 두지 않는다. 어두운 타일(`brown-950`, `brown-800`)은 한 화면에 두 개까지, 서로 대각선 위치에 둔다. 윤곽선 타일(흰색 + 2px 브라운)은 한 화면에 하나가 적당하다.
- **그림자 없음, 그라디언트 없음.** 예외는 평점 잎의 부분 채움(소수 평점 표시)뿐이고 이것도 두 단색의 경계선이다.

## 6. 컴포넌트

Tailwind 클래스 예시는 그대로 복사해 쓸 수 있다(바이블의 예시 클래스는 모두 컴파일해서 확인했다). `reference/guild-detail.html`은 Tailwind 없이 `tokens.css` 변수만으로 만든 기준 화면이라, 모양을 비교할 때 보는 그림이다.

### 스타일을 쓰는 방법 (Tailwind v4)
- 새 컴포넌트는 Tailwind 클래스로 쓴다. 색, 반경, 글자 크기는 테마에 있는 이름만 생성된다(`bg-blue-500`, `rounded-lg` 같은 기본값은 만들어지지 않는다. 테스트가 확인한다).
- 전역 CSS는 `src/app/globals.css`의 `@layer base`(요소) 또는 `@layer components`(공통 클래스)에만 추가한다. **레이어 밖에 쓴 CSS는 모든 유틸리티 클래스를 이긴다.**
- Tailwind의 preflight가 `h1`~`h3`, `p`, `ul`의 기본 모양을 지우므로 `globals.css`의 base 레이어가 토큰 값으로 복원한다. 새 요소의 기본 모양이 필요하면 base 레이어에 추가한다.
- Tailwind는 `src/`만 스캔한다. `docs/`나 `tests/`에만 쓴 클래스는 앱 CSS에 생기지 않는다.
- 동적으로 조립한 클래스 이름(`` `bg-${color}` ``)은 생성되지 않는다. 전체 이름을 코드에 그대로 적는다.
- 유틸리티는 소스에서 실제로 쓰인 것만 CSS에 들어간다. 브라우저 콘솔에서 클래스를 붙여 시험하면 동작하지 않는 것이 정상이다.

### 6.1 버튼
한 영역에 주요 버튼은 하나만 둔다. 문구는 동사로 시작하고 결과를 말한다: "Join the guild", "Apply", "Try again". "Submit", "OK", "Click here"는 쓰지 않는다.

| 종류 | 언제 | 클래스 |
|---|---|---|
| Accent (오렌지) | 어두운 hero 타일 위 그 화면의 주요 행동. 화면에 하나 | `bg-orange-500 text-brown-950 hover:bg-orange-400` |
| Primary (브라운) | 밝은 면 위 주요 행동 | `bg-brown-950 text-cream-100 hover:bg-brown-800` |
| Outline | 목록 안 반복 행동(Apply) | `border-2 border-brown-950 text-brown-950 hover:bg-sand-300` |

```html
<button class="rounded-pill bg-orange-500 px-6 py-3 font-bold text-brown-950 hover:bg-orange-400 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-cream-100 disabled:cursor-not-allowed disabled:opacity-55">Join the guild</button>
<button class="rounded-pill bg-brown-950 px-6 py-3 font-bold text-cream-100 hover:bg-brown-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brown-950 disabled:cursor-not-allowed disabled:opacity-55">Join the guild</button>
<button class="rounded-pill border-2 border-brown-950 px-6 py-2 font-bold text-brown-950 hover:bg-sand-300 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brown-950">Apply</button>
```
- 터치 영역은 높이 44px 이상. 비활성 버튼은 이유를 근처 텍스트로 알려준다.
- 요청 중에는 버튼을 비활성화하고 문구를 진행형으로 바꾼다("Joining..."). 같은 동작의 이름은 흐름 전체에서 같게 쓴다(버튼 "Join the guild" → 완료 문구 "You joined the guild").
- 한 화면에 오렌지 버튼이 둘이 되면 둘 중 하나를 Primary나 Outline으로 내린다(2절 규칙).

### 6.2 타일
```html
<section class="rounded-hero bg-brown-950 p-8 text-cream-100"> ... </section>
<section class="rounded-tile bg-sand-100 p-6"> ... </section>
<section class="rounded-tile bg-orange-100 p-6"> ... </section>
<section class="rounded-tile border-2 border-brown-950 bg-white p-6"> ... </section>
<section class="rounded-tl-arch rounded-tr-tile rounded-br-tile rounded-bl-tile bg-sand-300 py-10 pr-6 pl-12"> ... </section>
```
- 타일 제목은 `text-body font-bold`. 타일 하나에는 메시지 하나만 담는다.
- 아치 타일은 큰 모서리가 글자를 자르지 않도록 왼쪽 여백을 넉넉히 둔다(위 예시처럼 `pl-12`).
- hero 타일 오른쪽 위에는 로고 마크(`worktree-mark-on-dark.svg`)를 크게 깔 수 있다. 오렌지 열매가 이 화면의 "표식 하나"가 된다.

### 6.3 보상 배지와 평점 잎
```html
<span class="rounded-leaf bg-sand-300 px-6 py-2 font-display font-bold tabular-nums text-brown-950">$3,200</span>
```
- 보상 배지는 샌드(오렌지를 쓰지 않는다). 평점은 잎 5개를 `brown-950`으로 채우고, 소수 부분은 두 색(`brown-950` / `sand-300`)의 경계로 표시한다. 항상 숫자("4.8 out of 5")와 `role="img"` + `aria-label`을 같이 둔다.

### 6.4 멤버 캡슐
- 캡슐 46×74px, `rounded-pill`, 이니셜은 아래쪽 정렬, 온라인 표시는 위쪽 `brown-950` 점(흰 테두리 2.5px).
- 샌드 타일 위에서 캡슐 색은 cream-100, white, orange-100, sand-100을 돌려 쓰고, 나머지 인원은 `brown-950` 캡슐에 "+20"처럼 쓴다.
- 장식용이면 `aria-hidden="true"`로 숨기고, 같은 정보를 글로 옆에 쓴다("24 members, 2 online now").

### 6.5 등급
- 이름은 **Seedling → Sapling → Oak**. 기준 문구는 한 줄씩("Finish your first quest", "Finish 10 quests", "Finish 25 and lead one").
- 등급 점은 12px → 22px → 34px로 커진다. 첫 점은 `brown-950` 채움, 둘째와 셋째는 `sand-300` 채움 + 브라운 윤곽선(2px, 3px).
- 기준 숫자(10, 25)는 현재 샘플이다. 제품 정책이 정해지면 문구만 바꾼다.

### 6.6 퀘스트 목록 행
- 구성: 제목(`text-h3 font-bold`) / 조건 한 줄 / 보상 배지 / Apply 버튼. 조건은 가운뎃점으로 이어 쓰지 말고 항목 사이 간격으로 나눈다(`flex gap-x-4`).
- 조건은 항상 같은 순서: 근무 형태, 기간, 필요 인원("Remote", "About 2 weeks", "2 people needed").
- 모바일에서는 버튼이 제목 아래 줄로 내려간다.

### 6.7 완료 점(dot matrix)
- 퀘스트 한 건당 점 하나, 19열. 점 수는 실제 값과 같아야 한다. `brown-800` 타일 위에서 점은 `cream-100`, **가장 최근 한 건만 `orange-500`**(로고의 오렌지 열매).
- 설명 문장("One dot per quest. The orange one is the latest.")과 `aria-label`을 같이 둔다.

### 6.8 내비게이션과 지갑
- 현재 페이지는 `brown-950` 채움 알약 + `aria-current="page"`. 나머지는 글자만, hover에 `sand-100`.
- 지갑은 `sand-300` 알약("$1,240 credits"), `aria-label="Wallet balance"`.

## 7. 상태 (비동기 화면은 전부 구현한다)

| 상태 | 규칙 | 예시 문구 |
|---|---|---|
| Loading | 스피너 대신 레이아웃 모양의 `skeleton` 자리. 제목과 필터는 그대로 둔다. `role="status"` + `aria-busy` | (글 없음) |
| Empty | 무슨 상태인지 한 줄 + 다음 행동 버튼 하나 | "No open quests yet" / "This guild hasn't posted a quest. Join to get a note when the first one opens." |
| Error | `danger-soft` 면 + 2px `danger` 윤곽선. 제목은 무엇이 실패했는지, 본문은 무엇을 하면 되는지. 사과하지 않는다. `role="alert"` + 다시 시도 버튼 | "Couldn't load quests" / "The server didn't respond. Check your connection and try again." |
| Success | `success-soft` 면 + 2px `success` 윤곽선. 직전 행동과 같은 동사로 결과를 알린다. `role="status"` | "You joined the guild" |
| Disabled | 불투명도 55% + `cursor-not-allowed` + 이유 안내 | "Add credits to join" |

AI처럼 오래 걸리는 요청은 진행 상태와 취소 또는 시간 초과를 같이 설계한다.

## 8. 접근성 (모든 PR에서 확인)

- 키보드 포커스는 3px `brown-950` 윤곽선 + 3px 간격. 어두운 면 위에서는 `cream-100` 윤곽선. `outline: none`으로 지우지 않는다.
- 모든 인터랙티브 요소는 Tab으로 닿고, 포커스 순서와 화면 순서가 같다.
- 아이콘만 있는 버튼과 장식이 아닌 그래픽에는 `aria-label`. 장식은 `aria-hidden`.
- 움직임은 쓰지 않는 것이 기본이다. 쓰게 되면 150ms 안의 전환만 허용하고 `prefers-reduced-motion`에서 끈다.
- 390px 폭에서 가로 스크롤이 없고, 주요 행동이 화면 안에서 눌린다.

## 9. UX writing

- 대상은 미국 IT 종사자. 자연스러운 미국식 영어, 짧고 구체적으로, 문장 첫 글자만 대문자.
- 통화는 `$1,240`, 날짜는 `Oct 21, 2026`(`en-US`). `<html lang="en">`을 유지한다.
- 능동태와 동사 버튼. 시스템 용어 대신 사용자 용어("Skill scan", "Quest board").
- 오류는 무엇이 안 됐고 무엇을 하면 되는지. 모호한 "Something went wrong"과 사과를 쓰지 않는다.
- 게임 용어(XP, level up, loot)를 쓰지 않는다. 길드 어휘는 guild, quest, member, rank만 쓴다.
- 샘플 데이터에는 "Design preview with sample data" 안내를 둔다. 가짜 고객 후기나 근거 없는 통계를 만들지 않는다.

## 10. 두 사람이 같이 일하는 규칙

- **담당:** `docs/PROJECT.md`의 표를 따른다. A(scan, guild)와 B(wallet, quest)는 각자 폴더와 화면을 소유한다.
- **공통 파일은 상대에게 알린다.** `docs/design/tokens.css`, `docs/design/tailwind-theme.css`, 공통 컴포넌트(`src/components/ui/`를 만들게 되면 그 폴더), 로고 파일은 수정 전에 알린다.
- **토큰 추가 절차:**
  1. 기존 토큰으로 안 되는 이유를 PR 설명에 쓴다(화면 캡처 포함).
  2. `tokens.css`와 `tailwind-theme.css`를 같이 고친다.
  3. 새 색은 3절의 글자·바탕 대비를 계산해 표에 추가한다.
  4. 다른 사람 승인 후 머지한다.
- **같은 화면을 둘이 건드리지 않는다.** 겹치면 한 명이 소유하고 다른 사람은 PR 코멘트로 제안한다.
- 라이브러리 추가(Tailwind 포함)는 이유, 대안, 설치 비용을 먼저 적고 승인받는다.

### PR 체크리스트 (복사해서 쓴다)

```md
## 디자인 체크리스트
- [ ] 색, 글꼴, 반경, 간격이 토큰만 쓴다(새 hex, 임의값 없음)
- [ ] 오렌지 위 글자는 brown-950이다 / 오렌지는 화면당 행동 하나 + 표식 하나까지다
- [ ] 새 글자·바탕 조합은 4.5:1 이상으로 계산했다
- [ ] 로딩, 빈 상태, 오류, 성공 상태가 화면에 있다
- [ ] 키보드로 끝까지 이동되고 포커스 윤곽선이 보인다
- [ ] 1280px, 768px, 390px 캡처를 첨부했고 390px에서 가로 스크롤이 없다
- [ ] 화면 문구가 영어 sentence case이고 버튼이 동사로 시작한다
- [ ] 그림자, 그라디언트, 아치(한 화면 1개), 잎 모양(보상·평점만) 규칙을 지켰다
- [ ] 로고 원본을 고치지 않았다
- [ ] 동작 변경에 대한 테스트를 추가했고 typecheck, lint, test, build를 실행했다
```

## 11. 앱에 적용하는 순서

토큰, 로고, 기준 화면은 이미 있고, 앱에는 1~5번까지 적용했다. 나머지는 작은 작업으로 나눠서 진행한다.

1. [x] 브랜드 이름을 `Guild Quest`에서 `worktree`로 바꿨다(`layout.tsx`의 title, 헤더 로고, 메타데이터). `package.json`의 패키지 이름(`guild-quest`)은 아직 그대로다.
2. [x] 로고를 앱에 넣었다. 앱이 서빙하는 복사본은 `public/worktree-icon.svg`(파비콘과 헤더)이고, `docs/design/assets/worktree-icon.svg` 원본과 바이트가 같은지 `tests/brand.test.tsx`가 확인한다. 로고를 바꿀 때는 두 파일을 같이 바꾼다.
3. [x] 글꼴을 `next/font`로 불러온다(4절). 빌드 때 구글에서 내려받으므로 네트워크가 필요하다.
4. [x] `src/app/globals.css`가 `docs/design/tokens.css`를 직접 import하고, 기존 색 값은 모두 토큰으로 바꿨다. raw hex가 없는지 테스트가 확인한다.
5. [x] Tailwind v4를 설치했다(`tailwindcss`, `@tailwindcss/postcss`, devDependency 2개, 버전 4.3.3). `postcss.config.mjs`와 `globals.css`의 import로 연결했고, preflight로 달라진 기본 모양은 base 레이어에서 토큰 값으로 복원했다. 설치 전후 7개 페이지를 1280px, 390px에서 비교해 확인했다.
6. [ ] 공통 컴포넌트(Button, Tile, RewardBadge, QuestRow)를 먼저 만들고 두 사람이 같이 쓴다.
7. [ ] 화면을 하나씩 벤토 구조로 옮긴다. 화면마다 3개 폭(1280, 768, 390) 캡처를 남긴다. 지금 화면에는 바이블과 어긋난 내용이 남아 있다(가운뎃점으로 이은 메타 문자열, 시드 데이터의 "Docs Alchemists" 같은 번역투 이름 등).

## 12. 이 문서에서 검증한 것과 못 한 것

- 검증: 색 조합 대비율을 계산했고, 기준 화면을 1280, 768, 390px에서 눈으로 확인했으며, 글꼴과 로고 이미지가 실제로 로드되는지 확인했다. `tailwind-theme.css`와 6절의 클래스 예시는 레포 밖 임시 폴더에서 Tailwind v4로 컴파일해 확인했다. `worktree-icon.svg`는 원본과 바이트 단위로 같다.
- 못 한 것: 파비콘 16px에서의 가독성, 스크린 리더 실제 동작, 실기기 확인, 오프라인에서의 글꼴 대체 모양.
