// Run: npx tsx --test src/features/labs/runtime/explore-labs.test.ts (plain node cannot resolve @nexalab/sim subpaths).
import test from "node:test";
import assert from "node:assert/strict";
import { fl13Config } from "../chemistry/wet-bench/labs/fl-13.config.ts";
import { resolveExploreConfig, type ExploreRow } from "./explore-labs.ts";

const activity = { id: "pav-1", key: "acid-base-indicators-explore", version: 2, digest: "d" };
const row = (explore: ExploreRow["explore"], id = "acid-base-indicators"): ExploreRow => ({ id, title: "FL-13", mode: "explore", explore });
const ok = (config: unknown, kit = "k2-wet-bench@1") => ({ ok: true as const, kit, engine: "wet-bench@1.0.0", activity, config });

test("runs only the server config, keyed by its activity", () => {
  const result = resolveExploreConfig(row(ok(fl13Config)));
  assert.equal(result.ok, true);
  if (result.ok) { assert.equal(result.activity.id, "pav-1"); assert.equal(result.config.labId, "acid-base-indicators"); }
});

test("passes every server error code through", () => {
  for (const code of ["EXPLORE_VERSION_MISSING", "EXPLORE_IDENTITY_MISMATCH", "EXPLORE_DIGEST_MISMATCH", "EXPLORE_KIT_UNSUPPORTED", "EXPLORE_CONFIG_INVALID"] as const)
    assert.deepEqual(resolveExploreConfig(row({ ok: false, code })), { ok: false, code });
});

test("stops on FE re-validation failure, unknown bench, other Lab or missing explore (no bundled fallback)", () => {
  assert.deepEqual(resolveExploreConfig(row(ok({ ...fl13Config, availableReagents: [] }))), { ok: false, code: "EXPLORE_CONFIG_INVALID" });
  assert.deepEqual(resolveExploreConfig(row(ok(fl13Config, "k9-bench@1"))), { ok: false, code: "EXPLORE_KIT_UNSUPPORTED" });
  assert.deepEqual(resolveExploreConfig(row(ok(fl13Config), "metal-reactivity")), { ok: false, code: "EXPLORE_IDENTITY_MISMATCH" });
  assert.deepEqual(resolveExploreConfig(row(undefined)), { ok: false, code: "EXPLORE_VERSION_MISSING" });
});
