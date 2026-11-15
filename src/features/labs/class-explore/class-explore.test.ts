// Run: npx tsx --test src/features/labs/class-explore/class-explore.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { assignmentStorageKey, formatTenthsPh, parsePhInput } from "./class-explore.ts";

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
