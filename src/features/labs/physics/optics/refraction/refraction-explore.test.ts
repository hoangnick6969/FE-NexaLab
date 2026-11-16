// Run: npx tsx --test src/features/labs/physics/optics/refraction/refraction-explore.test.ts (plain node cannot resolve @nexalab/sim subpaths).
import test from "node:test";
import assert from "node:assert/strict";
import type { RefractionLabConfig } from "@nexalab/sim/optics";
import { listRefractionKitItems } from "./kit-items.ts";
import {
  appendRefractionEntry, describeRay, describeRayChange, describeReading, formatAngle, formatIndex, formatRatio, formatSpeed, parseAngle, rayGeometry, type RayView,
} from "./refraction-log.ts";

// Same fields as FL23_REFRACTION_EXPLORE_CONFIG (the sim golden test validates that copy); tsx cannot read the sim's named exports.
const config = {
  media: [{ id: "glass", labelVi: "Thuỷ tinh", indexMilli: 1500 }, { id: "water", labelVi: "Nước", indexMilli: 1333 }],
  intoBlock: { maxIncidenceDeg: 80, maxReadings: 6 },
  display: { sineColumns: false },
  enabledApparatus: [
    { id: "laser", kind: "light_source", slot: "disk", labelVi: "Đèn laser" },
    { id: "disk", kind: "protractor_disk", slot: "bench" },
    { id: "block", kind: "half_cylinder", slot: "disk" },
    { id: "table", kind: "measurement_table", slot: "panel" },
    { id: "speed", kind: "speed_card", slot: "panel" },
  ],
} as unknown as RefractionLabConfig;

// G-02 (air to glass, 30°) and G-07 (glass to air, 42°: total) as the bench builds them.
const into: RayView = { station: "into-block", mediumId: "glass", mediumVi: "Thuỷ tinh", indexMilli: 1500, incidenceDeg: 30, refractionDeg: 19.471, reflectance: 0.045, criticalDeg: 41.81 };
const out = (incidenceDeg: number, refractionDeg: number | null): RayView => ({ ...into, station: "out-of-block", incidenceDeg, refractionDeg, reflectance: refractionDeg === null ? 1 : 0.2 });

test("kit items follow the enabled apparatus and read the media from the config", () => {
  const items = listRefractionKitItems(config);
  assert.deepEqual(items.map((item) => item.id), ["laser", "disk", "block", "table", "speed"]);
  assert.equal(items[0].labelVi, "Đèn laser");
  assert.equal(items[2].labelVi, "Khối bán trụ");
  assert.match(items[2].purposeVi, /thuỷ tinh \(n = 1,50\), nước \(n = 1,333\)/);
  assert.match(items[3].purposeVi, /tối đa 6 cặp góc.*em tự tính/);
});

test("formats angles, indices, speeds and ratios the way SGK writes them", () => {
  assert.equal(formatAngle(19.471), "19,5°");
  assert.equal(formatAngle(30), "30°");
  assert.equal(formatIndex(1500), "1,50");
  assert.equal(formatIndex(1333), "1,333");
  assert.equal(formatSpeed(200_000), "200.000 km/s");
  assert.equal(formatSpeed(225_056.26), "≈ 225.000 km/s");
  assert.equal(formatRatio(1.5001), "1,50");
});

test("describes refraction, normal incidence and total internal reflection", () => {
  assert.equal(describeRay(into), "Tia sáng từ không khí sang thuỷ tinh, góc tới 30°, góc khúc xạ 19,5°");
  assert.equal(describeRay(out(42, null)), "Tia sáng từ thuỷ tinh sang không khí, góc tới 42°: phản xạ toàn phần, không có tia khúc xạ");
  assert.deepEqual(describeRayChange({ ...into, incidenceDeg: 20 }, into), ["Góc khúc xạ nhỏ hơn góc tới: tia khúc xạ lệch lại gần pháp tuyến"]);
  assert.deepEqual(describeRayChange(into, { ...into, incidenceDeg: 0, refractionDeg: 0 }), ["Tia tới vuông góc với mặt phân cách: tia sáng đi thẳng, không bị lệch"]);
  assert.deepEqual(describeRayChange(out(30, 48.6), out(41, 79.8)), ["Góc khúc xạ lớn hơn góc tới: tia khúc xạ lệch xa pháp tuyến", "Tia khúc xạ mờ dần, tia phản xạ sáng dần"]);
  assert.deepEqual(describeRayChange(out(41, 79.8), out(42, null)), ["Tia khúc xạ biến mất: phản xạ toàn phần, tia phản xạ sáng rõ"]);
  assert.deepEqual(describeRayChange(out(42, null), out(43, null)), ["Vẫn phản xạ toàn phần: chỉ còn tia phản xạ"]);
});

test("a table line hides the sines unless the config shows them", () => {
  assert.deepEqual(describeReading(into, false), ["Ghi vào bảng: Thuỷ tinh, i = 30°, r = 19,5°"]);
  assert.match(describeReading(into, true)[1], /sin i = 0,500, sin r = 0,333, sin i \/ sin r = 1,50/);
  assert.deepEqual(describeReading(out(42, null), true), []);
});

test("parses a typed critical angle", () => {
  assert.equal(parseAngle("42"), 42);
  assert.equal(parseAngle("41,8°"), 41.8);
  assert.equal(parseAngle(""), null);
  assert.ok(Number.isNaN(parseAngle("abc")));
});

test("ray geometry: station 1 lights from the upper left into the lower half, station 2 the other way", () => {
  const g1 = rayGeometry({ station: "into-block", incidenceDeg: 30, refractionDeg: 19.471 }, 0, 0, 100);
  assert.ok(g1.incident.x < 0 && g1.incident.y < 0, "incident in the air, upper left");
  assert.ok(g1.reflected.x > 0 && g1.reflected.y < 0, "reflected in the air, upper right");
  assert.ok(g1.refracted!.x > 0 && g1.refracted!.y > 0, "refracted in the block, lower right");
  assert.ok(Math.abs(g1.incident.x + 50) < 1e-9 && Math.abs(g1.reflected.x - 50) < 1e-9, "law of reflection: mirror image about the normal");
  const g2 = rayGeometry({ station: "out-of-block", incidenceDeg: 42, refractionDeg: null }, 0, 0, 100);
  assert.ok(g2.incident.y > 0 && g2.reflected.y > 0);
  assert.equal(g2.refracted, null);
  const normal = rayGeometry({ station: "into-block", incidenceDeg: 0, refractionDeg: 0 }, 0, 0, 100);
  assert.ok(Math.abs(normal.refracted!.x) < 1e-9 && normal.refracted!.y === 100, "normal incidence goes straight down");
});

test("angle changes fold into one notebook line", () => {
  const entry = { at: 1, station: "into-block" as const, actionVi: "a", phenomenaVi: [], merge: "angle-into-block-glass" };
  let log = appendRefractionEntry([], entry);
  log = appendRefractionEntry(log, { ...entry, actionVi: "b" });
  assert.equal(log.length, 1);
  assert.equal(log[0].actionVi, "b");
  log = appendRefractionEntry(log, { ...entry, merge: "angle-into-block-water" });
  assert.deepEqual(log.map((item) => item.seq), [1, 2]);
});
