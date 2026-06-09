import { DEFAULT_STATE } from "@/lib/healthlog/defaults";
import { parseQuickLog } from "@/lib/healthlog/parser";
import { summarizeHealthLogs } from "@/lib/healthlog/rules";

describe("summarizeHealthLogs", () => {
  it("excludes incomplete food logs from kcal and protein totals", () => {
    const completeEgg = parseQuickLog("กินไข่ 3 ฟอง", "2026-06-10T02:00:00.000Z");
    const incompleteFood = parseQuickLog("กินหมูสับ", "2026-06-10T03:00:00.000Z");
    const state = {
      ...DEFAULT_STATE,
      logs: [completeEgg, incompleteFood]
    };

    const summary = summarizeHealthLogs(state, new Date("2026-06-10T05:00:00.000Z"));

    expect(summary.totalCalories.value).toBe(210);
    expect(summary.totalProteinG.value).toBe(18);
    expect(summary.incompleteLogs).toHaveLength(1);
    expect(summary.nextActionSuggestion?.message).toContain("incomplete");
  });
});
