import { NextResponse } from "next/server";
import { z } from "zod";
import { runStatusAgent } from "@/lib/agents/status";

const BodySchema = z.object({ taskId: z.string() });

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const result = await runStatusAgent({ taskId: body.taskId });
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[api/agents/status]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent error" },
      { status: 500 }
    );
  }
}
