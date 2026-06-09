"use client";

import { useEffect, useMemo, useState } from "react";
import { AppFrame } from "@/components/AppFrame";
import { DEFAULT_STATE } from "@/lib/healthlog/defaults";
import { buildDashboardSnapshot } from "@/lib/healthlog/summary";
import { readState, writeState } from "@/lib/healthlog/store";
import { formatShortDateTime } from "@/lib/healthlog/time";
import type { HealthLogState } from "@/lib/healthlog/types";

function getInitialState(): HealthLogState {
  return readState();
}

export function DashboardWorkspace() {
  const [state, setState] = useState<HealthLogState>(getInitialState);

  useEffect(() => {
    writeState(state);
  }, [state]);

  const snapshot = useMemo(() => buildDashboardSnapshot(state), [state]);

  function resetDefaults() {
    setState(DEFAULT_STATE);
  }

  return (
    <AppFrame
      title="Dashboard"
      description="Today view with totals, incomplete logs, latest weight, and deterministic next-action suggestions."
    >
      <div className="grid grid-3">
        <div className="panel metric">
          <span className="metric-value">{snapshot.totalCalories.value}</span>
          <span className="metric-label">Today total kcal</span>
        </div>
        <div className="panel metric">
          <span className="metric-value">{snapshot.totalProteinG.value}</span>
          <span className="metric-label">Today total protein g</span>
        </div>
        <div className="panel metric">
          <span className="metric-value">{snapshot.sleepHours.value}</span>
          <span className="metric-label">Today sleep hours</span>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Next action suggestion</h3>
          {snapshot.nextActionSuggestion ? (
            <div className={`banner ${snapshot.nextActionSuggestion.severity === "warning" ? "status-warning" : ""}`}>
              <p>{snapshot.nextActionSuggestion.message}</p>
              <p className="small muted">
                Based on: {snapshot.nextActionSuggestion.based_on.join(", ") || "none"}
              </p>
              {snapshot.nextActionSuggestion.missing_fields.length > 0 ? (
                <p className="small muted">
                  Missing: {snapshot.nextActionSuggestion.missing_fields.join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="stack" style={{ marginTop: 12 }}>
            {snapshot.advice.map((item) => (
              <div key={item.message} className={`list-item ${item.severity === "warning" ? "status-warning" : ""}`}>
                <p>{item.message}</p>
                <p className="small muted">Based on: {item.based_on.join(", ") || "none"}</p>
                {item.assumptions.length > 0 ? (
                  <p className="small muted">Assumptions: {item.assumptions.join("; ")}</p>
                ) : null}
                {item.missing_fields.length > 0 ? (
                  <p className="small muted">Missing: {item.missing_fields.join(", ")}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>State detail</h3>
          <div className="list">
            <div className="list-item">
              <strong>Supplements taken</strong>
              <p>{snapshot.supplementsTaken.value.join(", ") || "None"}</p>
            </div>
            <div className="list-item">
              <strong>Latest weight</strong>
              <p>{snapshot.latestWeightKg.value ?? "No weight logged yet"}</p>
            </div>
            <div className="list-item">
              <strong>Incomplete logs</strong>
              <p>{snapshot.incompleteLogs.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Incomplete logs</h3>
          <div className="list">
            {snapshot.incompleteLogs.length === 0 ? (
              <p className="muted">None today.</p>
            ) : (
              snapshot.incompleteLogs.map((log) => (
                <div key={log.id} className="list-item">
                  <p>
                    <strong>{log.category.toUpperCase()}</strong> {log.rawText}
                  </p>
                  <p className="small muted">
                    {formatShortDateTime(log.loggedAt, state.plan.timezone)}
                  </p>
                  {log.clarificationQuestion ? (
                    <p className="pill status-warning">{log.clarificationQuestion}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3>Logging rules</h3>
          <div className="list">
            <div className="list-item">
              <p>Food entries without quantities are stored as incomplete and not counted.</p>
            </div>
            <div className="list-item">
              <p>Only complete food logs contribute to kcal and protein totals.</p>
            </div>
            <div className="list-item">
              <p>Sleep duration is calculated only from explicit windows or durations.</p>
            </div>
            <div className="list-item">
              <p>Supplement reminders are rule-based and depend on the editable schedule.</p>
            </div>
          </div>
          <button type="button" className="button secondary" onClick={resetDefaults}>
            Reset demo data
          </button>
        </div>
      </div>
    </AppFrame>
  );
}
