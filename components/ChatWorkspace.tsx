"use client";

import { useEffect, useMemo, useState } from "react";
import { buildDashboardSnapshot } from "@/lib/healthlog/summary";
import {
  canSendAiReply,
  createChatMessage,
  isOpenAiChatEnabled,
  markAiReplyRead,
  markAiReplySent
} from "@/lib/healthlog/chat";
import { DEFAULT_STATE } from "@/lib/healthlog/defaults";
import { parseQuickLog } from "@/lib/healthlog/parser";
import { readState, writeState } from "@/lib/healthlog/store";
import { formatShortDateTime } from "@/lib/healthlog/time";
import type { ChatMessage, HealthLogState, LogEntry } from "@/lib/healthlog/types";

function getInitialState(): HealthLogState {
  return readState();
}

function sortLogsDescending(logs: LogEntry[]): LogEntry[] {
  return [...logs].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
}

function isQuestionLike(text: string): boolean {
  return /\?/.test(text) || /(why|how|what|when|which|แนะนำ|อะไร|ทำไม|ยังไง|เท่าไร|ไหม|หรือ)/i.test(text);
}

function isLogLike(entry: LogEntry, rawText: string): boolean {
  if (isQuestionLike(rawText)) {
    return false;
  }

  if (entry.category === "food" || entry.category === "sleep" || entry.category === "supplement" || entry.category === "weight" || entry.category === "exercise") {
    return true;
  }
  if (entry.category === "note" || entry.category === "unknown") {
    return !isQuestionLike(rawText);
  }
  return false;
}

function logAcknowledgement(entry: LogEntry): string {
  if (entry.status === "incomplete" && entry.clarificationQuestion) {
    return entry.clarificationQuestion;
  }

  switch (entry.category) {
    case "food": {
      const calories = entry.details.calories as number | undefined;
      const proteinG = entry.details.proteinG as number | undefined;
      const foodLabel = String(entry.details.foodLabel ?? entry.details.foodKey ?? "food");
      return `บันทึก ${foodLabel} แล้ว${typeof calories === "number" ? `: ${calories} kcal` : ""}${typeof proteinG === "number" ? `, โปรตีน ${proteinG} g` : ""}.`;
    }
    case "sleep":
      return `บันทึกการนอนแล้ว${typeof entry.details.durationHours === "number" ? `: ${entry.details.durationHours} ชั่วโมง` : ""}.`;
    case "supplement":
      return `บันทึก supplement แล้ว: ${String(entry.details.supplementName ?? "item")}.`;
    case "weight":
      return `บันทึกน้ำหนักแล้ว: ${String(entry.details.weightKg ?? entry.trace.value)} kg.`;
    case "exercise":
      return `บันทึกการออกกำลังกายแล้ว${typeof entry.details.minutes === "number" ? `: ${entry.details.minutes} นาที` : ""}.`;
    case "note":
      return "บันทึกโน้ตแล้ว.";
    default:
      return "บันทึกแล้ว.";
  }
}

function buildSummaryText(state: HealthLogState): string {
  const snapshot = buildDashboardSnapshot(state, new Date());
  return [
    `สรุปวันนี้: ${snapshot.totalCalories.value} kcal, โปรตีน ${snapshot.totalProteinG.value} g, นอน ${snapshot.sleepHours.value} ชั่วโมง.`,
    snapshot.nextActionSuggestion ? `ข้อแนะนำ: ${snapshot.nextActionSuggestion.message}` : "",
    snapshot.incompleteLogs.length > 0 ? `ยังมี log ที่ incomplete ${snapshot.incompleteLogs.length} รายการ.` : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function buildOpenAiMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content
    }));
}

export function ChatWorkspace() {
  const [state, setState] = useState<HealthLogState>(() => getInitialState());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>(() =>
    state.ai.active ? "AI is active." : "AI is off by default."
  );

  useEffect(() => {
    writeState(state);
  }, [state]);

  const orderedLogs = useMemo(() => sortLogsDescending(state.logs), [state.logs]);
  const messages = useMemo(() => [...state.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [state.messages]);
  const snapshot = useMemo(() => buildDashboardSnapshot(state), [state]);
  const aiReady = isOpenAiChatEnabled();
  const aiAllowance = canSendAiReply(state.ai, new Date());

  function updateState(next: HealthLogState | ((current: HealthLogState) => HealthLogState)) {
    setState((current) => (typeof next === "function" ? next(current) : next));
  }

  function toggleAiActive(active: boolean) {
    updateState((current) => ({
      ...current,
      ai: {
        ...current.ai,
        active
      }
    }));
    setStatus(active ? "AI is active." : "AI is off by default.");
  }

  function toggleSummarizeEnabled(active: boolean) {
    updateState((current) => ({
      ...current,
      ai: {
        ...current.ai,
        summarizeEnabled: active
      }
    }));
    setStatus(active ? "Summarize is enabled." : "Summarize is off.");
  }

  function markRead() {
    updateState((current) => ({
      ...current,
      ai: markAiReplyRead(current.ai)
    }));
    setStatus("Marked AI reply as read.");
  }

  function resetDemoData() {
    updateState(DEFAULT_STATE);
    setInput("");
    setStatus("Reset demo data.");
  }

  async function sendToOpenAi(mode: "chat" | "summary", userPrompt: string) {
    setBusy(true);
    setStatus("Calling OpenAI...");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode,
          active: state.ai.active,
          messages: buildOpenAiMessages([
            ...state.messages,
            createChatMessage("user", userPrompt, mode === "summary" ? "summary" : "chat")
          ]),
          state
        })
      });

      const payload = (await response.json()) as { status: string; message?: string; detail?: string };
      const replyText = payload.message;
      if (!response.ok || payload.status !== "ok" || !replyText) {
        throw new Error(payload.detail || replyText || "OpenAI request failed.");
      }

      const now = new Date();
      updateState((current) => ({
        ...current,
        messages: [
          ...current.messages,
          createChatMessage("user", userPrompt, mode === "summary" ? "summary" : "chat", now.toISOString()),
          createChatMessage("assistant", replyText, mode === "summary" ? "summary" : "chat", now.toISOString())
        ],
        ai: markAiReplySent(current.ai, now)
      }));
      setStatus("AI replied.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "OpenAI failed.";
      updateState((current) => ({
        ...current,
        messages: [
          ...current.messages,
          createChatMessage("user", userPrompt, mode === "summary" ? "summary" : "chat"),
          createChatMessage("assistant", `AI error: ${message}`, "system")
        ]
      }));
      setStatus(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSendMessage(mode: "chat" | "summary" = "chat") {
    const trimmed = input.trim();
    if (mode === "chat" && !trimmed) {
      return;
    }

    const now = new Date();
    if (mode === "summary") {
      if (!state.ai.summarizeEnabled) {
        const summaryText = buildSummaryText(state);
        updateState((current) => ({
          ...current,
          messages: [...current.messages, createChatMessage("assistant", summaryText, "summary", now.toISOString())]
        }));
        setStatus("Summary generated locally.");
        return;
      }

      if (!aiReady || !state.ai.active) {
        setStatus("OpenAI is not enabled.");
        return;
      }

      if (!aiAllowance.allowed) {
        updateState((current) => ({
          ...current,
          messages: [
            ...current.messages,
            createChatMessage("assistant", aiAllowance.reason ?? "AI cooldown is active.", "clarification", now.toISOString())
          ]
        }));
        setStatus(aiAllowance.reason ?? "AI cooldown is active.");
        return;
      }

      await sendToOpenAi("summary", "Please summarize the current chat and today's logged health data in Thai.");
      return;
    }

    const userMessage = createChatMessage("user", trimmed, "chat", now.toISOString());
    const parsedLog = parseQuickLog(trimmed, now.toISOString());
    const logLike = isLogLike(parsedLog, trimmed);

    if (logLike) {
      const nextLogs = parsedLog.status === "complete"
        ? sortLogsDescending([parsedLog, ...state.logs])
        : sortLogsDescending([parsedLog, ...state.logs]);

      updateState((current) => ({
        ...current,
        logs: nextLogs,
        messages: [
          ...current.messages,
          userMessage,
          createChatMessage("assistant", logAcknowledgement(parsedLog), parsedLog.status === "complete" ? "log" : "clarification", now.toISOString())
        ]
      }));
      setInput("");
      setStatus(parsedLog.status === "complete" ? "Log saved locally." : "Need clarification before calculating.");
      return;
    }

    if (!state.ai.active || !aiReady) {
      updateState((current) => ({
        ...current,
        messages: [
          ...current.messages,
          userMessage,
          createChatMessage(
            "assistant",
            "OpenAI chat is off. Turn it on to ask questions, or type a log like 'กินไข่ 3 ฟอง'.",
            "system",
            now.toISOString()
          )
        ]
      }));
      setInput("");
      setStatus("AI is off.");
      return;
    }

    if (!aiAllowance.allowed) {
      updateState((current) => ({
        ...current,
        messages: [
          ...current.messages,
          userMessage,
          createChatMessage("assistant", aiAllowance.reason ?? "Please wait before asking again.", "clarification", now.toISOString())
        ]
      }));
      setInput("");
      setStatus(aiAllowance.reason ?? "AI cooldown active.");
      return;
    }

    await sendToOpenAi("chat", trimmed);
    setInput("");
  }

  return (
    <section className="chat-shell">
      <div className="grid grid-2">
        <div className="card chat-panel">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>Chat</h2>
              <p className="muted">พิมพ์ถามตอบ หรือพิมพ์ log สั้น ๆ ได้เลย</p>
            </div>
            <div className="row">
              <label className="pill">
                <input
                  type="checkbox"
                  checked={state.ai.active}
                  onChange={(event) => toggleAiActive(event.target.checked)}
                />
                AI active
              </label>
              <label className="pill">
                <input
                  type="checkbox"
                  checked={state.ai.summarizeEnabled}
                  onChange={(event) => toggleSummarizeEnabled(event.target.checked)}
                />
                Summarize optional
              </label>
            </div>
          </div>

          <div className="chat-window">
            {messages.length === 0 ? (
              <div className="banner">
                <strong>Start here</strong>
                <p className="muted">
                  ตัวอย่าง: "กินไข่ 3 ฟอง", "นอน 04:00-11:00", "วันนี้โปรตีนเหลือเท่าไร?"
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`chat-bubble ${message.role}`}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <strong>{message.role}</strong>
                    <span className="small muted">{formatShortDateTime(message.createdAt, state.plan.timezone)}</span>
                  </div>
                  <p>{message.content}</p>
                </div>
              ))
            )}
          </div>

          <form
            className="entry-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSendMessage("chat");
            }}
          >
            <textarea
              className="textarea"
              placeholder="พิมพ์ข้อความหรือ log..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <div className="row">
              <button className="button" type="submit" disabled={busy}>
                Send
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => void handleSendMessage("summary")}
              >
                Summarize
              </button>
              <button className="button secondary" type="button" onClick={markRead}>
                Mark read
              </button>
              <button className="button secondary" type="button" onClick={resetDemoData}>
                Reset demo
              </button>
            </div>
          </form>

          <p className="helper">{status}</p>
          <p className="helper">
            OpenAI available on server: {aiReady ? "yes" : "no"} | Cooldown: {state.ai.cooldownMinutes} minutes
          </p>
        </div>

        <div className="stack">
          <div className="card">
            <h3>Plan snapshot</h3>
            <div className="list">
              <div className="list-item">
                <strong>Goal</strong>
                <p>{state.plan.goal}</p>
              </div>
              <div className="list-item">
                <strong>Window</strong>
                <p>Until {state.plan.targetDate}</p>
              </div>
              <div className="list-item">
                <strong>Nutrition</strong>
                <p>
                  Daily use {state.plan.dailyUseKcal} kcal | protein {state.plan.dailyProteinTargetG}-
                  {state.plan.dailyProteinMaxG} g
                </p>
              </div>
              <div className="list-item">
                <strong>Activities</strong>
                <p>{state.plan.activities.join(", ")}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Today's totals</h3>
            <div className="grid grid-2">
              <div className="metric">
                <span className="metric-value">{snapshot.totalCalories.value}</span>
                <span className="metric-label">kcal logged</span>
              </div>
              <div className="metric">
                <span className="metric-value">{snapshot.totalProteinG.value}</span>
                <span className="metric-label">protein g logged</span>
              </div>
            </div>
            <p className="helper">Incomplete food logs are excluded from totals.</p>
            <p className="helper">
              Remaining protein to minimum: {Math.max(0, state.plan.dailyProteinTargetG - snapshot.totalProteinG.value)} g
            </p>
          </div>

          <div className="card">
            <h3>Recent logs</h3>
            <div className="list">
              {orderedLogs.length === 0 ? (
                <p className="muted">No logs yet.</p>
              ) : (
                orderedLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="list-item">
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <strong>{log.category.toUpperCase()}</strong>
                      <span className={`pill ${log.status === "incomplete" ? "status-warning" : ""}`}>
                        {log.status}
                      </span>
                    </div>
                    <p>{log.rawText}</p>
                    {log.clarificationQuestion ? <p className="small status-warning">{log.clarificationQuestion}</p> : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h3>OpenAI plan file</h3>
            <p className="muted">
              `AI_PLAN.md` is the source file the server uses for the system prompt. Update that file
              when you want to change AI behavior.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
