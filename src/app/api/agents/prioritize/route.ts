import { NextResponse } from "next/server";
import { runPrioritizationAgent } from "@/lib/agents/prioritize";

export async function POST() {
  try {
    const result = await runPrioritizationAgent();
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    console.error("[api/agents/prioritize]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent error" },
      { status: 500 }
    );
  }
}
