// Run: npx tsx --test src/features/labs/biology/genetics/mendel-bench.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { fl26Config } from "./labs/fl-26.config.ts";
import { allowedCrosses, describeMendelChange, listMendelKitItems, mendelBench } from "./mendel-bench.ts";

test("the bundled FL-26 config passes the bench validator", () => {
  const result = mendelBench.validate(fl26Config);
  assert.equal(result.ok, true);
});

test("a config on another kit is rejected by the Mendel bench", () => {
  assert.equal(mendelBench.validate({ ...fl26Config, kit: "k2-wet-bench@1" }).ok, false);
});

test("a parent pair the model cannot read is rejected", () => {
  assert.equal(mendelBench.validate({ ...fl26Config, spec: { ...fl26Config.spec, allowedParents: [["Ab", "Aa"]] } }).ok, false);
});

test("the bench is keyed by the k8-garden kit in the biology group", () => {
  assert.equal(mendelBench.kit, "k8-garden");
  assert.equal(mendelBench.group, "biology");
});

test("kit items come from the configured apparatus, with their Vietnamese labels", () => {
  const items = listMendelKitItems(fl26Config);
  assert.deepEqual(items.map((item) => item.id), ["garden-plot", "punnett-board"]);
  assert.equal(items[1].labelVi, "Ma trận Punnett");
  assert.ok(items.every((item) => item.purposeVi.length > 0));
});

test("the allow-list is the config's parent pairs, in order", () => {
  assert.deepEqual(allowedCrosses(fl26Config)[0], ["Aa", "Aa"]);
});

test("the journal line states the exact ratios of the cross", () => {
  assert.equal(describeMendelChange(["Aa", "Aa"]), "Lai Aa × Aa: kiểu gen 1 : 2 : 1, kiểu hình 3 : 1");
  assert.equal(describeMendelChange(["AA", "aa"]), "Lai AA × aa: kiểu gen 1, kiểu hình 1");
});
