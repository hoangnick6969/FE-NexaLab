// Run: npx tsx --test src/features/labs/chemistry/wet-bench/kit/kit-items.test.ts (plain node cannot resolve @nexalab/sim subpaths).
import test from "node:test";
import assert from "node:assert/strict";
import { reagentById, type ChemistryLabConfig } from "@nexalab/sim/wet-bench";
import { SHARED_ITEM_META } from "../../../shared/items/catalog.ts";
import { k2LabConfigs } from "../labs/index.ts";
import { K2_APPARATUS } from "./apparatus-manifest.ts";
import { apparatusLabel } from "./bench-reducer.ts";
import { listWetBenchKitItems } from "./kit-items.ts";

/** The intro lists exactly as ExploreBench built them before F0-2. */
function legacyIntro(config: ChemistryLabConfig) {
  const apparatus = config.enabledApparatus.filter((item, index, all) => item.kind !== "test_tube" || all.findIndex((other) => other.kind === "test_tube") === index).map((item) => ({
    id: item.id,
    label: item.kind === "test_tube" ? `${K2_APPARATUS.test_tube.labelVi} × ${config.enabledApparatus.filter((other) => other.kind === "test_tube").length}` : apparatusLabel(config, item.id),
    purpose: K2_APPARATUS[item.kind].purposeVi,
  }));
  // The shelf first, then reagents that already stand in a vessel (FL-12 acid) so their hazards are listed.
  const shelfIds = new Set(config.availableReagents.map((bottle) => bottle.reagentId));
  const inVessels = [...new Set(config.enabledApparatus.flatMap((item) => item.initial?.contents ?? []).map((content) => content.reagentId))].filter((id) => !shelfIds.has(id));
  const materials = [...[...config.availableReagents].sort((a, b) => a.shelfPosition - b.shelfPosition).map((bottle) => bottle.reagentId), ...inVessels].flatMap((reagentId) => {
    const reagent = reagentById(reagentId);
    return reagent ? [{ id: reagent.id, label: reagent.labelVi, hazardLevel: reagent.hazard.level, hazardTags: reagent.hazard.tags, noteSim: reagent.safetyNoteSim, noteReal: reagent.safetyNoteRealLab }] : [];
  });
  return { apparatus, materials };
}

/** The intro lists as ExploreBench builds them now, from listKitItems. */
function introFromItems(config: ChemistryLabConfig) {
  const items = listWetBenchKitItems(config);
  return {
    apparatus: items.filter((item) => item.category !== "material").map((item) => ({ id: item.id, label: item.labelVi, purpose: item.purposeVi })),
    materials: items.filter((item) => item.category === "material").map((item) => ({
      id: item.id, label: item.labelVi, hazardLevel: item.safety?.level ?? "none", hazardTags: item.safety?.tags ?? [], noteSim: item.safety?.noteSim, noteReal: item.safety?.noteReal,
    })),
  };
}

for (const [key, config] of Object.entries(k2LabConfigs)) {
  test(`${key}: intro apparatus and materials read through listKitItems are unchanged`, () => {
    assert.deepEqual(introFromItems(config), legacyIntro(config));
  });
}

test("instruments and materials get their own category", () => {
  const items = listWetBenchKitItems(k2LabConfigs["fl-13"]);
  assert.equal(items.find((item) => item.id === "meter")?.category, "instrument");
  assert.equal(items.find((item) => item.id === "HCl_0_1M")?.category, "material");
});

test("every apparatus points to its renderer; beakers and the scale point to shared items", () => {
  for (const config of Object.values(k2LabConfigs)) {
    for (const item of listWetBenchKitItems(config)) {
      if (item.category === "material") { assert.equal(item.rendererKey, undefined); continue; }
      assert.ok((item.rendererKey ?? "") in K2_APPARATUS, `${item.id} has no renderer key`);
      if (item.sharedItemId) assert.ok(item.sharedItemId in SHARED_ITEM_META);
    }
  }
  const fl10 = listWetBenchKitItems(k2LabConfigs["fl-10"]);
  assert.deepEqual(fl10.filter((item) => item.sharedItemId).map((item) => [item.id, item.sharedItemId]),
    [["scale", "digital-scale"], ["C1", "beaker"], ["C2", "beaker"], ["waste", "beaker"]]);
  const tube = listWetBenchKitItems(k2LabConfigs["fl-13"]).find((item) => item.rendererKey === "test_tube");
  assert.equal(tube?.sharedItemId, undefined);
});
