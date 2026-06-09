import { getAiAnalysisGate } from "@/lib/healthlog/ai";
import { NextResponse } from "next/server";

export async function POST() {
  const gate = getAiAnalysisGate();
  return NextResponse.json(gate);
}

export async function GET() {
  const gate = getAiAnalysisGate();
  return NextResponse.json(gate);
}
