import type { Guild, Quest, User, Wallet, WalletTx } from "./types";

export const CURRENT_USER_ID = "u-me";

export const seedUsers = (): User[] => [
  { id: CURRENT_USER_ID, name: "Me", region: "San Francisco, CA", formerJob: "Technical writer", guildId: null, scan: null },
  { id: "u-2", name: "Maya", region: "San Francisco, CA", formerJob: "Customer support engineer", guildId: "g-1", scan: null },
  { id: "u-3", name: "Jordan", region: "Austin, TX", formerJob: "QA analyst", guildId: "g-2", scan: null },
];

export const seedGuilds = (): Guild[] => [
  {
    id: "g-1",
    name: "Docs Alchemists",
    region: "San Francisco, CA",
    description: "Technical writers and localization pros who ship developer content with AI.",
    tags: ["Technical writing", "Developer content", "AI review"],
    ownerId: "u-2",
    memberIds: ["u-2"],
    joinFee: 5,
  },
  {
    id: "g-2",
    name: "Austin Test Guardians",
    region: "Austin, TX",
    description: "QA and support engineers automating test suites and ticket triage for small teams.",
    tags: ["QA automation", "Support ops", "Startups"],
    ownerId: "u-3",
    memberIds: ["u-3"],
    joinFee: 3,
  },
];

export const seedQuests = (): Quest[] => [
  {
    id: "q-1",
    title: "Rewrite the API docs for a dev-tools startup",
    description: "Turn 40 endpoint references into clear, example-driven docs and review the AI-assisted draft.",
    region: "San Francisco, CA",
    tags: ["Technical writing", "Developer content"],
    reward: 300,
    contract: "fixed",
    status: "open",
    clientName: "Lumen Labs",
    applicantIds: [],
    assigneeId: null,
  },
  {
    id: "q-2",
    title: "Automate monthly support-ticket triage",
    description: "Build a workflow that sorts and summarizes the monthly support backlog from a CSV export.",
    region: "Austin, TX",
    tags: ["QA automation", "Support ops"],
    reward: 1200,
    contract: "monthly",
    status: "open",
    clientName: "Northwind Apps",
    applicantIds: [],
    assigneeId: null,
  },
  {
    id: "q-3",
    title: "Build a changelog bot for indie developers",
    description: "Turn merged pull requests into release notes. Revenue comes from sponsorships and is shared.",
    region: "Remote (US)",
    tags: ["Open source", "Community"],
    reward: 0,
    contract: "revenue_share",
    status: "open",
    clientName: "Indie Dev Collective",
    applicantIds: [],
    assigneeId: null,
  },
];

export const seedWallets = (): Wallet[] => [
  { userId: CURRENT_USER_ID, balance: 100 },
  { userId: "u-2", balance: 0 },
  { userId: "u-3", balance: 0 },
];

export const seedTxs = (): WalletTx[] => [];
