import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  aiNotice,
  evidenceSpans,
  gradeKindFor,
  pointsKey,
  rationaleSegments,
  requestableSubmissions,
  suggestedPoints,
  type WrittenSuggestion,
} from "./written-suggestion.ts";

const suggestion = (status: WrittenSuggestion["status"], second: Partial<WrittenSuggestion["criteria"][number]> = {}): WrittenSuggestion => ({
  id: "sug-1",
  status,
  promptVersion: "assess-submission@1",
  resourceVersion: 1,
  flags: [],
  createdAt: "2026-11-09T00:00:00.000Z",
  criteria: [
    { promptId: "p1", criterionCode: "A", valid: true, reasonCode: null, suggestedPoints: 2, rationale: "Đúng", uncertainty: null, evidence: [{ start: 0, end: 5 }] },
    { promptId: "p2", criterionCode: "B", valid: true, reasonCode: null, suggestedPoints: 1.5, rationale: "Gần đúng", uncertainty: null, evidence: [{ start: 3, end: 9 }], ...second },
  ],
});

test("accept keeps ACCEPTED_AI only while every point equals the VALID suggestion", () => {
  const s = suggestion("VALID");
  const points = suggestedPoints(s);
  assert.deepEqual(points, { [pointsKey("p1", "A")]: "2", [pointsKey("p2", "B")]: "1.5" });
  assert.equal(gradeKindFor("accept", s, points), "ACCEPTED_AI");
  assert.equal(gradeKindFor("accept", s, { ...points, [pointsKey("p2", "B")]: "1" }), "EDITED_AI");
  assert.equal(gradeKindFor("edit", s, points), "ACCEPTED_AI");
  assert.equal(gradeKindFor("reject", s, points), "REJECTED_AI");
  assert.equal(gradeKindFor(null, s, points), "MANUAL");
});

test("a PARTIAL suggestion can only be edited or rejected; a SUPPRESSED one means a manual grade", () => {
  const partial = suggestion("PARTIAL", { valid: false, reasonCode: "EVIDENCE_MISSING", suggestedPoints: null, rationale: null, evidence: [] });
  assert.deepEqual(suggestedPoints(partial), { [pointsKey("p1", "A")]: "2" });
  assert.equal(gradeKindFor("accept", partial, { [pointsKey("p1", "A")]: "2", [pointsKey("p2", "B")]: "1" }), "EDITED_AI");
  assert.equal(gradeKindFor("reject", partial, {}), "REJECTED_AI");
  const suppressed = { ...suggestion("SUPPRESSED"), criteria: [] };
  for (const choice of ["accept", "edit", "reject"] as const) assert.equal(gradeKindFor(choice, suppressed, {}), "MANUAL");
  assert.equal(gradeKindFor("accept", null, {}), "MANUAL");
});

test("evidence spans come from valid criteria of the same prompt only", () => {
  const partial = suggestion("PARTIAL", { valid: false, evidence: [] });
  assert.deepEqual(evidenceSpans(partial, "p1"), [{ start: 0, end: 5 }]);
  assert.deepEqual(evidenceSpans(partial, "p2"), []);
  assert.deepEqual(evidenceSpans(null, "p1"), []);
});

test("rationale math is split on $...$ and plain text stays text", () => {
  assert.deepEqual(rationaleSegments(String.raw`Đúng $\frac{U}{R}$ và $U = I \cdot R$.`), [
    { math: false, text: "Đúng " },
    { math: true, text: String.raw`\frac{U}{R}` },
    { math: false, text: " và " },
    { math: true, text: String.raw`U = I \cdot R` },
    { math: false, text: "." },
  ]);
  assert.deepEqual(rationaleSegments("<b>không phải HTML</b>"), [{ math: false, text: "<b>không phải HTML</b>" }]);
});

test("notices: provider outage and failures leave manual grading; suggestions report their status", () => {
  assert.equal(aiNotice(null, null), "none");
  assert.equal(aiNotice({ id: "j", status: "RUNNING", failureCode: null }, null), "pending");
  assert.equal(aiNotice({ id: "j", status: "FAILED", failureCode: "PROVIDER_UNAVAILABLE" }, null), "provider_down");
  assert.equal(aiNotice({ id: "j", status: "FAILED", failureCode: "PRIVACY_GUARD_REJECTED" }, null), "failed");
  assert.equal(aiNotice({ id: "j", status: "SUCCEEDED", failureCode: null }, suggestion("SUPPRESSED")), "suppressed");
  assert.equal(aiNotice({ id: "j", status: "SUCCEEDED", failureCode: null }, suggestion("VALID")), "ready");
});

test("only current submissions awaiting a grade and without an active or finished job are requested", () => {
  const ids = requestableSubmissions([
    { status: "AWAITING_GRADE", current: { id: "a" } },
    { status: "GRADED", current: { id: "b" } },
    { status: "LATE_REVIEW_PENDING", current: { id: "c" } },
    { status: "AWAITING_GRADE", current: { id: "d" }, aiSuggestion: { jobId: "j", jobStatus: "PENDING", failureCode: null, suggestionId: null, status: null } },
    { status: "AWAITING_GRADE", current: { id: "e" }, aiSuggestion: { jobId: "j", jobStatus: "FAILED", failureCode: "PROVIDER_UNAVAILABLE", suggestionId: null, status: null } },
    { status: "OVERDUE_UNSUBMITTED", current: null },
  ]);
  assert.deepEqual(ids, ["a", "e"]);
});

test("only the teacher grading screens import the suggestion modules, never student or parent code", () => {
  const root = path.resolve(import.meta.dirname, "../..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) files.push(full);
    }
  };
  walk(root);
  const allowed = new Set(["WrittenGrading.tsx", "WrittenAiSuggestion.tsx", "written-suggestion.test.ts"].map((n) => path.join(root, "features", "classes", n)));
  const importers = files.filter((f) => /from\s+["'][^"']*(written-suggestion|WrittenAiSuggestion)(\.tsx?)?["']/.test(readFileSync(f, "utf8")));
  assert.ok(importers.length >= 2, "the teacher grading screens do use the modules");
  for (const file of importers) assert.ok(allowed.has(file), `${path.relative(root, file)} must not import the AI suggestion modules`);
  const studentFiles = files.filter((f) => /StudentClasses|[\\/]dashboard[\\/]|[\\/]progress[\\/]|[\\/]lessons[\\/]|[\\/]assignments[\\/]|[\\/]parents?[\\/]/.test(f));
  for (const file of studentFiles) assert.ok(!/written-suggestion|WrittenAiSuggestion|ai-assessments|suggestedPoints/.test(readFileSync(file, "utf8")), `${path.relative(root, file)} mentions AI suggestions`);
});

test("the copy uses neutral wording", () => {
  const copy = readFileSync(path.resolve(import.meta.dirname, "WrittenAiSuggestion.tsx"), "utf8").toLowerCase();
  for (const word of ["gian lận", "đạo văn", "cheat", "plagiar", "sao chép"]) assert.ok(!copy.includes(word), `forbidden word: ${word}`);
});
