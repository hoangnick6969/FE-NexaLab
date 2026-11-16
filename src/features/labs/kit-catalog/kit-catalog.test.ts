// Run: npx tsx --test src/features/labs/kit-catalog/kit-catalog.test.ts (plain node cannot resolve @nexalab/sim subpaths).
import test from "node:test";
import assert from "node:assert/strict";
import { fl13Config } from "../chemistry/wet-bench/labs/fl-13.config.ts";
import { fl14aConfig } from "../chemistry/wet-bench/labs/fl-14a.config.ts";
import { collectKitCatalogs } from "./kit-catalog.ts";

const ok = (id: string, title: string, config: any) => ({ id, title, mode: "explore", explore: { ok: true as const, kit: "k2-wet-bench@1", config } });
const rows = [ok("acid-base-indicators", "Acid – base", fl13Config), ok("metal-reactivity", "Kim loại", fl14aConfig), { id: "circuit", title: "Mạch điện", mode: "guided" }];

test("one Kit Hóa học from the wet bench, built from the Explore labs only", () => {
  const catalogs = collectKitCatalogs(rows);
  assert.deepEqual(catalogs.map((catalog) => [catalog.group, catalog.benches, catalog.labs.map((lab) => lab.catalogId)]), [["chemistry", ["k2-wet-bench@1"], ["FL-13", "FL-14a"]]]);
});

test("apparatus appear once, by kind, under the name of the kind, with the Labs that use them", () => {
  const [kit] = collectKitCatalogs(rows);
  const byKey = new Map([...kit.apparatus, ...kit.instruments].map((entry) => [entry.key, entry]));
  assert.equal(byKey.get("test_tube")?.label, "Ống nghiệm", "not 'Ống nghiệm × 6'");
  assert.deepEqual(byKey.get("dropper_pipette")?.usedIn.map((lab) => lab.catalogId), ["FL-13", "FL-14a"]);
  assert.deepEqual(byKey.get("litmus_strip_dispenser")?.usedIn.map((lab) => lab.catalogId), ["FL-13"]);
  assert.deepEqual(byKey.get("tongs")?.usedIn.map((lab) => lab.catalogId), ["FL-14a"]);
  assert.equal(byKey.has("electronic_scale"), false, "no published Explore lab uses the scale yet");
  assert.equal(kit.apparatus.length, new Set(kit.apparatus.map((entry) => entry.key)).size);
});

test("instruments are their own section, and shared items are marked", () => {
  const [kit] = collectKitCatalogs(rows);
  assert.deepEqual(kit.instruments.map((entry) => entry.key), ["digital_ph_meter"]);
  assert.equal(kit.apparatus.find((entry) => entry.key === "beaker_100ml")?.sharedItemId, "beaker");
  assert.equal(kit.apparatus.find((entry) => entry.key === "waste_beaker")?.sharedItemId, "beaker");
  assert.equal(kit.apparatus.find((entry) => entry.key === "test_tube")?.sharedItemId, undefined);
});

test("reagents are merged by id and keep their hazard", () => {
  const [kit] = collectKitCatalogs(rows);
  const hcl = kit.materials.find((entry) => entry.key === "HCl_0_1M");
  assert.deepEqual(hcl?.usedIn.map((lab) => lab.catalogId), ["FL-13", "FL-14a"]);
  assert.notEqual(hcl?.safety?.level, "none");
  assert.equal(kit.materials.length, new Set(kit.materials.map((entry) => entry.key)).size);
});

test("guided rows, rows with an error and benches the registry does not know are left out", () => {
  assert.deepEqual(collectKitCatalogs([{ id: "circuit", title: "x", mode: "guided" }]), []);
  assert.deepEqual(collectKitCatalogs([{ id: "a", title: "x", mode: "explore", explore: { ok: false } }]), []);
  assert.deepEqual(collectKitCatalogs([{ id: "a", title: "x", mode: "explore", explore: { ok: true, kit: "no-such-bench@1", config: {} } }]), []);
});
