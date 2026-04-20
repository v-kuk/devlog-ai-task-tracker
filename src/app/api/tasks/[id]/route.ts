// TODO: Implement GET /api/tasks/[id], PATCH /api/tasks/[id], DELETE /api/tasks/[id]
// Route handlers = HTTP layer only. All business logic goes in lib/
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
