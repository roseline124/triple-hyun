import type { ContractType, QuestStatus } from "@/lib/types";

export const CONTRACT_LABEL: Record<ContractType, string> = {
  fixed: "Fixed price",
  revenue_share: "Revenue share",
  monthly: "Monthly retainer",
};

export const STATUS_LABEL: Record<QuestStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Completed",
};
