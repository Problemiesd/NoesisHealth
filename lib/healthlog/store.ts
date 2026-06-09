import { DEFAULT_STATE } from "@/lib/healthlog/defaults";
import { parseQuickLog } from "@/lib/healthlog/parser";
import type { HealthLogState, PlanSettings } from "@/lib/healthlog/types";
import { createIsoNow } from "@/lib/healthlog/time";

const STORAGE_KEY = "noesis-healthlog-state-v2";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readState(): HealthLogState {
  if (!canUseLocalStorage()) {
    return DEFAULT_STATE;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_STATE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<HealthLogState>;
    return {
      plan: { ...DEFAULT_STATE.plan, ...parsed.plan } as PlanSettings,
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      ai: { ...DEFAULT_STATE.ai, ...parsed.ai }
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function writeState(state: HealthLogState): void {
  if (!canUseLocalStorage()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createParsedLog(rawText: string) {
  return parseQuickLog(rawText, createIsoNow());
}
