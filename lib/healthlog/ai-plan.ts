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

export async function readAiCoachDocument(): Promise<string> {
  try {
    const filePath = join(process.cwd(), "AI_COACH.md");
    return await readFile(filePath, "utf8");
  } catch {
    return [
      "# NoesisHealth AI Coach",
      "",
      "Be proactive, direct, and action-first.",
      "When coach mode is active, identify the best next step and say it clearly."
    ].join("\n");
  }
}

export function buildSystemPrompt(
  planDocument: string,
  coachDocument: string,
  state: HealthLogState,
  mode: "chat" | "summary" | "coach"
) {
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
    "Be action-first, not greeting-first.",
    mode === "coach"
      ? "You are in proactive coach mode. Try to move the user toward the goal without waiting to be asked."
      : "You are in chat mode. Still be direct and useful.",
    "If the user asks what to do now, give the single best next action using the plan and current snapshot.",
    "Do not start with generic greetings or onboarding questions when the user is asking for guidance.",
    "Use the snapshot to mention the specific missing target, remaining gap, or next log if relevant.",
    "If the user already has enough context, answer directly and briefly.",
    "Follow this plan strictly:",
    planDocument,
    mode === "coach" ? "Coach behavior rules:" : "Chat behavior rules:",
    coachDocument,
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
    "- For action questions like 'what should I do now', do not greet. Give the next action, then the reason, then one follow-up question only if necessary.",
    mode === "coach"
      ? "- When in coach mode, proactively push the single best next action and do not wait for the user to ask for it."
      : "- Stay responsive to the user's message.",
    "- Summaries are optional and only when the user explicitly asks.",
    "",
    "Return plain text only."
  ].join("\n");
}
