// Run: npx tsx --test src/features/labs/shared/explore/ExploreJournal.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { appendJournalEntry, journalExportPayload } from "./ExploreJournal.tsx";

test("a saved line is appended with trimmed text and keeps earlier lines", () => {
  const first = appendJournalEntry([], { at: "t1", summary: " Bỏ rắn ", note: " Thỏ tăng " });
  const second = appendJournalEntry(first, { at: "t2", summary: "Kịch bản A", note: "" });
  assert.deepEqual(first, [{ at: "t1", summary: "Bỏ rắn", note: "Thỏ tăng" }]);
  assert.equal(second.length, 2);
  assert.equal(second[1].note, "");
});

test("the export is marked unscored and keeps every line", () => {
  const entries = appendJournalEntry([], { at: "t1", summary: "x", note: "" });
  const payload = journalExportPayload({ labId: "fl-21-explore", activityId: "pav-1", kit: "k8-diorama", engine: "food-web@1.0.0" }, entries);
  assert.equal(payload.scored, false);
  assert.equal(payload.entries.length, 1);
  assert.equal(payload.labId, "fl-21-explore");
});
