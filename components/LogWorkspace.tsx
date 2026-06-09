"use client";

import { useEffect, useMemo, useState } from "react";
import { AppFrame } from "@/components/AppFrame";
import { DEFAULT_STATE } from "@/lib/healthlog/defaults";
import { buildDashboardSnapshot } from "@/lib/healthlog/summary";
import { createParsedLog, readState, writeState } from "@/lib/healthlog/store";
import { dateKeyForTimeZone, formatShortDateTime } from "@/lib/healthlog/time";
import type { HealthLogState, LogEntry } from "@/lib/healthlog/types";

function getInitialState(): HealthLogState {
  return readState();
}

function sortLogsDescending(logs: LogEntry[]): LogEntry[] {
  return [...logs].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
}

export function LogWorkspace() {
  const [state, setState] = useState<HealthLogState>(getInitialState);
  const [input, setInput] = useState("");
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string>("AI analysis is disabled by default.");

  useEffect(() => {
    writeState(state);
  }, [state]);

  const orderedLogs = useMemo(() => sortLogsDescending(state.logs), [state.logs]);
  const snapshot = useMemo(() => buildDashboardSnapshot(state), [state]);

  function handleAddLog() {
    if (!input.trim()) {
      return;
    }

    const parsed = createParsedLog(input.trim());
    const nextLogs = sortLogsDescending([parsed, ...state.logs]);
    setState({ ...state, logs: nextLogs });
    setLastSavedId(parsed.id);
    setInput("");
  }

  function restoreDefaults() {
    setState(DEFAULT_STATE);
  }

  function handleAiAnalysis() {
    if (process.env.NEXT_PUBLIC_ENABLE_AI_ANALYSIS !== "true") {
      setAiResult("AI analysis is disabled by default.");
      return;
    }

    setAiResult("AI analysis placeholder is enabled, but no OpenAI request is sent in v0.");
  }

  const todayLabel = dateKeyForTimeZone(new Date(), state.plan.timezone);

  return (
    <AppFrame
      title="Quick Log"
      description="Type a short natural-language log. The parser decides whether the entry is food, sleep, supplement, weight, exercise, note, or unknown."
    >
      <div className="grid grid-2">
        <div className="form-card">
          <h3>New entry</h3>
          <form
            className="entry-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleAddLog();
            }}
          >
            <textarea
              className="textarea"
              placeholder="กินไข่ 3 ฟอง"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <div className="row">
              <button type="submit" className="button">
                Save log
              </button>
              <button type="button" className="button secondary" onClick={restoreDefaults}>
                Reset demo data
              </button>
            </div>
          </form>
          <p className="helper">
            Logs are timestamped automatically. Food entries with missing amounts are saved as incomplete.
          </p>
          {lastSavedId ? <p className="pill">Saved log id: {lastSavedId}</p> : null}
        </div>

        <div className="stack">
          <div className="card">
            <h3>Today's snapshot</h3>
            <div className="grid grid-2">
              <div className="metric">
                <span className="metric-value">{snapshot.totalCalories.value}</span>
                <span className="metric-label">kcal today</span>
              </div>
              <div className="metric">
                <span className="metric-value">{snapshot.totalProteinG.value}</span>
                <span className="metric-label">protein g today</span>
              </div>
            </div>
            <p className="helper">Timezone: {state.plan.timezone} | Today key: {todayLabel}</p>
          </div>
          <div className="banner">
            <h3>AI analysis</h3>
            <p className="muted">{aiResult}</p>
            <button
              type="button"
              className="button secondary"
              onClick={handleAiAnalysis}
              disabled={process.env.NEXT_PUBLIC_ENABLE_AI_ANALYSIS !== "true"}
            >
              Run AI placeholder
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Recent logs</h3>
          <div className="list">
            {orderedLogs.length === 0 ? (
              <p className="muted">No logs yet.</p>
            ) : (
              orderedLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="list-item">
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <strong>{log.category.toUpperCase()}</strong>
                    <span className={`pill ${log.status === "incomplete" ? "status-warning" : ""}`}>
                      {log.status}
                    </span>
                  </div>
                  <p>{log.rawText}</p>
                  <p className="small muted">
                    {formatShortDateTime(log.loggedAt, state.plan.timezone)}
                  </p>
                  {log.status === "incomplete" && log.clarificationQuestion ? (
                    <p className="pill status-warning">{log.clarificationQuestion}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3>Complete log trace</h3>
          <div className="list">
            {orderedLogs.map((log) => (
              <div key={log.id} className="list-item">
                <p className="small muted">
                  {log.category} | {log.trace.unit} | based on {log.trace.based_on.join(", ") || "none"}
                </p>
                <p>
                  <strong>{String(log.trace.value ?? "incomplete")}</strong>
                </p>
                {log.trace.missing_fields.length > 0 ? (
                  <p className="small status-warning">Missing: {log.trace.missing_fields.join(", ")}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppFrame>
  );
}
