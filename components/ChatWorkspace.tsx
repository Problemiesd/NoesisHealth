"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  canSendAiReply,
  createChatMessage,
  isOpenAiChatEnabled,
  markAiReplyRead,
  markAiProactiveSent,
  markAiReplySent,
  markAiUserAction
} from "@/lib/healthlog/chat";
import { getOrCreateDeviceId } from "@/lib/healthlog/device";
import { DEFAULT_STATE } from "@/lib/healthlog/defaults";
import { parseQuickLog } from "@/lib/healthlog/parser";
import { loadRemoteState, saveRemoteState } from "@/lib/healthlog/remote-state";
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
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<string>(() =>
    state.ai.active ? "AI is active." : "AI is off by default."
  );
  const deviceIdRef = useRef<string | null>(null);
  const lastSavedJsonRef = useRef<string>("");
  const proactiveInFlightRef = useRef(false);

  if (deviceIdRef.current === null) {
    deviceIdRef.current = getOrCreateDeviceId();
  }

  const aiReady = isOpenAiChatEnabled();
  const aiAllowance = canSendAiReply(state.ai, new Date());
  const messages = useMemo(() => [...state.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [state.messages]);

  useEffect(() => {
    writeState(state);
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateRemoteState() {
      const deviceId = deviceIdRef.current;
      if (!deviceId) {
        setHydrated(true);
        return;
      }

      try {
        const remoteState = await loadRemoteState(deviceId);
        if (cancelled) {
          return;
        }

        if (remoteState) {
          setState(remoteState);
          writeState(remoteState);
          lastSavedJsonRef.current = JSON.stringify(remoteState);
          setStatus("Loaded from Supabase.");
        } else {
          setStatus("Supabase is ready.");
        }
      } catch {
        if (!cancelled) {
          setStatus("Using local cache.");
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    void hydrateRemoteState();

    return () => {
      cancelled = true;
    };
    // Hydrate once on mount.
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const deviceId = deviceIdRef.current;
    if (!deviceId) {
      return;
    }

    const serialized = JSON.stringify(state);
    if (serialized === lastSavedJsonRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveRemoteState(deviceId, state)
        .then(() => {
          lastSavedJsonRef.current = serialized;
        })
        .catch(() => {
          setStatus("Saved locally. Supabase sync failed.");
        });
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hydrated, state]);

  useEffect(() => {
    if (document.visibilityState !== "visible" || state.ai.unreadAssistantCount === 0) {
      return;
    }

    updateState((current) => ({
      ...current,
      ai: markAiReplyRead(current.ai)
    }));
  }, [state.ai.unreadAssistantCount, state.messages.length]);

  useEffect(() => {
    if (!hydrated || !state.ai.active || state.ai.lastUserActionAt || !aiReady) {
      return;
    }

    updateState((current) => ({
      ...current,
      ai: markAiUserAction(current.ai)
    }));
  }, [aiReady, hydrated, state.ai.active, state.ai.lastUserActionAt]);

  useEffect(() => {
    if (!hydrated || !aiReady || !state.ai.active || busy || proactiveInFlightRef.current) {
      return;
    }

    if (!state.ai.lastUserActionAt) {
      return;
    }

    if (state.ai.lastProactiveAt && state.ai.lastProactiveAt >= state.ai.lastUserActionAt) {
      return;
    }

    proactiveInFlightRef.current = true;
    void sendProactiveCoachCheckIn()
      .finally(() => {
        proactiveInFlightRef.current = false;
      });
  }, [
    aiReady,
    busy,
    hydrated,
    state.ai.active,
    state.ai.lastProactiveAt,
    state.ai.lastUserActionAt,
    state.logs.length
  ]);

  useEffect(() => {
    function syncReadState() {
      if (document.visibilityState !== "visible") {
        return;
      }

      updateState((current) => {
        if (current.ai.unreadAssistantCount === 0) {
          return current;
        }

        return {
          ...current,
          ai: markAiReplyRead(current.ai)
        };
      });
    }

    syncReadState();
    window.addEventListener("focus", syncReadState);
    document.addEventListener("visibilitychange", syncReadState);

    return () => {
      window.removeEventListener("focus", syncReadState);
      document.removeEventListener("visibilitychange", syncReadState);
    };
  }, []);

  function updateState(next: HealthLogState | ((current: HealthLogState) => HealthLogState)) {
    setState((current) => (typeof next === "function" ? next(current) : next));
  }

  function toggleAiActive(active: boolean) {
    updateState((current) => ({
      ...current,
      ai: {
        ...current.ai,
        active,
        lastUserActionAt: active ? new Date().toISOString() : current.ai.lastUserActionAt
      }
    }));
    setStatus(active ? "AI is active." : "AI is off by default.");
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

  async function sendProactiveCoachCheckIn() {
    setBusy(true);
    setStatus("Coach check-in...");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: "coach",
          active: state.ai.active,
          messages: buildOpenAiMessages([
            ...state.messages,
            createChatMessage(
              "user",
              "Generate a proactive coaching check-in. Focus on the single best next action the user should take right now to move toward the goal. Do not greet. Do not ask what the user wants to log. Be direct and useful.",
              "summary"
            )
          ]),
          state
        })
      });

      const payload = (await response.json()) as { status: string; message?: string; detail?: string };
      const replyText = payload.message;
      if (!response.ok || payload.status !== "ok" || !replyText) {
        throw new Error(payload.detail || replyText || "Coach request failed.");
      }

      const now = new Date();
      updateState((current) => ({
        ...current,
        messages: [...current.messages, createChatMessage("assistant", replyText, "summary", now.toISOString())],
        ai: markAiProactiveSent(current.ai, now)
      }));
      setStatus("Coach check-in sent.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Coach check-in failed.";
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
    const userMessage = createChatMessage("user", trimmed, "chat", now.toISOString());
    const parsedLog = parseQuickLog(trimmed, now.toISOString());
    const logLike = isLogLike(parsedLog, trimmed);

    if (logLike) {
      updateState((current) => ({
        ...current,
        logs: sortLogsDescending([parsedLog, ...current.logs]),
        messages: [
          ...current.messages,
          userMessage,
          createChatMessage("assistant", logAcknowledgement(parsedLog), parsedLog.status === "complete" ? "log" : "clarification", now.toISOString())
        ],
        ai: markAiUserAction(current.ai, now)
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
      <div className="chat-card">
        <header className="chat-header">
          <div className="chat-title">
            <p className="eyebrow">NoesisHealth</p>
          </div>
          <div className="chat-controls">
            <label className="chip">
              <input
                type="checkbox"
                checked={state.ai.active}
                onChange={(event) => toggleAiActive(event.target.checked)}
              />
              AI active
            </label>
            <button className="button secondary" type="button" onClick={resetDemoData}>
              Reset
            </button>
          </div>
        </header>

        <div className="chat-feed">
          {messages.map((message) => (
            <article key={message.id} className={`chat-bubble ${message.role === "user" ? "user" : "ai"}`}>
              <div className="bubble-head">
                <strong>{message.role === "user" ? "You" : "AI"}</strong>
                <span className="small muted">{formatShortDateTime(message.createdAt, state.plan.timezone)}</span>
              </div>
              <p>{message.content}</p>
            </article>
          ))}
        </div>

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSendMessage("chat");
          }}
        >
          <textarea
            className="textarea"
            placeholder="Type here..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <div className="composer-actions">
            <button className="button" type="submit" disabled={busy}>
              Send
            </button>
          </div>
        </form>

        <footer className="chat-footer">
          <span className="helper">{status}</span>
        </footer>
      </div>
    </section>
  );
}
