import { NextRequest, NextResponse } from "next/server";
import { getTaskById } from "@/lib/db";
import { runUnblockAgent } from "@/lib/agents/unblock";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as { taskId?: string };

    if (!body.taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const task = getTaskById(body.taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const result = await runUnblockAgent(body.taskId);
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
