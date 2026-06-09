import type { HealthLogState } from "@/lib/healthlog/types";

type StateResponse =
  | { status: "ok"; state: HealthLogState | null; detail?: string }
  | { status: "error"; detail?: string };

const STATE_ENDPOINT = "/api/state";

export async function loadRemoteState(deviceId: string): Promise<HealthLogState | null> {
  const response = await fetch(`${STATE_ENDPOINT}?deviceId=${encodeURIComponent(deviceId)}`, {
    method: "GET",
    headers: {
      "x-noesis-device-id": deviceId
    },
    cache: "no-store"
  });

  const payload = (await response.json()) as StateResponse;
  if (!response.ok || payload.status !== "ok") {
    throw new Error(payload.detail ?? "Failed to load Supabase state.");
  }

  return payload.state;
}

export async function saveRemoteState(deviceId: string, state: HealthLogState): Promise<void> {
  const response = await fetch(STATE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-noesis-device-id": deviceId
    },
    body: JSON.stringify({ deviceId, state })
  });

  const payload = (await response.json()) as StateResponse;
  if (!response.ok || payload.status !== "ok") {
    throw new Error(payload.detail ?? "Failed to save Supabase state.");
  }
}
