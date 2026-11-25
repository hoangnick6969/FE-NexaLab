import test from "node:test";
import assert from "node:assert/strict";
import { canMaterialize, decisionCounts, filterItems, jobStatusTone } from "./teacher-ai-view.ts";
import type { AiJobItem, AiJobView } from "./teacher-ai-api.ts";

const items = [null, "ACCEPTED", "EDITED", "REJECTED"].map((decision, index) => ({ id: String(index), decision: decision ? { decision } : null })) as AiJobItem[];
const job = { materializedResourceId: null, items } as AiJobView;

test("decision counts and filters map accepted to kept", () => {
  assert.deepEqual(decisionCounts(items), { ALL: 4, PENDING: 1, KEPT: 1, EDITED: 1, REJECTED: 1 });
  for (const filter of ["PENDING", "KEPT", "EDITED", "REJECTED"] as const) assert.equal(filterItems(items, filter).length, 1);
  assert.equal(filterItems(items, "ALL"), items);
});

test("materialization requires every decision and one kept item", () => {
  assert.equal(canMaterialize(job), false);
  assert.equal(canMaterialize(job, items.slice(1)), true);
  assert.equal(canMaterialize(job, items.slice(3)), false);
  assert.equal(canMaterialize({ ...job, materializedResourceId: "draft" }, items.slice(1)), false);
});

test("status tones distinguish lifecycle states", () => {
  assert.deepEqual(["PENDING", "RUNNING", "SUCCEEDED", "CANCELLED", "FAILED"].map((status) => jobStatusTone(status as AiJobView["status"])), ["neutral", "running", "ready", "done", "failed"]);
});
