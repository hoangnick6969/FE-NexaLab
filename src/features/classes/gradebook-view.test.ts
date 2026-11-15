import test from "node:test";
import assert from "node:assert/strict";
import { durationText, score10Text, visibleRows, type GradebookRow } from "./gradebook-view.ts";

const row = (index: number, name: string, status: GradebookRow["status"], total10: number | null, extra: Partial<GradebookRow> = {}): GradebookRow => ({
  index,
  student: { id: `s${index}`, fullName: name, username: `u${index}` },
  status,
  submissionId: total10 === null ? null : `sub${index}`,
  submittedAt: null,
  autoSubmitted: false,
  timeUsedSeconds: null,
  attempts: null,
  mcq10: total10,
  written10: null,
  total10,
  grade: null,
  ai: null,
  similarity: null,
  ...extra,
});
const rows = [
  row(1, "Lê An", "GRADED", 6.7),
  row(2, "Trần Bình", "ABSENT", null),
  row(3, "Đỗ Chi", "AWAITING_GRADE", null, { ai: { suggestionId: "x", status: "VALID", suggested10: 8, canQuickApprove: true } }),
  row(4, "Phạm Dũng", "GRADED", 9.3, { similarity: { level: "HIGH", matchId: "m", reviewed: false, otherStudentId: "s1" } }),
];

test("class order is the API order; score sorts keep unscored rows last in both directions", () => {
  assert.deepEqual(visibleRows(rows, "ALL", "CLASS").map((r) => r.index), [1, 2, 3, 4]);
  assert.deepEqual(visibleRows(rows, "ALL", "SCORE_DESC").map((r) => r.index), [4, 1, 2, 3]);
  assert.deepEqual(visibleRows(rows, "ALL", "SCORE_ASC").map((r) => r.index), [1, 4, 2, 3]);
  assert.deepEqual(visibleRows(rows, "ALL", "STATUS").map((r) => r.status), ["AWAITING_GRADE", "ABSENT", "GRADED", "GRADED"]);
});

test("filters by status group, AI readiness, similarity flags and a diacritic-insensitive search", () => {
  assert.deepEqual(visibleRows(rows, "ABSENT", "CLASS").map((r) => r.index), [2]);
  assert.deepEqual(visibleRows(rows, "TO_GRADE", "CLASS").map((r) => r.index), [3]);
  assert.deepEqual(visibleRows(rows, "AI_READY", "CLASS").map((r) => r.index), [3]);
  assert.deepEqual(visibleRows(rows, "FLAGGED", "CLASS").map((r) => r.index), [4]);
  assert.deepEqual(visibleRows(rows, "ALL", "CLASS", "do chi").map((r) => r.index), [3]);
  assert.deepEqual(visibleRows(rows, "ALL", "CLASS", "u2").map((r) => r.index), [2]);
});

test("scores read on the 10-point scale with a decimal comma, durations as m:ss", () => {
  assert.equal(score10Text(6.7), "6,7");
  assert.equal(score10Text(10), "10,0");
  assert.equal(score10Text(null), "—");
  assert.equal(durationText(725), "12:05");
  assert.equal(durationText(null), "—");
});
