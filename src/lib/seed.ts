import type { Guild, Quest, User, Wallet, WalletTx } from "./types";

export const CURRENT_USER_ID = "u-me";

export const seedUsers = (): User[] => [
  { id: CURRENT_USER_ID, name: "나", region: "서울 마포", formerJob: "번역가", guildId: null, scan: null },
  { id: "u-2", name: "민지", region: "서울 마포", formerJob: "콜센터 상담원", guildId: "g-1", scan: null },
  { id: "u-3", name: "준호", region: "부산 해운대", formerJob: "경리", guildId: "g-2", scan: null },
];

export const seedGuilds = (): Guild[] => [
  {
    id: "g-1",
    name: "마포 번역 연금술사",
    region: "서울 마포",
    description: "번역·콘텐츠 현지화 경력자들이 AI와 함께 일하는 길드",
    tags: ["번역", "콘텐츠", "AI 검수"],
    ownerId: "u-2",
    memberIds: ["u-2"],
    joinFee: 5000,
  },
  {
    id: "g-2",
    name: "해운대 숫자 수호대",
    region: "부산 해운대",
    description: "경리·회계 경력자의 소상공인 장부 자동화 길드",
    tags: ["회계", "자동화", "소상공인"],
    ownerId: "u-3",
    memberIds: ["u-3"],
    joinFee: 3000,
  },
];

export const seedQuests = (): Quest[] => [
  {
    id: "q-1",
    title: "동네 카페 메뉴판 영문화",
    description: "메뉴 40개를 자연스러운 영어로 옮기고 검수해 주세요.",
    region: "서울 마포",
    tags: ["번역", "콘텐츠"],
    reward: 30000,
    contract: "fixed",
    status: "open",
    clientName: "마포 로스터스",
    applicantIds: [],
    assigneeId: null,
  },
  {
    id: "q-2",
    title: "소상공인 월 장부 정리 자동화",
    description: "엑셀로 관리하는 매출·매입을 월 단위로 정리하는 흐름을 만들어 주세요.",
    region: "부산 해운대",
    tags: ["회계", "자동화"],
    reward: 120000,
    contract: "monthly",
    status: "open",
    clientName: "해운대 분식",
    applicantIds: [],
    assigneeId: null,
  },
  {
    id: "q-3",
    title: "고양이 탐정: 동네 실종 고양이 수색 지도",
    description: "제보를 모아 수색 지도를 만들어 주세요. 수익은 후원금을 나눕니다.",
    region: "서울 마포",
    tags: ["지도", "커뮤니티"],
    reward: 0,
    contract: "revenue_share",
    status: "open",
    clientName: "연남동 집사 모임",
    applicantIds: [],
    assigneeId: null,
  },
];

export const seedWallets = (): Wallet[] => [
  { userId: CURRENT_USER_ID, balance: 10000 },
  { userId: "u-2", balance: 0 },
  { userId: "u-3", balance: 0 },
];

export const seedTxs = (): WalletTx[] => [];
