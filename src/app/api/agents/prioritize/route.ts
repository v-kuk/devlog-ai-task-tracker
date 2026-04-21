import { NextRequest, NextResponse } from "next/server";
import { getTaskById, getAllTasks } from "@/lib/db";
import { runPrioritizeAgent } from "@/lib/agents/prioritize";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as { taskId?: string };

    // If a taskId is given, verify it exists
    if (body.taskId) {
      const task = getTaskById(body.taskId);
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
    }

    const taskIds = body.taskId
      ? [body.taskId]
      : getAllTasks().map((t) => t.id);

    const result = await runPrioritizeAgent(taskIds);
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
