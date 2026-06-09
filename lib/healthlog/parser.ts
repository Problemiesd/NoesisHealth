import { FOOD_DEFAULTS } from "@/lib/healthlog/defaults";
import { createIsoNow, parseClockRangeMinutes } from "@/lib/healthlog/time";
import { makeTrace } from "@/lib/healthlog/trace";
import type { LogEntry, LogCategory } from "@/lib/healthlog/types";

type FoodHit = (typeof FOOD_DEFAULTS)[number];

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function detectFood(text: string): FoodHit | null {
  return (
    FOOD_DEFAULTS.find((food) => food.aliases.some((alias) => text.includes(alias))) ??
    null
  );
}

function extractQuantity(text: string, unitHints: string[]): number | null {
  const units = unitHints.join("|");
  const forwardPattern = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${units})`, "i");
  const reversePattern = new RegExp(`(?:${units})\\s*(\\d+(?:\\.\\d+)?)`, "i");
  const match = text.match(forwardPattern) ?? text.match(reversePattern);
  if (!match) {
    return null;
  }
  return Number(match[1] ?? match[2]);
}

function hasFoodCue(text: string): boolean {
  return /(กิน|eat|food|meal|มื้อ|ของกิน)/i.test(text);
}

function createIncompleteFoodEntry(
  rawText: string,
  foodLabel: string,
  loggedAt: string,
  reason: string
): LogEntry {
  const question =
    foodLabel === "egg"
      ? "ไข่กี่ฟอง?"
      : foodLabel === "whey"
        ? "เวย์กี่สกู๊ป?"
        : foodLabel === "casein"
          ? "เคซีนกี่สกู๊ป?"
          : foodLabel === "meal replacement bottle"
            ? "มื้อทดแทนกี่ขวด?"
            : `${foodLabel} ประมาณเท่าไร?`;

  return {
    id: crypto.randomUUID(),
    rawText,
    category: "food",
    status: "incomplete",
    createdAt: createIsoNow(),
    loggedAt,
    clarificationQuestion: question,
    trace: makeTrace(null, "kcal", [`food:${foodLabel}`], ["amount"], [
      "Do not estimate calories or protein without a clear quantity."
    ]),
    details: {
      foodKey: foodLabel,
      reason
    }
  };
}

function buildFoodEntry(
  rawText: string,
  food: FoodHit,
  quantity: number,
  loggedAt: string
): LogEntry {
  const calories = quantity * food.caloriesPerUnit;
  const protein = quantity * food.proteinPerUnitG;

  return {
    id: crypto.randomUUID(),
    rawText,
    category: "food",
    status: "complete",
    createdAt: createIsoNow(),
    loggedAt,
    trace: makeTrace(calories, "kcal", [`food:${food.key}`, `quantity:${quantity}`], [], [
      "Used the local deterministic food table."
    ]),
    details: {
      foodKey: food.key,
      foodLabel: food.label,
      quantity,
      unit: food.unit,
      calories,
      proteinG: protein,
      carbsG: food.carbsPerUnitG ? quantity * food.carbsPerUnitG : undefined,
      fatG: food.fatPerUnitG ? quantity * food.fatPerUnitG : undefined
    }
  };
}

function parseSleepEntry(rawText: string, loggedAt: string): LogEntry | null {
  const text = normalizeText(rawText);
  const durationMinutes = parseClockRangeMinutes(text);
  const directDuration = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h|ชั่วโมง|ชม\.?)/i);
  const sleepCue = /(^|\s)(sleep|นอน)(\s|$)/i.test(text);

  if (durationMinutes == null && !directDuration && !sleepCue) {
    return null;
  }

  if (durationMinutes != null) {
    const hours = Number((durationMinutes / 60).toFixed(2));
    return {
      id: crypto.randomUUID(),
      rawText,
      category: "sleep",
      status: "complete",
      createdAt: createIsoNow(),
      loggedAt,
      trace: makeTrace(hours, "hours", ["sleep:start-end"], [], [
        "Derived duration from the logged sleep window only."
      ]),
      details: {
        durationMinutes,
        durationHours: hours
      }
    };
  }

  if (directDuration) {
    const hours = Number(directDuration[1]);
    return {
      id: crypto.randomUUID(),
      rawText,
      category: "sleep",
      status: "complete",
      createdAt: createIsoNow(),
      loggedAt,
      trace: makeTrace(hours, "hours", ["sleep:direct-duration"], [], [
        "Used the explicitly stated sleep duration."
      ]),
      details: {
        durationHours: hours
      }
    };
  }

  return {
    id: crypto.randomUUID(),
    rawText,
    category: "sleep",
    status: "incomplete",
    createdAt: createIsoNow(),
    loggedAt,
    clarificationQuestion: "นอนกี่ชั่วโมง หรือเริ่ม-ตื่นกี่โมง?",
    trace: makeTrace(null, "hours", ["sleep"], ["duration"], [
      "Do not infer sleep duration without a duration or time range."
    ]),
    details: {}
  };
}

function parseWeightEntry(rawText: string, loggedAt: string): LogEntry | null {
  const text = normalizeText(rawText);
  if (!/(น้ำหนัก|weight)/i.test(text)) {
    return null;
  }

  const match = text.match(/(?:น้ำหนัก|weight)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:kg|kgs|กก\.?|กิโล)?/i);
  if (!match) {
    return {
      id: crypto.randomUUID(),
      rawText,
      category: "weight",
      status: "incomplete",
      createdAt: createIsoNow(),
      loggedAt,
      clarificationQuestion: "น้ำหนักเท่าไร?",
      trace: makeTrace(null, "kg", ["weight"], ["value"], [
        "Do not guess weight."
      ]),
      details: {}
    };
  }

  const kg = Number(match[1]);
  return {
    id: crypto.randomUUID(),
    rawText,
    category: "weight",
    status: "complete",
    createdAt: createIsoNow(),
    loggedAt,
    trace: makeTrace(kg, "kg", ["weight:value"], [], []),
    details: { weightKg: kg }
  };
}

function parseExerciseEntry(rawText: string, loggedAt: string): LogEntry | null {
  const text = normalizeText(rawText);
  const exerciseCue = /(^|\s)(exercise|workout|ออกกำลัง|วิ่ง|เดิน|ปั่น|ยก)(\s|$)/i.test(text);
  if (!exerciseCue) {
    return null;
  }

  const minutesMatch = text.match(
    /([0-9]+(?:\.[0-9]+)?)\s*(?:min|mins|minute|minutes|นาที)/i
  );

  if (!minutesMatch) {
    return {
      id: crypto.randomUUID(),
      rawText,
      category: "exercise",
      status: "incomplete",
      createdAt: createIsoNow(),
      loggedAt,
      clarificationQuestion: "ออกกำลังกายกี่นาที?",
      trace: makeTrace(null, "minutes", ["exercise"], ["duration"], [
        "Do not infer exercise duration."
      ]),
      details: {}
    };
  }

  const minutes = Number(minutesMatch[1]);
  return {
    id: crypto.randomUUID(),
    rawText,
    category: "exercise",
    status: "complete",
    createdAt: createIsoNow(),
    loggedAt,
    trace: makeTrace(minutes, "minutes", ["exercise:duration"], [], []),
    details: { minutes }
  };
}

function parseSupplementEntry(rawText: string, loggedAt: string): LogEntry | null {
  const text = normalizeText(rawText);
  const supplementCue = /(^|\s)(supplement|supps?|vitamin|ยา|วิตามิน|lmnt)(\s|$)/i.test(text);
  if (!supplementCue) {
    return null;
  }

  const name =
    text.includes("lmnt")
      ? "LMNT"
      : text.includes("vitamin")
        ? "Vitamin"
        : text.includes("วิตามิน")
          ? "วิตามิน"
          : text.includes("ยา")
            ? "ยา"
            : "supplement";

  const amountMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:caps?|tabs?|tablets?|scoop|packet|pack|ซอง|เม็ด|แคปซูล|ขวด|servings?)/i);
  const amount = amountMatch ? Number(amountMatch[1]) : 1;

  return {
    id: crypto.randomUUID(),
    rawText,
    category: "supplement",
    status: "complete",
    createdAt: createIsoNow(),
    loggedAt,
    trace: makeTrace(amount, "entry", [`supplement:${name}`], [], [
      "Counted as a supplement log without inferring dosage beyond the visible entry."
    ]),
    details: {
      supplementName: name,
      amount
    }
  };
}

function hasNoteCue(text: string): boolean {
  return /(^|\s)(note|memo|remember|reminder|จด|บันทึก|บันทึกโน้ต|เก็บไว้)(\s|$)|^(note|memo)\s*:/i.test(text);
}

function parseNoteEntry(rawText: string, loggedAt: string): LogEntry {
  return {
    id: crypto.randomUUID(),
    rawText,
    category: "note",
    status: "complete",
    createdAt: createIsoNow(),
    loggedAt,
    trace: makeTrace(rawText, "text", ["note"], [], []),
    details: {}
  };
}

function parseUnknownEntry(rawText: string, loggedAt: string): LogEntry {
  return {
    id: crypto.randomUUID(),
    rawText,
    category: "unknown",
    status: "incomplete",
    createdAt: createIsoNow(),
    loggedAt,
    clarificationQuestion: "ไม่แน่ใจว่าเป็นอาหาร การนอน ออกกำลัง หรืออาหารเสริม?",
    trace: makeTrace(null, "entry", ["raw-text"], ["category"], [
      "No deterministic rule matched this log."
    ]),
    details: {}
  };
}

export function parseQuickLog(rawText: string, loggedAt = createIsoNow()): LogEntry {
  const text = normalizeText(rawText);

  if (hasNoteCue(text)) {
    return parseNoteEntry(rawText, loggedAt);
  }

  const sleep = parseSleepEntry(rawText, loggedAt);
  if (sleep) {
    return sleep;
  }

  const weight = parseWeightEntry(rawText, loggedAt);
  if (weight) {
    return weight;
  }

  const exercise = parseExerciseEntry(rawText, loggedAt);
  if (exercise) {
    return exercise;
  }

  const supplement = parseSupplementEntry(rawText, loggedAt);
  if (supplement) {
    return supplement;
  }

  const food = detectFood(text);
  if (food) {
    const quantity = extractQuantity(text, [food.unit, "ช้อน", "ฟอง", "ขวด", "serving", "scoop"]);
    if (quantity == null) {
      return createIncompleteFoodEntry(rawText, food.label, loggedAt, "missing quantity");
    }
    return buildFoodEntry(rawText, food, quantity, loggedAt);
  }

  if (hasFoodCue(text)) {
    const genericAmount = extractQuantity(text, ["g", "gram", "grams", "กรัม", "ฟอง", "ขวด", "ช้อน", "scoop"]);
    if (genericAmount == null) {
      return {
        id: crypto.randomUUID(),
        rawText,
        category: "food",
        status: "incomplete",
        createdAt: createIsoNow(),
        loggedAt,
        clarificationQuestion: "อาหารนี้ประมาณกี่กรัม หรือกี่หน่วย?",
        trace: makeTrace(null, "kcal", ["food"], ["amount", "food_reference"], [
          "Do not calculate without a clear amount and a known local food reference."
        ]),
        details: {}
      };
    }

    return {
      id: crypto.randomUUID(),
      rawText,
      category: "food",
      status: "incomplete",
      createdAt: createIsoNow(),
      loggedAt,
      clarificationQuestion: "อาหารนี้ยังไม่มีในตารางอ้างอิง ต้องการเพิ่มข้อมูลโภชนาการหรือบันทึกเป็นหมายเหตุ?",
      trace: makeTrace(null, "kcal", ["food"], ["food_reference"], [
        "The amount exists, but the local food table does not contain this item."
      ]),
      details: { quantity: genericAmount }
    };
  }

  if (text.length === 0) {
    return parseUnknownEntry(rawText, loggedAt);
  }

  return parseUnknownEntry(rawText, loggedAt);
}

export function getCategoryLabel(category: LogCategory): string {
  switch (category) {
    case "food":
      return "Food";
    case "sleep":
      return "Sleep";
    case "supplement":
      return "Supplement";
    case "weight":
      return "Weight";
    case "exercise":
      return "Exercise";
    case "note":
      return "Note";
    default:
      return "Unknown";
  }
}
