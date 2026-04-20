// TODO: Implement POST /api/agents/decompose
// Calls lib/agents/decompose.ts — no business logic here
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
