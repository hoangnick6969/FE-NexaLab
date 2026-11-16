// Run: npx tsx --test src/features/labs/physics/mechanics/energy/energy-explore.test.ts (plain node cannot resolve @nexalab/sim subpaths).
import test from "node:test";
import assert from "node:assert/strict";
import type { EnergyLabConfig } from "@nexalab/sim/mechanics/energy";
import { listEnergyKitItems } from "./kit-items.ts";
import {
  appendEnergyEntry, describeLift, describeLiftAction, describePendulumAction, describePendulumChange, formatJoules, formatNewtons, formatSeconds, formatWatts,
  matchesValue, pendulumAngle, type LiftView, type PendulumView,
} from "./energy-log.ts";

// Same fields as FL24_ENERGY_EXPLORE_CONFIG (the sim golden test validates that copy); tsx cannot read the sim's named exports.
const config = {
  pendulum: { massesG: [100, 200, 300, 400, 500], lengthMm: 600, maxDropHeightMm: 300, heightStepMm: 10 },
  hoist: { massesG: [200, 500, 1000, 2000], minDistanceMm: 100, maxDistanceMm: 1000, distanceStepMm: 100, motors: [{ id: "slow", labelVi: "Động cơ chậm", speedMmPerS: 125 }, { id: "fast", labelVi: "Động cơ nhanh", speedMmPerS: 250 }] },
  display: { energyReadings: false },
  enabledApparatus: [
    { id: "pendulum", kind: "pendulum", slot: "bench", labelVi: "Con lắc đơn" },
    { id: "bars", kind: "energy_bars", slot: "board" },
    { id: "hoist", kind: "hoist", slot: "bench" },
    { id: "clock", kind: "stopwatch", slot: "tray" },
  ],
} as unknown as EnergyLabConfig;

// G-01..G-03 values (m 200 g, h₀ 300 mm).
const at = (position: PendulumView["position"], heightMm: number, potentialMj: number): PendulumView => ({ massG: 200, dropHeightMm: 300, position, heightMm, potentialMj, kineticMj: 600 - potentialMj, mechanicalMj: 600 });
const release = at("release", 300, 600);
const mid = at("mid-down", 150, 300);
const lowest = at("lowest", 0, 0);
const far = at("far-high", 300, 600);
// G-06/G-07: 1 000 g lifted 500 mm.
const slow: LiftView = { massG: 1000, distanceMm: 500, motorId: "slow", motorVi: "Động cơ chậm", forceMilliNewtons: 10000, durationMs: 4000, workMj: 5000, powerMw: 1250 };

test("kit items follow the enabled apparatus, keyed by kind, and the stopwatch is the shared item", () => {
  const items = listEnergyKitItems(config);
  assert.deepEqual(items.map((item) => item.id), ["pendulum", "bars", "hoist", "clock"]);
  assert.equal(items[0].labelVi, "Con lắc đơn");
  assert.match(items[0].purposeVi, /600 mm.*100 g, 200 g/);
  assert.equal(items[1].labelVi, "Thanh năng lượng");
  assert.match(items[1].purposeVi, /tự tính/);
  assert.match(items[2].purposeVi, /1 kg, 2 kg.*động cơ chậm và động cơ nhanh/);
  assert.equal(items[3].sharedItemId, "stopwatch");
});

test("formats SGK units from the integer model (mJ → J, mW → W, mN → N, ms → s)", () => {
  assert.equal(formatJoules(600), "0,6 J");
  assert.equal(formatJoules(5000), "5 J");
  assert.equal(formatWatts(1250), "1,25 W");
  assert.equal(formatNewtons(10000), "10 N");
  assert.equal(formatSeconds(4000), "4 s");
});

test("pendulum lines describe the energy transfer and hide numbers unless energyReadings is on", () => {
  assert.equal(describePendulumAction(release, mid), "Xem con lắc ở giữa đường đi xuống (độ cao 150 mm)");
  assert.deepEqual(describePendulumChange(release, mid), ["Đi xuống: thế năng giảm, động năng tăng; cơ năng không đổi", "Thế năng và động năng bằng nhau"]);
  assert.deepEqual(describePendulumChange(mid, lowest), ["Đi xuống: thế năng giảm, động năng tăng; cơ năng không đổi", "Ở điểm thấp nhất động năng lớn nhất, thế năng bằng 0"]);
  assert.match(describePendulumChange(lowest, far)[1], /lên tới đúng 300 mm/);
  assert.doesNotMatch(describePendulumChange(release, lowest).join(" "), /J/);
  assert.match(describePendulumChange(release, lowest, true)[1], /Wt 0 J, Wđ 0,6 J, W 0,6 J/);
  const heavier = { ...release, massG: 400, potentialMj: 1200, mechanicalMj: 1200 };
  assert.equal(describePendulumAction(release, heavier), "Đổi quả nặng thành 400 g, thả từ độ cao 300 mm");
  assert.equal(describePendulumChange(release, heavier)[0], "Cơ năng lớn hơn trước");
});

test("hoist lines show the instruments, and work and power only once checked", () => {
  assert.equal(describeLiftAction(slow), "Tời kéo vật 1000 g lên 500 mm bằng động cơ chậm");
  assert.deepEqual(describeLift(slow, false), ["Lực kế 10 N, quãng đường 0,5 m, thời gian 4 s"]);
  assert.equal(describeLift(slow, true)[1], "Công A = 5 J, công suất P = 1,25 W");
});

test("matches a typed answer to the displayed precision", () => {
  assert.equal(matchesValue("5", 5000), true);
  assert.equal(matchesValue("1,25", 1250), true);
  assert.equal(matchesValue("2,5", 1250), false);
  assert.equal(matchesValue("", 1250), null);
  assert.equal(matchesValue("abc", 1250), false);
});

test("the pendulum angle mirrors the release height on the far side", () => {
  assert.equal(pendulumAngle(600, 0, "lowest"), 0);
  assert.ok(Math.abs(pendulumAngle(600, 300, "release") + Math.PI / 3) < 1e-9);
  assert.equal(pendulumAngle(600, 300, "far-high"), -pendulumAngle(600, 300, "release"));
});

test("slider drags fold into one notebook line", () => {
  const entry = { at: 1, station: "pendulum" as const, actionVi: "a", phenomenaVi: [], merge: "drop-drag" };
  let log = appendEnergyEntry([], entry);
  log = appendEnergyEntry(log, { ...entry, actionVi: "b" });
  assert.equal(log.length, 1);
  assert.equal(log[0].actionVi, "b");
  log = appendEnergyEntry(log, { ...entry, merge: undefined });
  assert.deepEqual(log.map((item) => item.seq), [1, 2]);
});
