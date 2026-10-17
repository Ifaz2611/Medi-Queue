// FR-01: return the currently signed-in user, if any.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}
