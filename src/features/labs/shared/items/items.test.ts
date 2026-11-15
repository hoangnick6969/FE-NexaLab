// Run: npx tsx --test src/features/labs/shared/items/items.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { SHARED_ITEM_META } from "./catalog.ts";
import { CYLINDER_DEFAULT_SIZE, cylinderAnchors, cylinderInnerHeight, cylinderMarkHeights, STOPWATCH_ANCHORS, THERMOMETER_DEFAULT_LENGTH, thermometerAnchors, thermometerScaleHeight } from "./item-layout.ts";

test("every catalogued item has an id that matches its key and Vietnamese text", () => {
  for (const [id, meta] of Object.entries(SHARED_ITEM_META)) {
    assert.equal(meta.id, id);
    assert.ok(meta.labelVi.length > 0 && meta.purposeVi.length > 0);
  }
});

test("K2-3.3 items are in the catalogue as instruments", () => {
  for (const id of ["graduated-cylinder", "thermometer", "stopwatch"] as const) assert.equal(SHARED_ITEM_META[id].category, "instrument");
  assert.ok(SHARED_ITEM_META.thermometer.safetyVi);
});

test("graduated cylinder: marks are even, end at full scale and stay below the rim", () => {
  const size = CYLINDER_DEFAULT_SIZE;
  const marks = cylinderMarkHeights(size, 10);
  const { inside, mouth } = cylinderAnchors(size);
  assert.equal(marks.length, 10);
  assert.ok(Math.abs(marks[9] - (inside[1] + cylinderInnerHeight(size))) < 1e-9);
  assert.ok(marks[9] < mouth[1]);
  const gaps = marks.slice(1).map((y, i) => y - marks[i]);
  for (const gap of gaps) assert.ok(Math.abs(gap - gaps[0]) < 1e-9);
  assert.deepEqual(cylinderMarkHeights(size, 0), []);
});

test("graduated cylinder: anchors follow the size", () => {
  const tall = cylinderAnchors({ radius: 0.04, height: 0.8 });
  assert.deepEqual(tall.base, [0, 0, 0]);
  assert.equal(tall.mouth[1], 0.8);
  assert.ok(tall.inside[1] > 0 && tall.inside[1] < tall.mouth[1]);
});

test("thermometer: bulb at the origin, full scale below the top", () => {
  const anchors = thermometerAnchors();
  assert.deepEqual(anchors.bulb, [0, 0, 0]);
  assert.equal(anchors.top[1], THERMOMETER_DEFAULT_LENGTH);
  assert.ok(thermometerScaleHeight() < anchors.top[1]);
  assert.ok(anchors.display[1] > anchors.top[1]);
  assert.equal(thermometerAnchors(1).top[1], 1);
});

test("stopwatch: display and button sit on top of the body", () => {
  assert.ok(STOPWATCH_ANCHORS.display[1] > STOPWATCH_ANCHORS.base[1]);
  assert.ok(STOPWATCH_ANCHORS.button[1] > STOPWATCH_ANCHORS.base[1]);
});
