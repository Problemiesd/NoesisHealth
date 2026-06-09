export interface AiAnalysisResponse {
  status: "disabled" | "placeholder";
  message: string;
}

export function getAiAnalysisGate(): AiAnalysisResponse {
  if (
    process.env.NEXT_PUBLIC_ENABLE_OPENAI_CHAT !== "true" &&
    process.env.NEXT_PUBLIC_ENABLE_AI_ANALYSIS !== "true" &&
    process.env.ENABLE_OPENAI_CHAT !== "true" &&
    process.env.ENABLE_AI_ANALYSIS !== "true"
  ) {
    return {
      status: "disabled",
      message: "OpenAI chat is disabled by default."
    };
  }

  return {
    status: "placeholder",
    message: "OpenAI chat is enabled, but this endpoint is only a placeholder."
  };
}
