import assert from "node:assert/strict";
import { test } from "node:test";
import { FL15_SAFETY_CONFIG } from "@nexalab/sim/safety-scenario";
import { reagentById } from "@nexalab/sim/wet-bench";
import { listSafetyKitItems } from "./kit-items";

test("FL-15 lists only items referenced by the scenes, with warnings from the K2 catalog", () => {
  const config = {
    ...FL15_SAFETY_CONFIG,
    enabledApparatus: [...FL15_SAFETY_CONFIG.enabledApparatus, { id: "unused", kind: "spatula", slot: "bench" }],
  };
  const items = listSafetyKitItems(config);
  assert.equal(items.some((item) => item.id === "unused"), false);
  assert.equal(items.filter((item) => item.rendererKey === "safety_goggles").length, 1);
  for (const reagent of items.filter((item) => item.category === "material")) {
    assert.equal(reagent.safety, reagentById(reagent.id)?.hazard);
  }
  assert.deepEqual(listSafetyKitItems(config, config.scenes[2].itemRefs).map((item) => item.id), ["goggles", "tube", "holder", "lamp"]);
});
