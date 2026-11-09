import test from "node:test";
import assert from "node:assert/strict";
import { segmentsOf } from "./similarity-spans.ts";

const joined = (segments: Array<{ text: string }>) => segments.map((s) => s.text).join("");

test("marks the matched ranges and keeps the original text intact", () => {
  const text = "Dòng điện chạy qua dây tóc làm dây nóng lên";
  const segments = segmentsOf(text, [{ start: 10, end: 22 }, { start: 31, end: 43 }]);
  assert.equal(joined(segments), text);
  assert.deepEqual(segments.filter((s) => s.marked).map((s) => s.text), [text.slice(10, 22), text.slice(31, 43)]);
});

test("sorts, merges touching or overlapping spans and clamps to the text", () => {
  const text = "abcdefghij";
  const segments = segmentsOf(text, [{ start: 6, end: 99 }, { start: 2, end: 4 }, { start: 4, end: 5 }, { start: -3, end: 1 }]);
  assert.equal(joined(segments), text);
  assert.deepEqual(segments, [
    { text: "a", marked: true },
    { text: "b", marked: false },
    { text: "cde", marked: true },
    { text: "f", marked: false },
    { text: "ghij", marked: true },
  ]);
});

test("ignores empty and inverted spans and handles empty text", () => {
  assert.deepEqual(segmentsOf("", [{ start: 0, end: 3 }]), []);
  assert.deepEqual(segmentsOf("abc", [{ start: 2, end: 2 }, { start: 3, end: 1 }]), [{ text: "abc", marked: false }]);
});

test("offsets in decomposed (NFD) text map to the original string, not the normalized one", () => {
  const nfd = "Điện trở lớn".normalize("NFD");
  const start = nfd.indexOf("trở".normalize("NFD"));
  const segments = segmentsOf(nfd, [{ start, end: start + "trở".normalize("NFD").length }]);
  assert.equal(joined(segments), nfd);
  assert.equal(segments.find((s) => s.marked)?.text.normalize("NFC"), "trở");
});
