export type LogCategory =
  | "food"
  | "sleep"
  | "supplement"
  | "weight"
  | "exercise"
  | "note"
  | "unknown";

export type LogStatus = "complete" | "incomplete";

export interface Trace<T> {
  value: T;
  unit: string;
  based_on: string[];
  missing_fields: string[];
  assumptions: string[];
}

export interface FoodTrace extends Trace<number | null> {
  food_key?: string;
  quantity?: number;
  quantity_unit?: string;
  calories_per_unit?: number;
  protein_per_unit_g?: number;
}

export interface LogEntry {
  id: string;
  rawText: string;
  category: LogCategory;
  status: LogStatus;
  createdAt: string;
  loggedAt: string;
  clarificationQuestion?: string;
  trace: Trace<number | string | null | string[]>;
  details: Record<string, unknown>;
}

export interface PlanSettings {
  targetDate: string;
  dailyUseKcal: number;
  dailyProteinTargetG: number;
  dailyProteinMaxG: number;
  dailyCalorieTargetKcal: number;
  sleepTargetHours: number;
  supplementSchedule: string[];
  activities: string[];
  startWeightKg: number;
  bodyFatPercent: number;
  age: number;
  heightCm: number;
  goal: string;
  timezone: string;
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  kind: "chat" | "log" | "clarification" | "summary" | "system";
}

export interface AiControlState {
  active: boolean;
  summarizeEnabled: boolean;
  cooldownMinutes: number;
  lastAssistantAt?: string;
  lastReadAt?: string;
  lastProactiveAt?: string;
  lastUserActionAt?: string;
  unreadAssistantCount: number;
}

export interface HealthLogState {
  plan: PlanSettings;
  logs: LogEntry[];
  messages: ChatMessage[];
  ai: AiControlState;
}

export interface Advice {
  message: string;
  based_on: string[];
  missing_fields: string[];
  assumptions: string[];
  severity: "info" | "warning";
}

export interface DailySummary {
  todayKey: string;
  totalCalories: Trace<number>;
  totalProteinG: Trace<number>;
  sleepHours: Trace<number>;
  supplementsTaken: Trace<string[]>;
  latestWeightKg: Trace<number | null>;
  incompleteLogs: LogEntry[];
  advice: Advice[];
  nextActionSuggestion: Advice | null;
}
