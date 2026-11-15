// Run: npx tsx --test src/features/labs/physics/mechanics/explore/lever-explore.test.ts (plain node cannot resolve @nexalab/sim subpaths).
import test from "node:test";
import assert from "node:assert/strict";
import type { LeverLabConfig } from "@nexalab/sim/mechanics";
import { listLeverKitItems } from "./kit-items.ts";
import { appendLeverEntry, describeLeverAction, describeLeverChange, formatMoment } from "./lever-log.ts";

// tsx cannot read named exports of the sim TS package (kit-items.test.ts fails the same way), so the test builds the
// fields listLeverKitItems reads; they match FL06_LEVER_EXPLORE_CONFIG, whose validity the sim golden test covers.
const config = {
  enabledApparatus: [
    { id: "bar", kind: "lever_bar", slot: "bench", labelVi: "Thanh đòn" },
    { id: "weights", kind: "weight_set", slot: "tray", labelVi: "Bộ quả nặng" },
    { id: "gauge", kind: "spring_gauge", slot: "hook", labelVi: "Lực kế" },
  ],
  weights: { availableMilliNewtons: [500, 1000, 2000], maxCount: 4 },
} as unknown as LeverLabConfig;
const weight = (positionMillimetres: number, forceMilliNewtons = 1000) => ({ kind: "WEIGHT" as const, positionMillimetres, forceMilliNewtons });
const gauge = (positionMillimetres: number, forceMilliNewtons: number) => ({ kind: "GAUGE" as const, positionMillimetres, forceMilliNewtons });

test("listLeverKitItems returns exactly the enabled apparatus", () => {
  assert.deepEqual(listLeverKitItems(config).map((item) => [item.id, item.category]), [["bar", "apparatus"], ["weights", "apparatus"], ["gauge", "instrument"]]);
  assert.match(listLeverKitItems(config)[1].purposeVi, /Tối đa 4 quả: 0,5 N, 1,0 N, 2,0 N/);
  const noGauge = { ...config, enabledApparatus: config.enabledApparatus.filter((item) => item.kind !== "spring_gauge") };
  assert.deepEqual(listLeverKitItems(noGauge).map((item) => item.id), ["bar", "weights"]);
});

test("describeLeverAction names what the learner did", () => {
  assert.deepEqual(describeLeverAction([], [weight(-100)]), { actionVi: "Treo quả nặng 1,0 N ở lỗ -100 mm" });
  assert.deepEqual(describeLeverAction([weight(0)], []), { actionVi: "Tháo quả nặng 1,0 N ở điểm tựa O" });
  assert.deepEqual(describeLeverAction([gauge(200, 400)], [gauge(200, 500)]), { actionVi: "Chỉnh lực kế ở lỗ 200 mm thành 0,5 N", merge: "GAUGE@200" });
  assert.equal(describeLeverAction([weight(-100)], [weight(-100)]), null);
});

test("describeLeverChange reports the bar, then the side whose moment moved", () => {
  assert.deepEqual(describeLeverChange({ tilt: "LEVEL", leftMomentNmm: 0, rightMomentNmm: 0 }, { tilt: "TILT_LEFT", leftMomentNmm: 100_000, rightMomentNmm: 0 }), ["Thanh chuyển từ nằm ngang sang nghiêng trái"]);
  assert.deepEqual(describeLeverChange({ tilt: "TILT_LEFT", leftMomentNmm: 100_000, rightMomentNmm: 0 }, { tilt: "TILT_LEFT", leftMomentNmm: 200_000, rightMomentNmm: 0 }), ["Thanh vẫn nghiêng trái; moment bên trái tăng"]);
});

test("repeated gauge adjustments fold into one notebook line", () => {
  const line = (merge?: string) => ({ at: 1, actionVi: "x", merge, phenomenaVi: [], readings: { leftMomentNmm: 0, rightMomentNmm: 0 }, attachments: [] });
  const log = appendLeverEntry(appendLeverEntry(appendLeverEntry([], line()), line("GAUGE@200")), line("GAUGE@200"));
  assert.deepEqual(log.map((entry) => entry.seq), [1, 2]);
  assert.equal(formatMoment(100_000), "0,1 N·m");
});
