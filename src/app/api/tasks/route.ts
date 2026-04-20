// TODO: Implement GET /api/tasks (list with filters) and POST /api/tasks (create)
// Route handlers = HTTP layer only. All business logic goes in lib/
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
