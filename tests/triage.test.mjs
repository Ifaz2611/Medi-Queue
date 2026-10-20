import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { categorize, keywordWeight, triage } from "../lib/triage.ts";

describe("urgency thresholds (FR-03)", () => {
  for (const [score, urgency] of [
    [0, "Low"],
    [14.9, "Low"],
    [15, "Medium"],
    [15.1, "Medium"],
    [24.9, "Medium"],
    [25, "High"],
    [25.1, "High"],
    [100, "High"],
  ]) {
    it(`categorizes score ${score} as ${urgency}`, () => {
      assert.equal(categorize(score), urgency);
    });
  }

  // Exercise the complete scoring path immediately below, at, and above
  // each threshold using valid intake values, independently of exported constants.
  for (const { symptoms, severity, weight, score, urgency } of [
    { symptoms: ["sprain"], severity: 7, weight: 2, score: 14.5, urgency: "Low" },
    { symptoms: [], severity: 10, weight: 0, score: 15, urgency: "Medium" },
    { symptoms: ["mild_cold"], severity: 9, weight: 1, score: 15.5, urgency: "Medium" },
    { symptoms: ["chest_pain"], severity: 3, weight: 10, score: 24.5, urgency: "Medium" },
    { symptoms: ["shortness_of_breath"], severity: 6, weight: 8, score: 25, urgency: "High" },
    { symptoms: ["high_fever"], severity: 9, weight: 6, score: 25.5, urgency: "High" },
  ]) {
    it(`computes score ${score} and urgency ${urgency}`, () => {
      assert.deepEqual(triage(symptoms, severity), {
        score,
        urgency,
        keywordWeight: weight,
        severity,
      });
    });
  }
});

describe("symptom and complaint keyword weights", () => {
  for (const [symptom, weight] of [
    ["chest_pain", 10],
    ["shortness_of_breath", 8],
    ["high_fever", 6],
    ["headache", 3],
    ["sprain", 2],
    ["mild_cold", 1],
  ]) {
    it(`assigns ${symptom} weight ${weight}`, () => {
      assert.equal(keywordWeight([symptom]), weight);
    });
  }

  for (const [complaint, weight] of [
    ["chest pain", 10],
    ["CHEST PAIN", 10],
    ["ChEsT PaIn", 10],
    ["I have CHEST PAIN!", 10],
    ["unconscious", 10],
    ["shortness of breath", 8],
    ["SHORTNESS OF BREATH", 8],
    ["bleeding", 7],
    ["fever", 6],
    ["dizzy", 3],
    ["headache", 3],
    ["nausea", 2],
    ["sprain", 2],
    ["cold", 1],
  ]) {
    it(`matches complaint "${complaint}" with weight ${weight}`, () => {
      assert.equal(keywordWeight([], complaint), weight);
      assert.equal(triage([], 4, complaint).score, 2 * weight + 6);
    });
  }

  it("returns zero for empty input and unrecognized symptoms or complaints", () => {
    assert.equal(keywordWeight([]), 0);
    assert.equal(keywordWeight(["unknown_symptom"], "Routine checkup"), 0);
  });

  it("sums multiple symptoms and distinct complaint keywords", () => {
    assert.deepEqual(
      triage(["headache", "sprain"], 4, "FEVER and nausea"),
      { score: 32, urgency: "High", keywordWeight: 13, severity: 4 },
    );
  });

  it("counts a selected symptom and its complaint keyword separately", () => {
    assert.equal(keywordWeight(["chest_pain"], "CHEST PAIN"), 20);
  });

  it("counts repeated selections and repeated keyword mentions only once", () => {
    assert.equal(
      keywordWeight(["headache", "headache"], "fever FEVER fever"),
      9,
    );
  });

  it("preserves the inputs and produces the same result on repeated calls", () => {
    const symptoms = ["headache", "sprain"];
    const first = triage(symptoms, 4, "FEVER and nausea");
    assert.deepEqual(triage(symptoms, 4, "FEVER and nausea"), first);
    assert.deepEqual(symptoms, ["headache", "sprain"]);
  });
});

describe("severity limits", () => {
  for (let severity = 1; severity <= 10; severity += 1) {
    it(`accepts severity ${severity}`, () => {
      assert.deepEqual(triage([], severity), {
        score: 1.5 * severity,
        urgency: severity === 10 ? "Medium" : "Low",
        keywordWeight: 0,
        severity,
      });
    });
  }

  it("accepts finite fractional severity within the API's allowed range", () => {
    assert.deepEqual(triage([], 1.5), {
      score: 2.3,
      urgency: "Low",
      keywordWeight: 0,
      severity: 1.5,
    });
  });

  for (const severity of [-1, 0, 0.99, 10.01, 11, NaN, Infinity, -Infinity]) {
    it(`rejects invalid severity ${severity}`, () => {
      assert.throws(() => triage([], severity), {
        name: "RangeError",
        message: "Severity must be between 1 and 10.",
      });
    });
  }
});
