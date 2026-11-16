// Run: npx tsx --test src/features/labs/chemistry/wet-bench/kit/fl-14-bench.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { validateChemistryLabConfig } from "@nexalab/sim/wet-bench";
import { fl14bConfig } from "../labs/fl-14b.config.ts";
import { fl14cConfig } from "../labs/fl-14c.config.ts";
import { benchReducer, initialBenchState, type BenchAction, type BenchUiState } from "./bench-reducer.ts";
import { listWetBenchKitItems } from "./kit-items.ts";

const run = (config: typeof fl14bConfig, actions: BenchAction[]) => actions.reduce(benchReducer, initialBenchState(config));
const dropper = (microliters: number): BenchAction[] => [{ type: "hold", held: { kind: "tool", tool: "dropper", apparatusId: "dropper" } }, { type: "preset", microliters }];
const drop = (reagentId: string, vesselId: string): BenchAction[] => [{ type: "click_bottle", reagentId, now: 1 }, { type: "click_vessel", vesselId, now: 2 }];
const spoon = (reagentId: string, vesselId: string): BenchAction[] => [
  { type: "hold", held: { kind: "tool", tool: "spatula", apparatusId: "spoon" } }, { type: "click_bottle", reagentId, now: 1 }, { type: "click_vessel", vesselId, now: 2 }, { type: "release" },
];
const last = (state: BenchUiState) => state.log.at(-1)?.phenomenaVi.join(" ") ?? "";

test("both configs are valid, draft, and list their bottles as materials", () => {
  for (const config of [fl14bConfig, fl14cConfig]) {
    const result = validateChemistryLabConfig(config);
    assert.ok(result.ok, result.ok ? "" : result.errors.join("; "));
    assert.equal(config.review.status, "draft");
    assert.equal(config.modes.guided, undefined);
  }
  assert.deepEqual(listWetBenchKitItems(fl14bConfig).filter((item) => item.category === "material").map((item) => item.id), fl14bConfig.availableReagents.map((item) => item.reagentId));
  assert.deepEqual(listWetBenchKitItems(fl14cConfig).filter((item) => item.category === "material").map((item) => item.id), fl14cConfig.availableReagents.map((item) => item.reagentId));
});

test("FL-14b: a student mixes carbonate with acid and silver nitrate with salt, and sees gas and a white precipitate", () => {
  const state = run(fl14bConfig, [...dropper(1000), ...drop("Na2CO3_0_1M", "T1"), ...drop("HCl_0_1M", "T1"), ...drop("AgNO3_0_1M", "T2"), ...drop("NaCl_0_1M", "T2")]);
  assert.equal(state.banner, null);
  assert.deepEqual(state.current.bench.vessels.T2.precipitates, { AgCl: 100_000 });
  assert.equal(state.current.bench.vessels.T1.dissolved.NaCl, 100_000);
  assert.ok(state.log.some((entry) => entry.phenomenaVi.includes("Xuất hiện kết tủa màu trắng")));
  assert.ok(state.log.some((entry) => entry.reactions.includes("gas.na2co3-hcl")));
});

test("FL-14b: an unreviewed pair is refused with an explanation instead of being guessed", () => {
  const state = run(fl14bConfig, [...dropper(1000), ...drop("Na2CO3_0_1M", "T1"), ...drop("AgNO3_0_1M", "T1")]);
  assert.deepEqual(state.current.bench.vessels.T1.precipitates, {});
  assert.match(state.banner?.textVi ?? "", /ngoài phạm vi mô hình của bài thực hành FL-14b/);
  assert.match(last(state), /Không thực hiện/);
});

test("FL-14c: CuO dissolves in sulfuric acid and turns it blue, MgO next to NaOH does nothing", () => {
  const acid = run(fl14cConfig, [...dropper(1000), ...drop("H2SO4_0_1M", "T1"), { type: "release" }, ...spoon("CuO_powder", "T1")]);
  // 1 mL of 0,1 M acid is 0,1 mmol: the acid limits and 0,025 mmol of the 0,125 mmol spoonful is left.
  assert.equal(acid.current.bench.vessels.T1.dissolved.CuSO4, 100_000);
  assert.equal(acid.banner, null);
  assert.equal(last(acid), "Chất rắn tan một phần, phần còn lại nằm dưới đáy, dung dịch chuyển sang màu xanh lam");
  assert.ok(acid.log.some((entry) => entry.reactions.includes("oxide-acid.cuo-h2so4")));
  const base = run(fl14cConfig, [...dropper(1000), ...drop("NaOH_0_1M", "T2"), { type: "release" }, ...spoon("MgO_powder", "T2")]);
  assert.equal(base.current.bench.vessels.T2.dissolved.MgCl2, undefined);
  assert.equal(base.banner, null);
});
