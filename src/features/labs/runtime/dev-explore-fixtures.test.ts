// Run: npx tsx --test src/features/labs/runtime/dev-explore-fixtures.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { devExploreRow } from "./dev-explore-fixtures.ts";
import { resolveExploreConfig } from "./explore-labs.ts";

const IDS = ["fl-26-explore", "fl-20-explore", "fl-21-explore", "fl-27-explore", "fl-16-explore"];

test("each Sinh học bench opens from the bundled config in DEV", () => {
  for (const id of IDS) {
    const row = devExploreRow(id, true);
    assert.ok(row, id);
    assert.equal(row.mode, "explore");
    const resolved = resolveExploreConfig(row);
    assert.equal(resolved.ok, true, id);
  }
});

test("nothing is served outside DEV", () => {
  assert.equal(devExploreRow("fl-26-explore", false), undefined);
});

test("unknown Labs are not faked", () => {
  assert.equal(devExploreRow("fl-13", true), undefined);
});
