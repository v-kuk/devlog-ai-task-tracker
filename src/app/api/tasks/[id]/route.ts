import { NextRequest, NextResponse } from "next/server";
import { getTaskById, updateTask, deleteTask } from "@/lib/db";
import { UpdateTaskInputSchema } from "@/types";

interface RouteContext {
  params: { id: string };
}

// GET /api/tasks/[id]
export function GET(_req: NextRequest, { params }: RouteContext): NextResponse {
  try {
    const task = getTaskById(params.id);
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ task });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/tasks/[id]
export async function PATCH(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const task = getTaskById(params.id);
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body: unknown = await req.json();
    const parsed = UpdateTaskInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const updated = updateTask(params.id, parsed.data);
    return NextResponse.json({ task: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]
export function DELETE(_req: NextRequest, { params }: RouteContext): NextResponse {
  try {
    const task = getTaskById(params.id);
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    deleteTask(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
