"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChatMessage,
  isOpenAiChatEnabled,
  markAiReplyRead,
  markAiReplySent
} from "@/lib/healthlog/chat";
import { getOrCreateDeviceId } from "@/lib/healthlog/device";
import { DEFAULT_STATE } from "@/lib/healthlog/defaults";
import { loadRemoteState, saveRemoteState } from "@/lib/healthlog/remote-state";
import { readState, writeState } from "@/lib/healthlog/store";
import type { ChatMessage, HealthLogState, LogEntry } from "@/lib/healthlog/types";

type AiChatDecision = {
  action: "reply" | "save_log" | "reply_and_save";
  message: string;
  log?: Partial<LogEntry> & {
    category?: LogEntry["category"];
    status?: LogEntry["status"];
    createdAt?: string;
    loggedAt?: string;
    clarificationQuestion?: string;
    trace?: LogEntry["trace"];
    details?: Record<string, unknown>;
  };
};

function getInitialState(): HealthLogState {
  return readState();
}

function sortLogsDescending(logs: LogEntry[]): LogEntry[] {
  return [...logs].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
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

function extractDecisionJson(rawText: string): string | null {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const trimmed = rawText.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  return null;
}

function normalizeDecision(rawText: string): AiChatDecision {
  const jsonText = extractDecisionJson(rawText);
  if (!jsonText) {
    return {
      action: "reply",
      message: rawText.trim()
    };
  }

  try {
    const parsed = JSON.parse(jsonText) as Partial<AiChatDecision>;
    if (
      typeof parsed.message !== "string" ||
      !parsed.message.trim() ||
      (parsed.action !== "reply" && parsed.action !== "save_log" && parsed.action !== "reply_and_save")
    ) {
      return {
        action: "reply",
        message: rawText.trim()
      };
    }

    return {
      action: parsed.action,
      message: parsed.message.trim(),
      log: parsed.log
    };
  } catch {
    return {
      action: "reply",
      message: rawText.trim()
    };
  }
}

function hydrateAiLogEntry(log: AiChatDecision["log"], fallbackText: string, loggedAt: string): LogEntry | null {
  if (!log) {
    return null;
  }

  const category = log.category ?? "note";
  const status = log.status ?? "complete";
  const rawText = typeof log.rawText === "string" && log.rawText.trim() ? log.rawText.trim() : fallbackText;

  if (
    category !== "food" &&
    category !== "sleep" &&
    category !== "supplement" &&
    category !== "weight" &&
    category !== "exercise" &&
    category !== "note" &&
    category !== "unknown"
  ) {
    return null;
  }

  if (status !== "complete" && status !== "incomplete") {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    rawText,
    category,
    status,
    createdAt:
      typeof log.createdAt === "string" && log.createdAt.trim() ? log.createdAt : loggedAt,
    loggedAt:
      typeof log.loggedAt === "string" && log.loggedAt.trim() ? log.loggedAt : loggedAt,
    clarificationQuestion:
      typeof log.clarificationQuestion === "string" && log.clarificationQuestion.trim()
        ? log.clarificationQuestion.trim()
        : undefined,
    trace:
      log.trace ??
      ({
        value: null,
        unit: "text",
        based_on: [],
        missing_fields: [],
        assumptions: []
      } as LogEntry["trace"]),
    details: log.details && typeof log.details === "object" ? log.details : {}
  };
}

function appendAssistantReply(
  current: HealthLogState,
  assistantText: string,
  kind: ChatMessage["kind"],
  nowIso: string,
  savedLog: LogEntry | null
): HealthLogState {
  return {
    ...current,
    logs: savedLog ? sortLogsDescending([savedLog, ...current.logs]) : current.logs,
    messages: [
      ...current.messages,
      createChatMessage("assistant", assistantText, kind, nowIso)
    ],
    ai: markAiReplySent(current.ai, new Date(nowIso))
  };
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
  const chatFeedRef = useRef<HTMLDivElement | null>(null);

  if (deviceIdRef.current === null) {
    deviceIdRef.current = getOrCreateDeviceId();
  }

  const aiReady = isOpenAiChatEnabled();
  const messages = useMemo(
    () => [...state.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [state.messages]
  );

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
    const feed = chatFeedRef.current;
    if (!feed) {
      return;
    }

    feed.scrollTo({
      top: feed.scrollHeight,
      behavior: "smooth"
    });
  }, [messages.length, busy]);

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
        active
      }
    }));
    setStatus(active ? "AI is active." : "AI is off by default.");
  }

  function resetDemoData() {
    updateState(DEFAULT_STATE);
    setInput("");
    setStatus("Reset demo data.");
  }

  async function sendToOpenAi(mode: "chat" | "summary", conversationMessages: ChatMessage[], userPrompt: string) {
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
          messages: buildOpenAiMessages(conversationMessages),
          state
        })
      });

      const payload = (await response.json()) as { status: string; message?: string; detail?: string };
      const replyText = payload.message;
      if (!response.ok || payload.status !== "ok" || !replyText) {
        throw new Error(payload.detail || replyText || "OpenAI request failed.");
      }

      const decision = normalizeDecision(replyText);
      const nowIso = new Date().toISOString();
      const savedLog =
        decision?.action && decision.action !== "reply"
          ? hydrateAiLogEntry(decision.log, userPrompt, nowIso)
          : null;
      const assistantText = decision?.message?.trim() ? decision.message.trim() : replyText.trim();
      const assistantKind: ChatMessage["kind"] =
        savedLog && savedLog.status === "incomplete" ? "clarification" : savedLog ? "log" : "chat";

      updateState((current) => appendAssistantReply(current, assistantText, assistantKind, nowIso, savedLog));
      setStatus(savedLog ? "AI replied and saved a log." : "AI replied.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "OpenAI failed.";
      updateState((current) => ({
        ...current,
        messages: [
          ...current.messages,
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

    const nowIso = new Date().toISOString();
    const userMessage = createChatMessage("user", trimmed, "chat", nowIso);

    updateState((current) => ({
      ...current,
      messages: [...current.messages, userMessage]
    }));

    if (!state.ai.active || !aiReady) {
      updateState((current) => ({
        ...current,
        messages: [
          ...current.messages,
          createChatMessage(
            "assistant",
            "OpenAI chat is off. Turn it on to ask questions.",
            "system",
            nowIso
          )
        ]
      }));
      setInput("");
      setStatus("AI is off.");
      return;
    }

    const conversationMessages = [...messages, userMessage];
    await sendToOpenAi(mode, conversationMessages, trimmed);
    setInput("");
  }

  return (
    <section className="chat-shell">
      <div className="chat-card">
        <header className="chat-header">
          <div className="chat-title">
            <p className="eyebrow">NoesisHealth</p>
          </div>
          <button className="reset-link" type="button" onClick={resetDemoData}>
            Reset
          </button>
        </header>

        <div className="chat-feed" ref={chatFeedRef}>
          {messages.map((message) =>
            message.role === "user" ? (
              <article key={message.id} className="chat-bubble user">
                <p>{message.content}</p>
              </article>
            ) : (
              <article key={message.id} className="chat-line ai">
                <p>{message.content}</p>
              </article>
            )
          )}
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
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSendMessage("chat");
              }
            }}
            onChange={(event) => setInput(event.target.value)}
          />
          <div className="composer-actions">
            <button
              className={`toggle-button ${state.ai.active ? "awake" : "sleeping"}`}
              type="button"
              aria-pressed={!state.ai.active}
              onClick={() => toggleAiActive(!state.ai.active)}
            >
              <span className="toggle-title">Zzz..</span>
            </button>
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
