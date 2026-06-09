import { parseQuickLog } from "@/lib/healthlog/parser";

describe("parseQuickLog", () => {
  it("classifies eggs as food and calculates nutrition", () => {
    const log = parseQuickLog("กินไข่ 3 ฟอง", "2026-06-10T02:00:00.000Z");

    expect(log.category).toBe("food");
    expect(log.status).toBe("complete");
    expect(log.details.foodKey).toBe("egg");
    expect(log.details.quantity).toBe(3);
    expect(log.details.calories).toBe(210);
    expect(log.details.proteinG).toBe(18);
  });

  it("marks missing food amount as incomplete", () => {
    const log = parseQuickLog("กินหมูสับ", "2026-06-10T02:00:00.000Z");

    expect(log.category).toBe("food");
    expect(log.status).toBe("incomplete");
    expect(log.clarificationQuestion).toContain("กรัม");
  });

  it("calculates whey correctly", () => {
    const log = parseQuickLog("กิน whey 1 scoop", "2026-06-10T02:00:00.000Z");

    expect(log.category).toBe("food");
    expect(log.status).toBe("complete");
    expect(log.details.foodKey).toBe("whey");
    expect(log.details.calories).toBe(120);
    expect(log.details.proteinG).toBe(24);
  });

  it("calculates sleep duration from a time range", () => {
    const log = parseQuickLog("นอน 04:00-11:00", "2026-06-10T02:00:00.000Z");

    expect(log.category).toBe("sleep");
    expect(log.status).toBe("complete");
    expect(log.details.durationHours).toBe(7);
  });
});
