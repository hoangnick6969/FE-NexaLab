import assert from "node:assert/strict";
import { test } from "node:test";
import { FL15_SAFETY_CONFIG, type SafetyScenarioConfig } from "@nexalab/sim/safety-scenario";
import { safetyScenarioReagentById } from "@nexalab/sim/safety-scenario";
import { listSafetyKitItems } from "./kit-items";

test("FL-15 lists only items referenced by the scenes, with warnings from the K2 catalog", () => {
  const config: SafetyScenarioConfig = {
    ...FL15_SAFETY_CONFIG,
    enabledApparatus: [...FL15_SAFETY_CONFIG.enabledApparatus, { id: "unused", kind: "beaker_100ml", slot: "bench" }],
  };
  const items = listSafetyKitItems(config);
  assert.equal(items.some((item) => item.id === "unused"), false);
  assert.equal(items.filter((item) => item.rendererKey === "safety_goggles").length, 1);
  assert.equal(items.find((item) => item.id === "beaker")?.sharedItemId, "beaker");
  assert.ok(items.every((item) => item.purposeVi.length > 0));
  for (const reagent of items.filter((item) => item.category === "material")) {
    assert.equal(reagent.safety, safetyScenarioReagentById(reagent.id)?.hazard);
  }
  assert.deepEqual(listSafetyKitItems(config, config.scenes[2].itemRefs).map((item) => item.id), ["goggles", "tube", "holder", "lamp"]);
});
