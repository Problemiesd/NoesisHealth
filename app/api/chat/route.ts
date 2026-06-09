import { NextResponse } from "next/server";
import { buildSystemPrompt, readAiCoachDocument, readAiPlanDocument } from "@/lib/healthlog/ai-plan";
import { DEFAULT_STATE } from "@/lib/healthlog/defaults";
import { isOpenAiChatEnabled } from "@/lib/healthlog/chat";
import type { HealthLogState } from "@/lib/healthlog/types";

type ChatRequest = {
  mode?: "chat" | "summary" | "coach";
  active?: boolean;
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  state?: HealthLogState;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequest;

  if (!body.active || !isOpenAiChatEnabled()) {
    return NextResponse.json({
      status: "disabled",
      message: "OpenAI chat is inactive."
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      status: "disabled",
      message: "OPENAI_API_KEY is missing."
    });
  }

  const planDocument = await readAiPlanDocument();
  const coachDocument = await readAiCoachDocument();
  const systemPrompt = buildSystemPrompt(planDocument, coachDocument, body.state ?? DEFAULT_STATE, body.mode ?? "chat");
  const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...(body.messages ?? [])
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      {
        status: "error",
        message: "OpenAI request failed.",
        detail: text
      },
      { status: 502 }
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim() || "No reply returned.";

  return NextResponse.json({
    status: "ok",
    message: content
  });
}
