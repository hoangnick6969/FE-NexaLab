// Run: npx tsx --test src/features/labs/chemistry/wet-bench/labs/fl-13.class-template.test.ts (plain node cannot resolve @nexalab/sim subpaths).
import test from "node:test";
import assert from "node:assert/strict";
import { deriveWetBenchEffectiveConfig, validateChemistryLabConfig } from "@nexalab/sim/wet-bench";
import { fl13Config } from "./fl-13.config.ts";

const template = fl13Config.classTemplates![0];
const samples = template.reagentGroups[0].options;
const pick = (reagents: string[], promptId = "compare-two-samples") => ({ templateId: template.id, reagents: { samples: reagents }, promptId });

test("the FL-13 config with its class template is a valid Explore config", () => {
  const result = validateChemistryLabConfig(fl13Config);
  assert.equal(result.ok, true);
  assert.equal(fl13Config.configVersion, 2);
});

test("every pair of the six samples derives a strict-valid bench with two pH measures and one explanation", () => {
  let pairs = 0;
  for (let i = 0; i < samples.length; i++) for (let j = i + 1; j < samples.length; j++) {
    const result = deriveWetBenchEffectiveConfig(fl13Config, pick([samples[i], samples[j]]));
    assert.equal(result.ok, true, `${samples[i]} + ${samples[j]}`);
    if (!result.ok) continue;
    pairs++;
    assert.deepEqual(result.requirements.map((item) => item.kind), ["measure", "measure", "explain"]);
    assert.deepEqual(result.config.enabledApparatus.map((item) => item.id), ["rack", "T1", "T2", "waste", "dropper", "meter"]);
    assert.deepEqual(result.config.measurements, ["ph_meter"]);
    assert.equal(result.config.availableReagents.length, 2);
  }
  assert.equal(pairs, 15);
});

test("strong-vs-weak is accepted only for exactly HCl and CH3COOH", () => {
  const accepted = [];
  for (let i = 0; i < samples.length; i++) for (let j = i + 1; j < samples.length; j++)
    if (deriveWetBenchEffectiveConfig(fl13Config, pick([samples[i], samples[j]], "strong-vs-weak")).ok) accepted.push([samples[i], samples[j]]);
  assert.deepEqual(accepted, [["HCl_0_1M", "CH3COOH_0_1M"]]);
});

test("the general prompt names no substance, so it fits every pair", () => {
  const prompt = fl13Config.pedagogy.observationPrompts!.find((item) => item.id === "compare-two-samples")!;
  assert.doesNotMatch(prompt.textVi, /HCl|H₂SO₄|CH₃COOH|NaOH|Ca\(OH\)|nước cất/);
});

test("a sample outside the allow-list or a third sample is refused", () => {
  assert.equal(deriveWetBenchEffectiveConfig(fl13Config, pick(["HCl_0_1M", "phenolphthalein_indicator"])).ok, false);
  assert.equal(deriveWetBenchEffectiveConfig(fl13Config, pick(["HCl_0_1M", "NaOH_0_1M", "H2O_distilled"])).ok, false);
});
