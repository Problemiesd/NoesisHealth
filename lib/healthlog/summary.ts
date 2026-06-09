import { summarizeHealthLogs } from "@/lib/healthlog/rules";
import type { HealthLogState } from "@/lib/healthlog/types";

export function buildDashboardSnapshot(state: HealthLogState, now = new Date()) {
  return summarizeHealthLogs(state, now);
}
