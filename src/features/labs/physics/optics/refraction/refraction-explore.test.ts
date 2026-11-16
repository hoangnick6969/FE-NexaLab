// Run: npx tsx --test src/features/labs/physics/optics/refraction/refraction-explore.test.ts (plain node cannot resolve @nexalab/sim subpaths).
import test from "node:test";
import assert from "node:assert/strict";
import type { RefractionLabConfig } from "@nexalab/sim/optics";
import { listRefractionKitItems } from "./kit-items.ts";
import {
  appendRefractionEntry, describePrism, describePrismPath, describeRay, describeRayChange, describeReading, formatAngle, formatIndex, formatRatio, formatSpeed, parseAngle,
  prismAnswer, prismGeometry, rayGeometry, type PrismPath, type PrismView, type RayView,
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

// Same formula as the sim's tracePrism (tsx cannot read the sim's named exports).
const RAD = Math.PI / 180;
function trace(nMilli: number, apex: number, i1: number): PrismPath {
  const r1 = Math.asin(Math.sin(i1 * RAD) * 1000 / nMilli) / RAD;
  const r2 = apex - r1;
  const s = nMilli * Math.sin(r2 * RAD) / 1000;
  if (s > 1) return { kind: "total", firstRefractionDeg: r1, secondIncidenceDeg: r2 };
  const i2 = Math.asin(s) / RAD;
  return { kind: "exits", firstRefractionDeg: r1, secondIncidenceDeg: r2, exitDeg: i2, deviationDeg: i1 + i2 - apex };
}
const SPECTRUM = [["red", "Đỏ", 1513], ["orange", "Cam", 1517], ["yellow", "Vàng", 1519], ["green", "Lục", 1523], ["blue", "Lam", 1528], ["indigo", "Chàm", 1532], ["violet", "Tím", 1538]] as const;
const prismView = (i1: number, light: "laser" | "white" = "laser"): PrismView => ({
  incidenceDeg: i1, apexDeg: 60, mediumVi: "Thuỷ tinh", indexMilli: 1500, light, laser: trace(1500, 60, i1),
  spectrum: light === "white" ? SPECTRUM.map(([id, labelVi, n]) => ({ id, labelVi, indexMilli: n, path: trace(n, 60, i1) })) : [],
});
const angleBetween = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y))))) / RAD;

test("prism geometry agrees with D = i₁ + i₂ − A and bends the ray towards the base", () => {
  for (const i1 of [35, 40, 48.59, 60, 80]) {
    const g = prismGeometry(60, i1, [1500], 0, 0, 190, 300);
    const ray = g.rays[0];
    assert.ok(ray.exit && ray.out, `exits at ${i1}°`);
    const expected = trace(1500, 60, i1);
    assert.equal(expected.kind, "exits");
    if (expected.kind !== "exits") continue;
    assert.ok(Math.abs(angleBetween(g.incident, ray.out!) - expected.deviationDeg) < 1e-6, `D at ${i1}°`);
    // Towards the base (screen y grows downwards): the exit ray points further down than the incident ray.
    assert.ok(ray.out!.y > g.incident.y, `towards the base at ${i1}°`);
    assert.ok(Math.abs(angleBetween(g.incident, { x: -g.n1.x, y: -g.n1.y }) - i1) < 1e-6, "angle of incidence on the first face");
  }
  assert.equal(prismGeometry(60, 25, [1500], 0, 0, 190, 300).rays[0].out, null, "P-05: no exit ray at 25°");
});

test("white light: violet lands lowest on the screen, red highest", () => {
  const g = prismGeometry(60, 50, SPECTRUM.map(([, , n]) => n), 0, 0, 190, 300);
  const ys = g.rays.map((ray) => g.toScreen(ray.exit!, ray.out!).y);
  for (let k = 1; k < ys.length; k++) assert.ok(ys[k] > ys[k - 1], "each colour lands below the previous one");
});

test("prism lines: hidden path before the prediction, then the two refractions, deviation and colours", () => {
  assert.equal(describePrism(prismView(40), false), "Tia sáng laser tới lăng kính thuỷ tinh (A = 60°), góc tới 40°; đường truyền đang ẩn để em dự đoán");
  assert.equal(describePrism(prismView(40), true), "Tia sáng laser tới lăng kính thuỷ tinh (A = 60°), góc tới 40°, tia ló 58,5°, góc lệch D = 38,5°");
  assert.deepEqual(describePrismPath(prismView(40)), ["Khúc xạ hai lần: r₁ = 25,4°, r₂ = 34,6°, tia ló i₂ = 58,5°", "Tia ló lệch về phía đáy lăng kính, góc lệch D = 38,5°"]);
  assert.match(describePrismPath(prismView(50, "white"))[2], /^Trên màn từ trên xuống: đỏ, cam, vàng, lục, lam, chàm, tím; tím lệch nhiều nhất, đỏ lệch ít nhất$/);
  assert.equal(prismAnswer(prismView(40)), "base");
  assert.equal(prismAnswer({ ...prismView(40), laser: trace(1500, 60, 25) }), null);
});
