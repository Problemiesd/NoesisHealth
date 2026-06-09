import { DEFAULT_PLAN } from "@/lib/healthlog/defaults";
import { dateKeyForTimeZone } from "@/lib/healthlog/time";
import type { Advice, DailySummary, HealthLogState, LogEntry } from "@/lib/healthlog/types";

function toDateKey(log: LogEntry, timeZone: string): string {
  return dateKeyForTimeZone(new Date(log.loggedAt), timeZone);
}

export function summarizeHealthLogs(
  state: HealthLogState,
  today = new Date()
): DailySummary {
  const plan = state.plan ?? DEFAULT_PLAN;
  const todayKey = dateKeyForTimeZone(today, plan.timezone);
  const todayLogs = state.logs.filter((log) => toDateKey(log, plan.timezone) === todayKey);
  const completeFoodLogs = todayLogs.filter(
    (log) => log.category === "food" && log.status === "complete"
  );
  const incompleteLogs = todayLogs.filter((log) => log.status === "incomplete");
  const completeSleepLogs = todayLogs.filter(
    (log) => log.category === "sleep" && log.status === "complete"
  );
  const completeSupplementLogs = todayLogs.filter(
    (log) => log.category === "supplement" && log.status === "complete"
  );
  const weightLogs = todayLogs.filter((log) => log.category === "weight" && log.status === "complete");

  const totalCalories = completeFoodLogs.reduce((sum, log) => {
    const value = typeof log.trace.value === "number" ? log.trace.value : 0;
    return sum + value;
  }, 0);
  const totalProtein = completeFoodLogs.reduce((sum, log) => {
    const protein = Number((log.details.proteinG ?? 0) as number);
    return sum + protein;
  }, 0);
  const sleepHours = completeSleepLogs.reduce((sum, log) => {
    const value = typeof log.trace.value === "number" ? log.trace.value : 0;
    return sum + value;
  }, 0);
  const supplementsTaken = completeSupplementLogs.map((log) => String(log.details.supplementName ?? log.rawText));

  const latestWeightLog = weightLogs.at(-1) ?? null;
  const latestWeightKg =
    latestWeightLog && typeof latestWeightLog.trace.value === "number"
      ? latestWeightLog.trace.value
      : null;

  const advice: Advice[] = [];

  if (incompleteLogs.some((log) => log.category === "food")) {
    advice.push({
      message: "Calculation incomplete because one or more food logs still need a quantity or food reference.",
      based_on: incompleteLogs.filter((log) => log.category === "food").map((log) => `log:${log.id}`),
      missing_fields: ["amount", "food_reference"],
      assumptions: [],
      severity: "warning"
    });
  }

  if (plan.dailyProteinTargetG > 0 && totalProtein < plan.dailyProteinTargetG) {
    advice.push({
      message: `Protein is ${plan.dailyProteinTargetG - totalProtein} g below target.`,
      based_on: ["plan.dailyProteinTargetG", ...completeFoodLogs.map((log) => `log:${log.id}`)],
      missing_fields: [],
      assumptions: ["Only complete food logs were counted."],
      severity: "info"
    });
  }

  if (plan.sleepTargetHours > 0 && sleepHours < plan.sleepTargetHours) {
    advice.push({
      message: `Sleep is ${Number((plan.sleepTargetHours - sleepHours).toFixed(2))} hours below target.`,
      based_on: ["plan.sleepTargetHours", ...completeSleepLogs.map((log) => `log:${log.id}`)],
      missing_fields: [],
      assumptions: ["Only logged sleep windows or explicit durations were counted."],
      severity: "warning"
    });
  }

  const loggedSupplementNames = new Set(
    supplementsTaken.map((name) => name.toLowerCase().trim())
  );
  const missingScheduledSupplements = plan.supplementSchedule.filter(
    (item) => !loggedSupplementNames.has(item.toLowerCase().trim())
  );

  if (missingScheduledSupplements.length > 0) {
    advice.push({
      message: `Missing scheduled supplements today: ${missingScheduledSupplements.join(", ")}.`,
      based_on: ["plan.supplementSchedule", ...completeSupplementLogs.map((log) => `log:${log.id}`)],
      missing_fields: [],
      assumptions: ["Schedule names are matched by case-insensitive text only."],
      severity: "info"
    });
  }

  if (advice.length === 0) {
    advice.push({
      message: "No rule-based warning. Continue logging with complete quantities only.",
      based_on: ["plan", ...todayLogs.map((log) => `log:${log.id}`)],
      missing_fields: [],
      assumptions: ["This message only reflects the data currently stored in the app."],
      severity: "info"
    });
  }

  return {
    todayKey,
    totalCalories: {
      value: totalCalories,
      unit: "kcal",
      based_on: completeFoodLogs.map((log) => `log:${log.id}`),
      missing_fields: incompleteLogs.some((log) => log.category === "food") ? ["incomplete_food_logs"] : [],
      assumptions: ["Incomplete food logs are excluded from totals."]
    },
    totalProteinG: {
      value: totalProtein,
      unit: "g",
      based_on: completeFoodLogs.map((log) => `log:${log.id}`),
      missing_fields: incompleteLogs.some((log) => log.category === "food") ? ["incomplete_food_logs"] : [],
      assumptions: ["Only complete food logs are counted."]
    },
    sleepHours: {
      value: Number(sleepHours.toFixed(2)),
      unit: "hours",
      based_on: completeSleepLogs.map((log) => `log:${log.id}`),
      missing_fields: completeSleepLogs.length === 0 ? ["sleep"] : [],
      assumptions: ["Only deterministic sleep entries were counted."]
    },
    supplementsTaken: {
      value: supplementsTaken,
      unit: "entries",
      based_on: completeSupplementLogs.map((log) => `log:${log.id}`),
      missing_fields: [],
      assumptions: ["Logged supplement entries are treated as taken items only."]
    },
    latestWeightKg: {
      value: latestWeightKg,
      unit: "kg",
      based_on: latestWeightLog ? [`log:${latestWeightLog.id}`] : [],
      missing_fields: latestWeightLog ? [] : ["weight"],
      assumptions: ["Latest weight is taken from the most recent complete weight log today."]
    },
    incompleteLogs,
    advice,
    nextActionSuggestion: advice[0] ?? null
  };
}
