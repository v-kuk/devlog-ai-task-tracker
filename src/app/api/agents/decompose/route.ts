import { NextRequest, NextResponse } from "next/server";
import { runDecomposeAgent } from "@/lib/agents/decompose";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      taskId?: string;
      clarificationAnswer?: string;
    };
    if (!body.taskId) {
      return NextResponse.json({ error: "taskId required" }, { status: 400 });
    }
    const result = await runDecomposeAgent(body.taskId, body.clarificationAnswer);
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    console.error("[api/agents/decompose]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent error" },
      { status: 500 }
    );
  }
}
