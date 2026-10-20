// Deterministic Priority Triage Engine (FR-03).
//
//   P_score = (w_k * K) + (w_s * S)
//
//   K = keyword / symptom risk weight (sum of selected symptom weights + complaint keyword matches)
//   S = self-reported severity (1-10)
//   w_k = 2   ,   w_s = 1.5
//
//   P_score >= 25  -> High
//   P_score >= 15  -> Medium
//   otherwise      -> Low

import type { TriageResult, Urgency } from "./types";

export const WEIGHTS = { keyword: 2, severity: 1.5 } as const;

export const URGENCY_THRESHOLDS = { high: 25, medium: 15 } as const;

/** Selectable symptoms and their risk weights. */
export const SYMPTOMS = [
  { key: "chest_pain", label: "Chest Pain", weight: 10 },
  { key: "shortness_of_breath", label: "Shortness of Breath", weight: 8 },
  { key: "high_fever", label: "High Fever", weight: 6 },
  { key: "headache", label: "Headache", weight: 3 },
  { key: "sprain", label: "Sprain", weight: 2 },
  { key: "mild_cold", label: "Mild Cold", weight: 1 },
] as const;

/** Chief-complaint keywords and their risk weights. */
export const KEYWORDS = [
  { term: "chest pain", weight: 10 },
  { term: "unconscious", weight: 10 },
  { term: "breath", weight: 8 },
  { term: "bleeding", weight: 7 },
  { term: "fever", weight: 6 },
  { term: "dizzy", weight: 3 },
  { term: "headache", weight: 3 },
  { term: "nausea", weight: 2 },
  { term: "sprain", weight: 2 },
  { term: "cold", weight: 1 },
] as const;

/** Compute the K component: symptom checkboxes + complaint keyword matches. */
export function keywordWeight(selected: string[], complaint = ""): number {
  let k = 0;
  for (const symptom of SYMPTOMS) {
    if (selected.includes(symptom.key)) k += symptom.weight;
  }
  const text = complaint.toLowerCase();
  for (const keyword of KEYWORDS) {
    if (text.includes(keyword.term)) k += keyword.weight;
  }
  return k;
}

export function categorize(score: number): Urgency {
  if (score >= URGENCY_THRESHOLDS.high) return "High";
  if (score >= URGENCY_THRESHOLDS.medium) return "Medium";
  return "Low";
}

/** Run the deterministic triage formula; reject non-finite or out-of-range severity. */
export function triage(
  selected: string[],
  severity: number,
  complaint = "",
): TriageResult {
  if (!Number.isFinite(severity) || severity < 1 || severity > 10) {
    throw new RangeError("Severity must be between 1 and 10.");
  }

  const K = keywordWeight(selected, complaint);
  const S = severity;
  const score = Number((WEIGHTS.keyword * K + WEIGHTS.severity * S).toFixed(1));
  return { score, urgency: categorize(score), keywordWeight: K, severity: S };
}

export const URGENCY_RANK: Record<Urgency, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};
