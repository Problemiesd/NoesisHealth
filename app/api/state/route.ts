import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { HealthLogState } from "@/lib/healthlog/types";

export const runtime = "nodejs";

type StateRequest = {
  deviceId?: string;
  state?: HealthLogState;
};

function getDeviceId(request: Request, bodyDeviceId?: string): string | null {
  return (
    bodyDeviceId?.trim() ||
    request.headers.get("x-noesis-device-id")?.trim() ||
    new URL(request.url).searchParams.get("deviceId")?.trim() ||
    null
  );
}

export async function GET(request: Request) {
  const deviceId = getDeviceId(request);
  if (!deviceId) {
    return NextResponse.json({ status: "ok", state: null });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      {
        status: "error",
        detail: "Supabase env vars are missing."
      },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("health_app_states")
    .select("state")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        status: "error",
        detail: error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: "ok",
    state: (data?.state as HealthLogState | null) ?? null
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as StateRequest;
  const deviceId = getDeviceId(request, body.deviceId);

  if (!deviceId) {
    return NextResponse.json(
      {
        status: "error",
        detail: "Missing device id."
      },
      { status: 400 }
    );
  }

  if (!body.state) {
    return NextResponse.json(
      {
        status: "error",
        detail: "Missing state payload."
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      {
        status: "error",
        detail: "Supabase env vars are missing."
      },
      { status: 500 }
    );
  }

  const { error } = await supabase.from("health_app_states").upsert(
    {
      device_id: deviceId,
      state: body.state
    },
    {
      onConflict: "device_id"
    }
  );

  if (error) {
    return NextResponse.json(
      {
        status: "error",
        detail: error.message
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "ok", state: body.state });
}
