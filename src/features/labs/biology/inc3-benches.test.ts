// Run: npx tsx --test src/features/labs/biology/inc3-benches.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { fl16Config } from "./anatomy/labs/fl-16.config.ts";
import { fl20Config } from "./ecology/labs/fl-20.config.ts";
import { fl21Config } from "./ecology/labs/fl-21.config.ts";
import { fl27Config } from "./molecular/labs/fl-27.config.ts";
import { anatomyBench } from "./anatomy/anatomy-bench.ts";
import { dioramaBench } from "./ecology/diorama-bench.ts";
import { molecularBench } from "./molecular/molecular-bench.ts";

test("every INC-3 sample config passes its bench validator", () => {
  assert.equal(dioramaBench.validate(fl21Config).ok, true);
  assert.equal(dioramaBench.validate(fl20Config).ok, true);
  assert.equal(molecularBench.validate(fl27Config).ok, true);
  assert.equal(anatomyBench.validate(fl16Config).ok, true);
});

test("a config is refused by a bench of another kit", () => {
  assert.equal(molecularBench.validate(fl21Config).ok, false);
  assert.equal(anatomyBench.validate(fl27Config).ok, false);
});

test("the benches sit in their kit groups", () => {
  assert.equal(dioramaBench.group, "biology");
  assert.equal(molecularBench.group, "biology");
  assert.equal(anatomyBench.group, "explore-support");
});

test("kit items list the configured apparatus", () => {
  const items = dioramaBench.listKitItems(fl21Config as never);
  assert.deepEqual(items.map((item) => item.id), ["web-board"]);
  assert.ok(items[0].purposeVi.length > 0);
  assert.equal(anatomyBench.listKitItems(fl16Config as never)[0].labelVi, "Mô hình mắt");
});

// The sim copy of FL-16 (explore-kits) mirrors the released eye-optics@1.0.0 table; pin it here where both load.
import { EYE_OPTICS_SCENARIOS, requiredPowerD } from "@nexalab/sim/eye-optics";
import { FL16_SCENARIOS, fl16PowerResult } from "@nexalab/sim/explore-kits";

test("the FL-16 scenario table matches the released eye-optics model", () => {
  assert.deepEqual(FL16_SCENARIOS.map((item) => item.id), EYE_OPTICS_SCENARIOS.map((item) => item.id));
  for (const released of EYE_OPTICS_SCENARIOS) {
    const mirrored = FL16_SCENARIOS.find((item) => item.id === released.id)!;
    assert.equal(mirrored.axialLengthM, released.axialLengthM);
    assert.equal(mirrored.objectDistanceM, released.objectDistanceM);
    assert.equal(fl16PowerResult(released.id).powerD, requiredPowerD(released.axialLengthM, released.objectDistanceM));
  }
});
