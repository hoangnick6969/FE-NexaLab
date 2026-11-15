import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, defaultForm, draftContent, failureText, formProblems, isActive, levelTargets, LEVEL_LABEL, matrixTotal, pointPreview, pointsText, requestBody, slotTotal, WARNING_TEXT, type ExamDraftJob } from "./exam-ai-view.ts";

test("defaults follow the grade column and fill the form", () => {
  assert.deepEqual(DEFAULTS.REGULAR_15M, { mcqCount: 6, writtenCount: 1, matrix: { RECALL: 40, UNDERSTAND: 40, APPLY: 20 } });
  const form = defaultForm("MIDTERM_45M");
  assert.equal(form.mcqCount, 10);
  assert.equal(form.writtenCount, 2);
  assert.equal(form.lab, null);
  assert.equal(matrixTotal(form.matrix), 100);
  assert.deepEqual(formProblems(form), []);
});

test("level preview matches the server: largest remainder and a 0% level never gets an item", () => {
  assert.deepEqual(levelTargets({ RECALL: 40, UNDERSTAND: 40, APPLY: 20 }, 7), { RECALL: 3, UNDERSTAND: 3, APPLY: 1 });
  assert.deepEqual(levelTargets({ RECALL: 30, UNDERSTAND: 40, APPLY: 30 }, 13), { RECALL: 4, UNDERSTAND: 5, APPLY: 4 });
  assert.deepEqual(levelTargets({ RECALL: 50, UNDERSTAND: 50, APPLY: 0 }, 5), { RECALL: 3, UNDERSTAND: 2, APPLY: 0 });
  assert.equal(slotTotal({ mcqCount: 10, writtenCount: 2, lab: { labId: "a", releaseId: "b", challengeId: "c" } }), 13);
});

test("point preview always adds up to 10 and follows the server split", () => {
  const lab = { labId: "a", releaseId: "b", challengeId: "c" };
  assert.deepEqual(pointPreview({ mcqCount: 4, writtenCount: 1, lab }), { mcq: 4, written: 4, lab: 2 });
  assert.deepEqual(pointPreview({ mcqCount: 6, writtenCount: 1, lab: null }), { mcq: 6, written: 4, lab: 0 });
  assert.deepEqual(pointPreview({ mcqCount: 0, writtenCount: 2, lab }), { mcq: 0, written: 8, lab: 2 });
  assert.deepEqual(pointPreview({ mcqCount: 8, writtenCount: 0, lab }), { mcq: 8, written: 0, lab: 2 });
  assert.equal(pointPreview({ mcqCount: 8, writtenCount: 0, lab: null }), null);
  for (const mcq of [0, 5]) for (const written of [0, 2]) for (const l of [null, lab]) {
    const p = pointPreview({ mcqCount: mcq, writtenCount: written, lab: l });
    if (p) assert.equal(p.mcq + p.written + p.lab, 10);
  }
});

test("form problems name every rule the server enforces", () => {
  const base = defaultForm();
  assert.match(formProblems({ ...base, matrix: { RECALL: 50, UNDERSTAND: 40, APPLY: 20 } })[0]!, /100%.*110%/);
  assert.match(formProblems({ ...base, mcqCount: 5, writtenCount: 0 }).join(" "), /ít nhất hai phần/);
  assert.match(formProblems({ ...base, mcqCount: 21 }).join(" "), /0 đến 20/);
  assert.match(formProblems({ ...base, writtenCount: 4 }).join(" "), /0 đến 3/);
  assert.match(formProblems({ ...base, matrix: { RECALL: 40.5, UNDERSTAND: 39.5, APPLY: 20 } }).join(" "), /số nguyên/);
});

test("the request body is exactly what the create and estimate routes parse", () => {
  const form = { ...defaultForm("MIDTERM_45M"), instruction: "  tập trung vào ampe kế  ", lab: { labId: "lab-1", releaseId: "rel-1", challengeId: "ch-1" } };
  assert.deepEqual(requestBody("lesson-1", form), {
    purpose: "GENERATE_ASSESSMENT", lessonId: "lesson-1", assessmentType: "MIDTERM_45M", matrix: { RECALL: 30, UNDERSTAND: 40, APPLY: 30 },
    sections: { mcqCount: 10, writtenCount: 2, lab: { labId: "lab-1", releaseId: "rel-1", challengeId: "ch-1" } }, instruction: "tập trung vào ampe kế",
  });
  assert.equal("instruction" in requestBody("lesson-1", defaultForm()), false);
});

test("points read with a decimal comma, one to two decimals; levels and warnings have Vietnamese text", () => {
  assert.equal(pointsText(4), "4,0");
  assert.equal(pointsText(0.67), "0,67");
  assert.equal(pointsText(1.5), "1,5");
  assert.deepEqual(Object.values(LEVEL_LABEL), ["Nhận biết", "Thông hiểu", "Vận dụng"]);
  for (const text of Object.values(WARNING_TEXT)) assert.ok(text.length > 10);
  assert.match(failureText("OUTPUT_VALIDATION_FAILED"), /ít nhất hai phần/);
  assert.match(failureText(null), /Không soạn được/);
});

test("a finished job exposes its single draft, an active one does not", () => {
  const content = { questions: [], prompts: [], labs: [] };
  const job = { id: "j", status: "SUCCEEDED", failureCode: null, requestedCount: 7, validCount: 7, droppedCount: 0, assessmentType: "REGULAR_15M", items: [{ id: "i", payload: { content, review: {} }, flags: [] }] } as unknown as ExamDraftJob;
  assert.equal(draftContent(job), content);
  assert.equal(draftContent({ ...job, items: undefined }), null);
  assert.equal(isActive(job), false);
  assert.equal(isActive({ ...job, status: "RUNNING" }), true);
  assert.equal(isActive(undefined), false);
});
