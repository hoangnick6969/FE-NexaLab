// Run: npx tsx --test src/features/labs/chemistry/wet-bench/kit/fl-11-bench.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { validateChemistryLabConfig } from "@nexalab/sim/wet-bench";
import { fl11Config } from "../labs/fl-11.config.ts";
import { benchReducer, initialBenchState, scaleDisplayMicrograms, volumeLabel, type BenchAction, type BenchUiState } from "./bench-reducer.ts";
import { listWetBenchKitItems } from "./kit-items.ts";
import { formatGrams } from "./observation-log.ts";

const run = (actions: BenchAction[], start: BenchUiState = initialBenchState(fl11Config)) => actions.reduce(benchReducer, start);
const t = (n: number) => 1_000 + n;
const spoonWith = (reagentId: string, milligrams: number): BenchAction[] => [
  { type: "hold", held: { kind: "tool", tool: "spatula", apparatusId: "spoon" } },
  { type: "click_bottle", reagentId, now: t(1) },
  { type: "set_powder", milligrams },
];
const pour = (volumes: number[], vesselId: string): BenchAction[] => [
  { type: "release" },
  { type: "click_bottle", reagentId: "H2O_pour", now: t(2) },
  ...volumes.flatMap((microliters): BenchAction[] => [{ type: "preset", microliters }, { type: "click_vessel", vesselId, now: t(3) }]),
  { type: "release" },
];
const stir = (vesselId: string): BenchAction[] => [
  { type: "hold", held: { kind: "tool", tool: "glass_rod", apparatusId: "rod" } },
  { type: "click_vessel", vesselId, now: t(4) },
  { type: "release" },
];

test("the FL-11 config is valid and lists the shared cylinder, beaker and scale as shared items", () => {
  const result = validateChemistryLabConfig(fl11Config);
  assert.ok(result.ok, result.ok ? "" : result.errors.join("; "));
  const items = listWetBenchKitItems(fl11Config);
  const shared = Object.fromEntries(items.filter((item) => item.sharedItemId).map((item) => [item.rendererKey, item.sharedItemId]));
  assert.deepEqual(shared, { electronic_scale: "digital-scale", beaker_100ml: "beaker", waste_beaker: "beaker", graduated_cylinder_100ml: "graduated-cylinder" });
  assert.equal(items.filter((item) => item.category === "material").length, 3);
});

test("the scale reads 585 mg as 0,59 g after being zeroed, and tare is presentation only", () => {
  const state = run([{ type: "tare", now: t(0) }, ...spoonWith("NaCl_powder", 585), { type: "click_vessel", vesselId: "B1", now: t(5) }]);
  assert.equal(formatGrams(scaleDisplayMicrograms(state)), "0,59 g");
  assert.equal(state.current.bench.vessels.B1.powders.NaCl, 585_000);
  assert.equal(state.log.at(-1)?.readings.scale, "0,59 g");
  // Without the zero the learner sees the beaker too (50 g).
  assert.equal(formatGrams(scaleDisplayMicrograms({ ...state, scaleZero: 0 })), "50,59 g");
});

test("goal 1: 0,10 M NaCl with the volumetric flask: concluding is refused until it is stirred", () => {
  const prepared = run([
    { type: "tare", now: t(0) }, ...spoonWith("NaCl_powder", 585), { type: "click_vessel", vesselId: "B1", now: t(5) }, { type: "release" },
    ...pour([25_000, 25_000, 10_000], "B1"),
  ]);
  assert.equal(prepared.current.bench.vessels.B1.solutionMicroliters, 60_000);
  const early = benchReducer(prepared, { type: "conclude", targetId: "nacl-0-1m", vesselId: "B1", now: t(6) });
  assert.match(early.notice?.textVi ?? "", /chưa tan hết/);
  assert.deepEqual(early.conclusions, {});
  // Moving it to the flask before stirring is refused too.
  const moved = run([{ type: "click_vessel", vesselId: "B1", now: t(7) }, { type: "click_vessel", vesselId: "V1", now: t(8) }], prepared);
  assert.match(moved.notice?.textVi ?? "", /chưa tan hết/);
  assert.equal(moved.current.bench.vessels.B1.solutionMicroliters, 60_000);

  const done = run([
    ...stir("B1"), { type: "click_vessel", vesselId: "B1", now: t(9) }, { type: "click_vessel", vesselId: "V1", now: t(10) },
    { type: "fill_mark", vesselId: "V1", now: t(11) }, { type: "conclude", targetId: "nacl-0-1m", vesselId: "V1", now: t(12) },
  ], prepared);
  assert.equal(done.current.bench.vessels.V1.solutionMicroliters, 100_000);
  const conclusion = done.conclusions["nacl-0-1m"];
  assert.equal(conclusion?.result.millimolar, 100);
  assert.equal(conclusion?.result.tenthsPercent, 6);
  assert.equal(conclusion?.result.withinTarget, true);
  assert.match(done.log.at(-1)?.phenomenaVi.join(" ") ?? "", /trong dung sai/);
});

test("goal 2: 5 % CuSO4: 2,5 g in 47,5 mL of water poured through the cylinder", () => {
  const state = run([
    ...spoonWith("CuSO4_powder", 2500), { type: "click_vessel", vesselId: "B1", now: t(5) }, { type: "release" },
    ...pour([25_000, 10_000, 10_000, 1000, 1000, 500], "G1"),
    { type: "click_vessel", vesselId: "G1", now: t(6) }, { type: "click_vessel", vesselId: "B1", now: t(7) },
    ...stir("B1"), { type: "conclude", targetId: "cuso4-5pct", vesselId: "B1", now: t(8) },
  ]);
  assert.equal(state.current.bench.vessels.B1.solutionMicroliters, 47_500);
  const conclusion = state.conclusions["cuso4-5pct"];
  assert.equal(conclusion?.result.tenthsPercent, 50);
  assert.equal(conclusion?.result.withinTarget, true);
});

test("the conclusion is cleared when the bench changes and by reset", () => {
  const concluded = run([
    ...spoonWith("CuSO4_powder", 2500), { type: "click_vessel", vesselId: "B1", now: t(5) }, { type: "release" },
    ...pour([25_000, 25_000], "B1"), ...stir("B1"), { type: "conclude", targetId: "cuso4-5pct", vesselId: "B1", now: t(8) },
  ]);
  assert.ok(concluded.conclusions["cuso4-5pct"]);
  const changed = run(pour([5000], "B1"), concluded);
  assert.deepEqual(changed.conclusions, {});
  assert.deepEqual(benchReducer(concluded, { type: "reset", now: t(9) }).conclusions, {});
});

test("the cylinder shows a reading to 1 mL and the beaker only a rough level", () => {
  const state = run(pour([25_000, 10_000, 10_000, 1000, 1000, 500], "G1"));
  assert.equal(volumeLabel(fl11Config, state.current.bench.vessels.G1), "48 mL");
  const beaker = run(pour([25_000, 10_000, 10_000, 1000, 1000, 500], "B1"));
  assert.equal(volumeLabel(fl11Config, beaker.current.bench.vessels.B1), "khoảng 50 mL");
});

test("the spatula amount is clamped to a whole number of milligrams", () => {
  const low = benchReducer(initialBenchState(fl11Config), { type: "set_powder", milligrams: 0 });
  const high = benchReducer(initialBenchState(fl11Config), { type: "set_powder", milligrams: 1e9 });
  const odd = benchReducer(initialBenchState(fl11Config), { type: "set_powder", milligrams: 12.6 });
  assert.deepEqual([low.powderMilligrams, high.powderMilligrams, odd.powderMilligrams], [1, 50_000, 13]);
});
