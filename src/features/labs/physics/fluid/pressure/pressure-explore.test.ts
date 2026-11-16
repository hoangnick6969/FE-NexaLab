// Run: npx tsx --test src/features/labs/physics/fluid/pressure/pressure-explore.test.ts (plain node cannot resolve @nexalab/sim subpaths).
import test from "node:test";
import assert from "node:assert/strict";
import type { FluidLabConfig } from "@nexalab/sim/fluid";
import { listFluidKitItems } from "./kit-items.ts";
import { appendPressureEntry, describePistonAction, describePistonChange, describeProbeAction, describeProbeChange, type ProbeReading } from "./pressure-log.ts";

// Same fields as FL04_PRESSURE_EXPLORE_CONFIG (the sim golden test validates that copy); tsx cannot read the sim's named exports.
const config = {
  depthProbe: { tankHeightMm: 300, waterLevelMm: 280, maxDepthMm: 250, depthStepMm: 10, sideHoleOffsetMm: 30, positionsMm: [-100, -50, 0, 50, 100] },
  pistons: { areasMm2: [2000, 1000], weightMilliNewtons: 1000, weightCount: 12, maxPerPan: 6 },
  enabledApparatus: [
    { id: "tank", kind: "tall_tank", slot: "bench", labelVi: "Bể nước trong suốt" },
    { id: "probe", kind: "membrane_probe", slot: "tank", labelVi: "Bình trụ có màng cao su" },
    { id: "pistons", kind: "piston_pair", slot: "bench", labelVi: "Hai xi lanh thông nhau" },
    { id: "weights", kind: "weight_set", slot: "tray", labelVi: "Bộ quả nặng 1 N" },
  ],
} as unknown as FluidLabConfig;
const probe = (depthMm: number, positionMm: number, C: number, A: number): ProbeReading => ({ depthMm, positionMm, levels: { A, B: A, C }, pascals: { A: Math.max(0, depthMm - 30) * 10, C: depthMm * 10 } });

test("listFluidKitItems returns exactly the enabled apparatus with their settings", () => {
  const items = listFluidKitItems(config);
  assert.deepEqual(items.map((item) => [item.id, item.category]), [["tank", "apparatus"], ["probe", "instrument"], ["pistons", "apparatus"], ["weights", "apparatus"]]);
  assert.match(items[2].purposeVi, /gấp đôi/);
  assert.match(items[3].purposeVi, /12 quả giống nhau, mỗi quả 1,0 N; tối đa 6 quả mỗi đĩa/);
  const pistonsOnly = { ...config, depthProbe: undefined, enabledApparatus: config.enabledApparatus.slice(2) } as FluidLabConfig;
  assert.deepEqual(listFluidKitItems(pistonsOnly).map((item) => item.id), ["pistons", "weights"]);
});

test("describeProbeAction and describeProbeChange follow the SGK questions", () => {
  assert.equal(describeProbeAction(probe(20, 0, 1, 0), probe(100, 0, 2, 2)), "Hạ bình trụ tới độ sâu 100 mm (giữa bể)");
  assert.equal(describeProbeAction(probe(100, 0, 2, 2), probe(100, -100, 2, 2)), "Dời bình trụ sang lệch trái 100 mm, giữ độ sâu 100 mm");
  assert.equal(describeProbeAction(probe(100, 0, 2, 2), probe(100, 0, 2, 2)), null);
  assert.deepEqual(describeProbeChange(probe(20, 0, 1, 0), probe(100, 0, 2, 2)), ["Sâu hơn: các màng lõm vào nhiều hơn", "Màng C lõm mức 2, màng A lõm mức 2, màng B lõm mức 2"]);
  assert.deepEqual(describeProbeChange(probe(100, 0, 2, 2), probe(100, 50, 2, 2)), ["Cùng độ sâu: các màng biến dạng như trước", "Màng C lõm mức 2, màng A lõm mức 2, màng B lõm mức 2"]);
  assert.match(describeProbeChange(probe(20, 0, 1, 0), probe(100, 0, 2, 2), true)[1], /C: 1\.000 Pa, A và B: 700 Pa/);
});

test("piston lines name the pan and the outcome", () => {
  const before = { pan1: 3, pan2: 2, outcome: "piston2_down" as const, pascals: [1500, 2000] as [number, number] };
  const after = { pan1: 4, pan2: 2, outcome: "balanced" as const, pascals: [2000, 2000] as [number, number] };
  assert.equal(describePistonAction(before, after, "1,0 N"), "Đặt thêm một quả nặng 1,0 N lên đĩa (1): còn 4 quả");
  assert.deepEqual(describePistonChange(after), ["Hai pit-tông cân bằng", "Đĩa (1) 4 quả, đĩa (2) 2 quả"]);
});

test("a slider drag folds into one notebook line", () => {
  const line = (merge?: string) => ({ at: 1, station: "depth-probe" as const, actionVi: "x", merge, phenomenaVi: [] });
  const log = appendPressureEntry(appendPressureEntry(appendPressureEntry([], line()), line("probe-drag")), line("probe-drag"));
  assert.deepEqual(log.map((entry) => entry.seq), [1, 2]);
});
