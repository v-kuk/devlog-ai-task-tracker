import { NextResponse } from "next/server";
import { runUnblockingAgent } from "@/lib/agents/unblock";

export async function POST() {
  try {
    const result = await runUnblockingAgent();
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    console.error("[api/agents/unblock]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent error" },
      { status: 500 }
    );
  }
}
