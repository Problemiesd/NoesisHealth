import { canSendAiReply, markAiReplyRead, markAiReplySent } from "@/lib/healthlog/chat";
import { DEFAULT_STATE } from "@/lib/healthlog/defaults";

describe("AI chat controls", () => {
  it("blocks a new AI reply until the cooldown expires if the last reply was unread", () => {
    const sent = markAiReplySent(
      {
        ...DEFAULT_STATE.ai,
        active: true
      },
      new Date("2026-06-10T00:00:00.000Z")
    );
    const result = canSendAiReply(sent, new Date("2026-06-10T00:10:00.000Z"));

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Please wait");
  });

  it("allows AI replies again after marking the reply as read", () => {
    const sent = markAiReplySent(
      {
        ...DEFAULT_STATE.ai,
        active: true
      },
      new Date("2026-06-10T00:00:00.000Z")
    );
    const read = markAiReplyRead(sent, new Date("2026-06-10T00:05:00.000Z"));
    const result = canSendAiReply(read, new Date("2026-06-10T00:10:00.000Z"));

    expect(result.allowed).toBe(true);
  });
});
