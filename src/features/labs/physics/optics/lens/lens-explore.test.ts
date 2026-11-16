// Run: npx tsx --test src/features/labs/physics/optics/lens/lens-explore.test.ts (plain node cannot resolve @nexalab/sim subpaths).
import test from "node:test";
import assert from "node:assert/strict";
import type { LensLabConfig } from "@nexalab/sim/optics/lens";
import { listLensKitItems } from "./kit-items.ts";
import { appendLensEntry, describeImage, formatMm, formatPower, meetPoint, parseMm, specialRays, type ImageView } from "./lens-log.ts";

// Same formula as the sim's imageOf (tsx cannot read the sim's named exports).
function imageOf(f: number, d: number, h: number): ImageView {
  if (d === f) return { kind: "none" };
  const dp = (d * f) / (d - f);
  const k = -dp / d;
  return { kind: "image", distanceMm: dp, magnification: k, heightMm: k * h, real: dp > 0, upright: k > 0, size: Math.abs(Math.abs(k) - 1) < 1e-6 ? "equal" : Math.abs(k) > 1 ? "larger" : "smaller" };
}

test("any two special rays meet exactly at the image of the formula, real or virtual, converging or diverging", () => {
  for (const f of [100, 150, -100]) {
    for (const d of [30, 50, 80, 150, 200, 300, 400]) {
      if (d === f) continue;
      const image = imageOf(f, d, 20);
      assert.equal(image.kind, "image");
      if (image.kind !== "image") continue;
      const [parallel, centre, focus] = specialRays(f, d, 20);
      for (const [a, b] of [[parallel, centre], [parallel, focus], [centre, focus]] as const) {
        const meet = meetPoint(a, b);
        assert.ok(meet, `rays meet for f ${f}, d ${d}`);
        assert.ok(Math.abs(meet!.x - image.distanceMm) < 1e-6 && Math.abs(meet!.y - image.heightMm) < 1e-6, `B′ at (d′, h′) for f ${f}, d ${d}, ${a.id}+${b.id}`);
      }
    }
  }
});

test("L-04: with the object on F the focus ray does not exist and the other two leave parallel", () => {
  const [parallel, centre, focus] = specialRays(100, 100, 20);
  assert.equal(focus.out, null);
  assert.equal(meetPoint(parallel, centre), null);
});

test("describes the image the way SGK does", () => {
  assert.equal(describeImage(imageOf(100, 300, 20)), "ảnh thật, ngược chiều, nhỏ hơn vật");
  assert.equal(describeImage(imageOf(100, 200, 20)), "ảnh thật, ngược chiều, bằng vật");
  assert.equal(describeImage(imageOf(100, 50, 20)), "ảnh ảo, cùng chiều, lớn hơn vật");
  assert.equal(describeImage(imageOf(-100, 200, 20)), "ảnh ảo, cùng chiều, nhỏ hơn vật");
  assert.equal(describeImage({ kind: "none" }), "không có ảnh: các tia ló song song với nhau");
});

test("formats lengths and magnifying power, parses typed lengths", () => {
  assert.equal(formatMm(150), "150 mm");
  assert.equal(formatMm(66.6667), "66,7 mm");
  assert.equal(formatPower(2.5), "2,5×");
  assert.equal(parseMm("150"), 150);
  assert.equal(parseMm("66,7 mm"), 66.7);
  assert.equal(parseMm(""), null);
  assert.ok(Number.isNaN(parseMm("abc")));
});

test("kit items follow the config: lens set without the magnifier, magnifier powers", () => {
  const config = {
    lenses: [
      { id: "converging-100", labelVi: "Thấu kính hội tụ f = 100 mm", focalMm: 100 },
      { id: "diverging-100", labelVi: "Thấu kính phân kì f = 100 mm", focalMm: -100 },
      { id: "loupe-50", labelVi: "Kính lúp f = 50 mm", focalMm: 50 },
    ],
    rays: { lensIds: ["converging-100", "diverging-100"] },
    image: { lensIds: ["converging-100"], objectHeightMm: 20 },
    magnifier: { lensIds: ["loupe-50"] },
    enabledApparatus: [{ id: "lens", kind: "lens", slot: "bench" }, { id: "loupe", kind: "magnifier", slot: "tray" }, { id: "grid", kind: "grid", slot: "board" }],
  } as unknown as LensLabConfig;
  const items = listLensKitItems(config);
  assert.equal(items[0].purposeVi, "Bộ thấu kính: thấu kính hội tụ f = 100 mm, thấu kính phân kì f = 100 mm.");
  assert.match(items[1].purposeVi, /kính lúp f = 50 mm \(5×\)/);
  assert.match(items[2].purposeVi, /10 mm/);
});

test("slider moves fold into one notebook line", () => {
  const entry = { at: 1, station: "image" as const, actionVi: "a", phenomenaVi: [], merge: "image-converging-100" };
  let log = appendLensEntry([], entry);
  log = appendLensEntry(log, { ...entry, actionVi: "b" });
  assert.equal(log.length, 1);
  log = appendLensEntry(log, { ...entry, merge: "image-diverging-100" });
  assert.deepEqual(log.map((item) => item.seq), [1, 2]);
});
