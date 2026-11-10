import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { droppedSummary, engineSummary, jobPhase, jobsForLesson, offeredLabIds, openProposals, paramRows, unavailableReason, type ChallengeParameters } from "./lab-challenge-view.ts";

const parameters: ChallengeParameters = {
  circuit: {
    modelRef: "circuit@1.0.0",
    rangeReview: "team-lead-default",
    params: { maxCurrentMa: { kind: "number", label: "Dòng tối đa", unit: "mA", min: 5, max: 20, step: 1 } },
  },
  chemistry: {
    modelRef: "chemistry@1.0.0",
    rangeReview: "team-lead-default",
    params: { reactionId: { kind: "choice", label: "Phản ứng", options: [{ value: "mg-hcl", label: "Mg + 2HCl" }] } },
  },
  "thermal-energy": { modelRef: "thermal-bench@1.0.0", rangeReview: "pending", params: {} },
  buoyancy: { modelRef: "buoyancy@1.0.0", rangeReview: "pending", params: { x: { kind: "number", label: "x", unit: "", min: 0, max: 1, step: 1 } } },
};
const draft = { id: "l1", status: "draft", scope: "TEACHER_PRIVATE" };

test("only labs with a reviewed or team-lead default range and at least one parameter are offered", () => {
  assert.deepEqual(offeredLabIds(parameters), ["circuit", "chemistry"]);
  assert.deepEqual(offeredLabIds(undefined), []);
  assert.deepEqual(offeredLabIds({ circuit: { ...parameters.circuit, rangeReview: "approved" } }), ["circuit"]);
});

test("the action is disabled with the reason: not saved, no approved model, not private, not draft, locked", () => {
  assert.equal(unavailableReason(draft, {}, parameters), null);
  assert.equal(unavailableReason({ status: "draft" }, {}, parameters), "not_saved");
  assert.equal(unavailableReason(null, {}, parameters), "not_saved");
  assert.equal(unavailableReason(draft, {}, { buoyancy: parameters.buoyancy }), "no_model");
  assert.equal(unavailableReason(draft, {}, undefined), "no_model");
  assert.equal(unavailableReason({ ...draft, scope: "SHARED_LIBRARY" }, {}, parameters), "not_private");
  assert.equal(unavailableReason({ ...draft, status: "published" }, {}, parameters), "not_draft");
  assert.equal(unavailableReason(draft, { structureLocked: true }, parameters), "locked");
});

test("parameter rows carry the label, unit, allowed bounds and the choice label", () => {
  assert.deepEqual(paramRows("circuit", { maxCurrentMa: 15 }, parameters), [{ name: "maxCurrentMa", label: "Dòng tối đa", value: "15", unit: "mA", bounds: "5–20" }]);
  assert.deepEqual(paramRows("chemistry", { reactionId: "mg-hcl" }, parameters), [{ name: "reactionId", label: "Phản ứng", value: "Mg + 2HCl", unit: "", bounds: "" }]);
  assert.deepEqual(paramRows("circuit", { other: 3 }, parameters), [{ name: "other", label: "other", value: "3", unit: "", bounds: "" }]);
});

test("engine summary counts passing reference states", () => {
  assert.deepEqual(engineSummary([{ label: "a", verdict: "passed" }, { label: "b", verdict: "needs_practice" }, { label: "c", verdict: "partial" }]), { passed: 1, total: 3, failing: 2 });
  assert.deepEqual(engineSummary([]), { passed: 0, total: 0, failing: 0 });
});

const card = (id: string, decision: "REJECTED" | "ACCEPTED" | null) => ({ id, decision: decision ? { decision, reasonCode: null, at: "" } : null }) as never;
test("open proposals exclude rejected ones and everything once one is applied; phases follow the job", () => {
  const job = { appliedItemId: null, proposals: [card("a", null), card("b", "REJECTED")] } as never;
  assert.deepEqual(openProposals(job).map((p: { id: string }) => p.id), ["a"]);
  assert.deepEqual(openProposals({ appliedItemId: "a", proposals: [card("a", "ACCEPTED")] } as never), []);
  assert.equal(jobPhase({ status: "RUNNING", appliedItemId: null }), "active");
  assert.equal(jobPhase({ status: "PENDING", appliedItemId: null }), "active");
  assert.equal(jobPhase({ status: "SUCCEEDED", appliedItemId: null }), "review");
  assert.equal(jobPhase({ status: "SUCCEEDED", appliedItemId: "a" }), "applied");
  assert.equal(jobPhase({ status: "FAILED", appliedItemId: null }), "failed");
  assert.equal(jobPhase({ status: "CANCELLED", appliedItemId: null }), "cancelled");
});

test("dropped reasons are counted per code in first-seen order and jobs are filtered per lesson", () => {
  assert.deepEqual(droppedSummary([{ position: 0, reasonCodes: ["PARAMS_OUT_OF_RANGE"] }, { position: 1, reasonCodes: ["MODEL_NOT_ALLOWED", "PARAMS_OUT_OF_RANGE"] }]), [
    { code: "PARAMS_OUT_OF_RANGE", count: 2 },
    { code: "MODEL_NOT_ALLOWED", count: 1 },
  ]);
  assert.deepEqual(droppedSummary([]), []);
  assert.deepEqual(jobsForLesson([{ id: "1", lessonId: "a" }, { id: "2", lessonId: "b" }] as never, "b").map((j: { id: string }) => j.id), ["2"]);
});

test("the lesson editor loads the panel on demand and nothing student-facing imports it", () => {
  const src = path.resolve(import.meta.dirname, "..");
  const lessons = readFileSync(path.join(src, "lessons", "Lessons.tsx"), "utf8");
  assert.match(lessons, /lazy\(\(\) => import\("\.\.\/lab-challenge\/LabChallengePanel"\)\)/);
  assert.doesNotMatch(lessons, /from "\.\.\/lab-challenge/);
  assert.doesNotMatch(lessons, /lab-challenge-api/);
  for (const file of ["StudentLessonsHub.tsx", "LessonDetail.tsx", "lesson-catalog.ts"]) {
    const text = readFileSync(path.join(src, "lessons", file), "utf8");
    assert.doesNotMatch(text, /lab-challenge|LabChallenge/, file);
  }
});
