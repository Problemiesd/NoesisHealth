export interface AiAnalysisResponse {
  status: "disabled" | "placeholder";
  message: string;
}

export function getAiAnalysisGate(): AiAnalysisResponse {
  if (process.env.ENABLE_AI_ANALYSIS !== "true") {
    return {
      status: "disabled",
      message: "AI analysis is disabled by default."
    };
  }

  return {
    status: "placeholder",
    message: "AI analysis is enabled, but v0 does not call OpenAI automatically."
  };
}
