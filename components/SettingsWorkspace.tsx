"use client";

import { useEffect, useState } from "react";
import { AppFrame } from "@/components/AppFrame";
import { DEFAULT_STATE } from "@/lib/healthlog/defaults";
import { readState, writeState } from "@/lib/healthlog/store";
import type { HealthLogState, PlanSettings } from "@/lib/healthlog/types";

function getInitialState(): HealthLogState {
  return readState();
}

function parseSchedule(raw: string): string[] {
  return raw
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function SettingsWorkspace() {
  const [state, setState] = useState<HealthLogState>(getInitialState);
  const [scheduleDraft, setScheduleDraft] = useState(state.plan.supplementSchedule.join("\n"));

  useEffect(() => {
    writeState(state);
  }, [state]);

  useEffect(() => {
    setScheduleDraft(state.plan.supplementSchedule.join("\n"));
  }, [state.plan.supplementSchedule]);

  function updatePlan(patch: Partial<PlanSettings>) {
    setState({
      ...state,
      plan: {
        ...state.plan,
        ...patch
      }
    });
  }

  function saveSchedule() {
    updatePlan({ supplementSchedule: parseSchedule(scheduleDraft) });
  }

  function resetDefaults() {
    setState(DEFAULT_STATE);
  }

  return (
    <AppFrame
      title="Settings"
      description="Editable defaults for the deterministic rule engine. These values can later be moved into Supabase without changing the UI flow."
    >
      <div className="grid grid-2">
        <div className="form-card">
          <h3>Targets</h3>
          <div className="entry-form">
            <label>
              <span className="helper">Daily protein target (g)</span>
              <input
                className="input"
                type="number"
                value={state.plan.dailyProteinTargetG}
                onChange={(event) => updatePlan({ dailyProteinTargetG: Number(event.target.value) })}
              />
            </label>
            <label>
              <span className="helper">Daily calories target (kcal)</span>
              <input
                className="input"
                type="number"
                value={state.plan.dailyCalorieTargetKcal}
                onChange={(event) => updatePlan({ dailyCalorieTargetKcal: Number(event.target.value) })}
              />
            </label>
            <label>
              <span className="helper">Sleep target (hours)</span>
              <input
                className="input"
                type="number"
                step="0.1"
                value={state.plan.sleepTargetHours}
                onChange={(event) => updatePlan({ sleepTargetHours: Number(event.target.value) })}
              />
            </label>
            <label>
              <span className="helper">Timezone</span>
              <input
                className="input"
                value={state.plan.timezone}
                onChange={(event) => updatePlan({ timezone: event.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="form-card">
          <h3>Supplement schedule</h3>
          <p className="helper">One item per line. Matched by text only.</p>
          <textarea
            className="textarea"
            value={scheduleDraft}
            onChange={(event) => setScheduleDraft(event.target.value)}
          />
          <div className="row">
            <button type="button" className="button" onClick={saveSchedule}>
              Save schedule
            </button>
            <button type="button" className="button secondary" onClick={resetDefaults}>
              Reset demo data
            </button>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}
