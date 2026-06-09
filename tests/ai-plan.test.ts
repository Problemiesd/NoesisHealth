import { buildSystemPrompt } from "@/lib/healthlog/ai-plan";
import { DEFAULT_STATE } from "@/lib/healthlog/defaults";

describe("AI prompt", () => {
  it("includes conflict handling guidance", () => {
    const prompt = buildSystemPrompt("# plan", DEFAULT_STATE, "chat");

    expect(prompt).toContain("conflicts with the goal");
    expect(prompt).toContain("offer the smallest adjustment");
    expect(prompt).toContain("shorter delay");
  });
});
