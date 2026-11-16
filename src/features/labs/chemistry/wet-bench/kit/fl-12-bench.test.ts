// Run: npx tsx --test src/features/labs/chemistry/wet-bench/kit/fl-12-bench.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readGasVolume, validateChemistryLabConfig } from "@nexalab/sim/wet-bench";
import { fl12Config } from "../labs/fl-12.config.ts";
import { benchReducer, initialBenchState, type BenchAction, type BenchUiState } from "./bench-reducer.ts";
import { listWetBenchKitItems } from "./kit-items.ts";
import { formatClock } from "./observation-log.ts";

const run = (actions: BenchAction[], start: BenchUiState = initialBenchState(fl12Config)) => actions.reduce(benchReducer, start);
const stopFlask = (vesselId: string): BenchAction[] => [{ type: "hold", held: { kind: "tool", tool: "stopper", apparatusId: "stopper" } }, { type: "click_vessel", vesselId, now: 1 }];
const chips = (vessels: string[]): BenchAction[] => [
  { type: "hold", held: { kind: "tool", tool: "tongs", apparatusId: "tongs" } }, { type: "click_bottle", reagentId: "CaCO3_chips", now: 2 },
  ...vessels.map((vesselId): BenchAction => ({ type: "click_vessel", vesselId, now: 3 })), { type: "release" },
];
const powder = (vesselId: string): BenchAction[] => [
  { type: "hold", held: { kind: "tool", tool: "spatula", apparatusId: "spoon" } }, { type: "click_bottle", reagentId: "CaCO3_powder", now: 2 },
  { type: "click_vessel", vesselId, now: 3 }, { type: "release" },
];
const wait = (seconds: number): BenchAction => ({ type: "wait", seconds, now: 4 });
const gas = (state: BenchUiState, id: string) => {
  const reading = readGasVolume(state.current.bench.vessels[id]);
  return reading.ok ? reading.tenthsMilliliters : null;
};

test("the FL-12 config is valid and lists the shared stopwatch and thermometer as shared items", () => {
  const result = validateChemistryLabConfig(fl12Config);
  assert.ok(result.ok, result.ok ? "" : result.errors.join("; "));
  const items = listWetBenchKitItems(fl12Config);
  const shared = Object.fromEntries(items.filter((item) => item.sharedItemId).map((item) => [item.rendererKey, item.sharedItemId]));
  assert.deepEqual(shared, { stopwatch: "stopwatch", thermometer: "thermometer" });
  // Two on the shelf (limestone as chips and as powder) and the two acids that start in the flasks.
  assert.deepEqual(items.filter((item) => item.category === "material").map((item) => item.id), ["CaCO3_chips", "CaCO3_powder", "HCl_0_1M", "HCl_0_2M"]);
});

test("nothing happens until time passes, then the 0,2 M flask collects about twice the gas and the powder far more", () => {
  const ready = run([...stopFlask("F1"), ...stopFlask("F2"), ...stopFlask("F3"), ...chips(["F1", "F2"]), ...powder("F3")]);
  assert.equal(gas(ready, "F1"), 0);
  const later = run([wait(30)], ready);
  assert.deepEqual([gas(later, "F1"), gas(later, "F2"), gas(later, "F3")], [23, 46, 133]);
  assert.match(later.log.at(-1)?.phenomenaVi.join(" ") ?? "", /Bình 2 \(HCl 0,2 M\): sủi bọt .*khí thu được 4,6 mL/);
  assert.deepEqual(later.current.series.map((sample) => sample.t), [0, 30]);
  assert.deepEqual(later.current.series.at(-1)?.volumes, { F1: 23, F2: 46, F3: 133 });
});

test("an open flask loses the gas and says so", () => {
  const state = run([...chips(["F1"]), wait(30)]);
  assert.equal(gas(state, "F1"), null);
  assert.match(state.log.at(-1)?.phenomenaVi.join(" ") ?? "", /khí thoát ra ngoài/);
});

test("the stopwatch only counts while it runs; undo and reset bring time back", () => {
  const base = run([...stopFlask("F1"), ...chips(["F1"])]);
  const started = run([{ type: "clock", action: "start", now: 5 }, wait(10), { type: "clock", action: "stop", now: 6 }, wait(20)], base);
  assert.equal(formatClock(started.current.bench.clock!.seconds), "00:10");
  assert.equal(started.current.bench.elapsedSeconds, 30);
  const undone = benchReducer(started, { type: "undo", now: 7 });
  assert.equal(undone.current.bench.elapsedSeconds, 10);
  const reset = benchReducer(started, { type: "reset", now: 8 });
  assert.equal(reset.current.bench.elapsedSeconds ?? 0, 0);
  assert.deepEqual(reset.current.series, [{ t: 0, volumes: {} }]);
});

test("time stops at the limit with a clear message and no change", () => {
  const state = run([...stopFlask("F1"), ...chips(["F1"]), wait(600)]);
  const over = benchReducer(state, wait(5));
  assert.match(over.notice?.textVi ?? "", /giới hạn thời gian/);
  assert.equal(over.current.bench.elapsedSeconds, 600);
});
