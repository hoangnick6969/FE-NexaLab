// Run: npx tsx --test src/features/labs/biology/journal-summaries.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { anatomySummary } from "./anatomy/anatomy-bench.ts";
import { foodWebSummary, toleranceSummary } from "./ecology/diorama-bench.ts";
import { molecularSummary } from "./molecular/molecular-bench.ts";

test("FL-21 journal line names the species and the direct effects", () => {
  const line = foodWebSummary("ran");
  assert.match(line, /^Bỏ Rắn: /);
  assert.match(line, /Ếch tăng/);
});

test("FL-20 journal line gives the temperature and the zone", () => {
  assert.equal(toleranceSummary("ca-ro-phi", 250), "Cá rô phi ở 25.0 °C: trong vùng sống");
});

test("FL-27 journal line gives the variant, the base change and the amino acid effect", () => {
  assert.equal(molecularSummary("gene-a-nonsense"), "gene-a-nonsense: vị trí 12 G→A, axit amin Trp→Stop (NONSENSE)");
});

test("FL-16 journal line gives the scenario and the lens power", () => {
  assert.match(anatomySummary("normal-near"), /^Kịch bản normal-near: độ tụ cần có 63\.1\d D$/);
});
