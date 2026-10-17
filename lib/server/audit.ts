// Append-only audit trail writer (FR-05). Server-only.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "../types";

export interface AuditInput {
  userId: string;
  role: Role;
  action: string;
  resourceId: string;
  ipAddress?: string | null;
}

/** Insert an immutable audit event. Failures never block the main action. */
export async function writeAudit(
  db: SupabaseClient,
  input: AuditInput,
): Promise<void> {
  try {
    await db.from("audit_logs").insert({
      user_id: input.userId,
      role: input.role,
      action: input.action,
      resource_id: input.resourceId,
      ip_address: input.ipAddress ?? null,
    });
  } catch {
    // Best-effort: auditing should not break the request.
  }
}

/** Best-effort client IP extraction for audit rows. */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip");
}
