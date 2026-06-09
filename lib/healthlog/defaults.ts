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
  targetDate: "2026-06-30",
  dailyUseKcal: 2200,
  dailyProteinTargetG: 120,
  dailyProteinMaxG: 150,
  dailyCalorieTargetKcal: 2200,
  sleepTargetHours: 7.5,
  supplementSchedule: ["Vitamin D", "Magnesium"],
  activities: ["bike", "shadow boxing", "pull up", "push up", "squat"],
  startWeightKg: 75,
  bodyFatPercent: 27,
  age: 32,
  heightCm: 166,
  goal: "ลด fat ให้เยอะที่สุดและ maintain กล้ามเนื้อเท่าที่ทำได้",
  timezone: "Asia/Bangkok"
};

export const DEFAULT_STATE: HealthLogState = {
  plan: DEFAULT_PLAN,
  logs: [],
  messages: [],
  ai: {
    active: false,
    summarizeEnabled: false,
    cooldownMinutes: 30,
    unreadAssistantCount: 0
  }
};
