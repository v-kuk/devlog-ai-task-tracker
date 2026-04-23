import { NextRequest, NextResponse } from "next/server";
import { getAllTasksWithMeta, createTask } from "@/lib/db";
import { CreateTaskInputSchema } from "@/types";
import type { GetAllTasksFilters } from "@/lib/db";

// GET /api/tasks?status=todo&sortBy=priority&sortOrder=asc
export function GET(req: NextRequest): NextResponse {
  try {
    const { searchParams } = req.nextUrl;

    const status = searchParams.get("status") ?? undefined;
    const sortByRaw = searchParams.get("sortBy");
    const sortBy: GetAllTasksFilters["sortBy"] =
      sortByRaw === "priority" || sortByRaw === "createdAt" ? sortByRaw : undefined;
    const sortOrderRaw = searchParams.get("sortOrder");
    const sortOrder: GetAllTasksFilters["sortOrder"] =
      sortOrderRaw === "asc" || sortOrderRaw === "desc" ? sortOrderRaw : undefined;

    const taskTypeRaw = searchParams.get("taskType");
    const taskType: GetAllTasksFilters["taskType"] =
      taskTypeRaw === "parents" || taskTypeRaw === "subtasks" ? taskTypeRaw : undefined;
    const parentId = searchParams.get("parentId") ?? undefined;

    const tasks = getAllTasksWithMeta({ status, sortBy, sortOrder, taskType, parentId });
    return NextResponse.json({ tasks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/tasks
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const parsed = CreateTaskInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const task = createTask(parsed.data);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
