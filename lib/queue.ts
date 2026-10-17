import { URGENCY_RANK } from "./triage";
import type { Appointment } from "./types";

/** Priority-first ordering: High -> Medium -> Low, then earliest slot. */
export function sortQueue(appointments: Appointment[]): Appointment[] {
  return [...appointments].sort((a, b) => {
    const byUrgency = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (byUrgency !== 0) return byUrgency;
    return a.slot.localeCompare(b.slot);
  });
}
