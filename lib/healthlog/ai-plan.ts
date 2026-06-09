import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { summarizeHealthLogs } from "@/lib/healthlog/rules";
import type { HealthLogState } from "@/lib/healthlog/types";

const FALLBACK_PLAN = `# NoesisHealth AI Plan

Mission: help the user log food, sleep, supplements, weight, exercise, and daily state without inventing data.
`;

export async function readAiPlanDocument(): Promise<string> {
  try {
    const filePath = join(process.cwd(), "AI_PLAN.md");
    return await readFile(filePath, "utf8");
  } catch {
    return FALLBACK_PLAN;
  }
}

export function buildSystemPrompt(planDocument: string, state: HealthLogState, mode: "chat" | "summary") {
  const snapshot = summarizeHealthLogs(state);
  const lightweightSnapshot = {
    todayKey: snapshot.todayKey,
    totalCalories: snapshot.totalCalories.value,
    totalProteinG: snapshot.totalProteinG.value,
    sleepHours: snapshot.sleepHours.value,
    supplementsTaken: snapshot.supplementsTaken.value,
    latestWeightKg: snapshot.latestWeightKg.value,
    incompleteLogs: snapshot.incompleteLogs.map((log) => ({
      category: log.category,
      rawText: log.rawText,
      clarificationQuestion: log.clarificationQuestion ?? null
    }))
  };

  return [
    "You are NoesisHealth's logging assistant.",
    "Answer in Thai unless the user writes clearly in another language.",
    `Mode: ${mode}.`,
    "Follow this plan strictly:",
    planDocument,
    "Current structured plan state:",
    JSON.stringify(
      {
        targetDate: state.plan.targetDate,
        dailyUseKcal: state.plan.dailyUseKcal,
        dailyProteinTargetG: state.plan.dailyProteinTargetG,
        dailyProteinMaxG: state.plan.dailyProteinMaxG,
        startWeightKg: state.plan.startWeightKg,
        bodyFatPercent: state.plan.bodyFatPercent,
        age: state.plan.age,
        heightCm: state.plan.heightCm,
        activities: state.plan.activities,
        goal: state.plan.goal,
        timezone: state.plan.timezone
      },
      null,
      2
    ),
    "Current lightweight app snapshot:",
    JSON.stringify(lightweightSnapshot, null, 2),
    "Rules:",
    "- If required data is missing, ask a clarification question instead of guessing.",
    "- Use deterministic log data when available.",
    "- Do not give medical advice.",
    "- Do not calculate food nutrition without a clear amount.",
    "- For simple logs, prefer confirming the log and asking for missing fields only.",
    "- Summaries are optional and only when the user explicitly asks.",
    "",
    "Return plain text only."
  ].join("\n");
}
