// Demo bootstrap endpoint. Creates the demo accounts and (when empty) seeds
// appointments + audit events. Used by the admin "Reset demo data" button,
// and safe to call repeatedly (idempotent).

import { NextResponse } from "next/server";
import { runSeed } from "@/lib/server/seed";

export async function POST(request: Request) {
  try {
    const reset = new URL(request.url).searchParams.get("reset") === "true";
    const summary = await runSeed(reset);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Seed failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
