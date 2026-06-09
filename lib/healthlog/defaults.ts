import type { HealthLogState, PlanSettings } from "@/lib/healthlog/types";

export interface FoodDefault {
  key: string;
  label: string;
  aliases: string[];
  unit: string;
  caloriesPerUnit: number;
  proteinPerUnitG: number;
  carbsPerUnitG?: number;
  fatPerUnitG?: number;
}

export const FOOD_DEFAULTS: FoodDefault[] = [
  {
    key: "egg",
    label: "egg",
    aliases: ["egg", "eggs", "ไข่"],
    unit: "egg",
    caloriesPerUnit: 70,
    proteinPerUnitG: 6
  },
  {
    key: "whey",
    label: "whey",
    aliases: ["whey", "เวย์"],
    unit: "scoop",
    caloriesPerUnit: 120,
    proteinPerUnitG: 24
  },
  {
    key: "casein",
    label: "casein",
    aliases: ["casein", "เคซีน"],
    unit: "scoop",
    caloriesPerUnit: 110,
    proteinPerUnitG: 24
  },
  {
    key: "meal_replacement_bottle",
    label: "meal replacement bottle",
    aliases: ["meal replacement", "meal replacement bottle", "mrb", "มื้อทดแทน"],
    unit: "bottle",
    caloriesPerUnit: 278,
    proteinPerUnitG: 34,
    carbsPerUnitG: 22,
    fatPerUnitG: 6
  },
  {
    key: "lmnt",
    label: "LMNT",
    aliases: ["lmnt"],
    unit: "serving",
    caloriesPerUnit: 0,
    proteinPerUnitG: 0
  }
];

export const DEFAULT_PLAN: PlanSettings = {
  dailyProteinTargetG: 120,
  dailyCalorieTargetKcal: 2200,
  sleepTargetHours: 7.5,
  supplementSchedule: ["Vitamin D", "Magnesium"],
  timezone: "Asia/Bangkok"
};

export const DEFAULT_STATE: HealthLogState = {
  plan: DEFAULT_PLAN,
  logs: []
};
