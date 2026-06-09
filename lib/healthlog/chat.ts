import type { AiControlState, ChatMessage, HealthLogState } from "@/lib/healthlog/types";

export function createChatMessage(
  role: ChatMessage["role"],
  content: string,
  kind: ChatMessage["kind"],
  createdAt = new Date().toISOString()
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt,
    kind
  };
}

export function isOpenAiChatEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_OPENAI_CHAT === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_AI_ANALYSIS === "true" ||
    process.env.ENABLE_OPENAI_CHAT === "true" ||
    process.env.ENABLE_AI_ANALYSIS === "true"
  );
}

export function canSendAiReply(
  ai: AiControlState,
  now = new Date()
): { allowed: boolean; reason?: string } {
  if (!ai.active) {
    return { allowed: false, reason: "AI chat is inactive." };
  }

  const lastAssistantAt = ai.lastAssistantAt ? new Date(ai.lastAssistantAt).getTime() : null;
  const lastReadAt = ai.lastReadAt ? new Date(ai.lastReadAt).getTime() : null;
  if (!lastAssistantAt) {
    return { allowed: true };
  }

  const unreadSinceLastAssistant = !lastReadAt || lastReadAt < lastAssistantAt;
  if (!unreadSinceLastAssistant) {
    return { allowed: true };
  }

  const cooldownMs = ai.cooldownMinutes * 60 * 1000;
  const nextAllowedAt = lastAssistantAt + cooldownMs;
  if (now.getTime() < nextAllowedAt) {
    return {
      allowed: false,
      reason: `Please wait until ${new Date(nextAllowedAt).toISOString()} or mark the last AI reply as read.`
    };
  }

  return { allowed: true };
}

export function markAiReplyRead(ai: AiControlState, now = new Date()): AiControlState {
  return {
    ...ai,
    lastReadAt: now.toISOString(),
    unreadAssistantCount: 0
  };
}

export function markAiReplySent(ai: AiControlState, now = new Date()): AiControlState {
  return {
    ...ai,
    lastAssistantAt: now.toISOString(),
    unreadAssistantCount: ai.unreadAssistantCount + 1
  };
}

export function addChatMessage(
  state: HealthLogState,
  message: ChatMessage
): HealthLogState {
  return {
    ...state,
    messages: [...state.messages, message]
  };
}
