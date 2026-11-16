// Run: npx tsx --test src/features/labs/class-explore/class-explore.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { answerValue, assignmentStorageKey, formatMeasure, formatTenthsPh, parseMeasureInput, parseMomentInput, parsePhInput } from "./class-explore.ts";

test("a pH is read with a comma or a point, one decimal at most, from 0 to 14", () => {
  for (const [raw, tenths] of [["7", 70], ["7,0", 70], ["7.0", 70], [" 2,9 ", 29], ["0", 0], ["0,0", 0], ["13,5", 135], ["14", 140], ["14,0", 140], ["01", 10]] as const)
    assert.deepEqual(parsePhInput(raw), { ok: true, tenths }, raw);
});

test("anything else is refused: empty, text, negative, too many decimals, above 14, thousands", () => {
  for (const raw of ["", " ", "abc", "-1", "7,05", "2,95", "14,1", "15", "99", "100", "1,", ",5", "1e1", "1 0", "7,0,1"])
    assert.deepEqual(parsePhInput(raw), { ok: false }, JSON.stringify(raw));
});

test("a stored value is shown the way the bench shows it", () => {
  assert.equal(formatTenthsPh(10), "1,0");
  assert.equal(formatTenthsPh(29), "2,9");
  assert.equal(formatTenthsPh(0), "0,0");
  assert.equal(formatTenthsPh(140), "14,0");
  assert.equal(parsePhInput(formatTenthsPh(135)).ok && (parsePhInput(formatTenthsPh(135)) as { tenths: number }).tenths, 135);
});

test("the notebook of an assignment never shares a key with the library bench", () => {
  assert.equal(assignmentStorageKey("acid-base-indicators", "a1"), "acid-base-indicators@assignment:a1");
  assert.notEqual(assignmentStorageKey("acid-base-indicators", "a1"), assignmentStorageKey("acid-base-indicators", "a2"));
});

test("a moment is read in N·m with a comma or a point, three decimals at most, and kept in mN·m", () => {
  for (const [raw, value] of [["0,150", 150], ["0.15", 150], ["0,1", 100], ["1", 1000], ["0,025", 25], ["100", 100_000], [" 2,5 ", 2500]] as const)
    assert.deepEqual(parseMomentInput(raw), { ok: true, value }, raw);
  for (const raw of ["", "-0,1", "0,1505", "100,001", "1000", "abc", "0,", ",5"]) assert.deepEqual(parseMomentInput(raw), { ok: false }, JSON.stringify(raw));
});

test("values are shown and read by their unit, and rows saved as tenthsPh still read", () => {
  assert.equal(formatMeasure("milliNewtonMetres", 150), "0,150");
  assert.equal(formatMeasure("tenthsPh", 70), "7,0");
  assert.deepEqual(parseMeasureInput("tenthsPh", "7,0"), { ok: true, value: 70 });
  assert.deepEqual(parseMeasureInput("milliNewtonMetres", "0,150"), { ok: true, value: 150 });
  assert.equal(answerValue({ itemId: "HCl_0_1M", tenthsPh: 10 }), 10);
  assert.equal(answerValue({ itemId: "moment-left", value: 150 }), 150);
});
