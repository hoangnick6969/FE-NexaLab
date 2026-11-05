import assert from "node:assert/strict";
import test from "node:test";
import { groupLabOutcomes, markMissingFigureReferences, normalizeLessonMarkdown, stripRepeatedSectionHeading } from "./lesson-content-format.ts";

test("separates procedure labels and inline instruction bullets", () => {
  assert.equal(
    normalizeLessonMarkdown("Đọc nội dung. Chuẩn bị: cốc, nước. - Rót nước vào cốc."),
    "Đọc nội dung.\n\nChuẩn bị: cốc, nước.\n- Rót nước vào cốc.",
  );
});

test("keeps ordinary hyphenated science text intact", () => {
  assert.equal(normalizeLessonMarkdown("Phân tử nước - oxygen hóa."), "Phân tử nước - oxygen hóa.");
});

test("strips a repeated section title even when the heading has a number", () => {
  assert.equal(
    stripRepeatedSectionHeading("Khái niệm hệ sinh thái Hệ sinh thái là một hệ thống.", "1. Khái niệm hệ sinh thái"),
    "Hệ sinh thái là một hệ thống.",
  );
});

test("does not strip a title that is only the prefix of another word", () => {
  assert.equal(stripRepeatedSectionHeading("Sinh vật học", "Sinh vật"), "Sinh vật học");
});

test("keeps Lab outcomes to three readable bullets without losing their text", () => {
  assert.deepEqual(groupLabOutcomes("Phân biệt; Dựng chuỗi; Tính năng lượng; Dự đoán; Nhận ra."), [
    "Phân biệt",
    "Dựng chuỗi",
    "Tính năng lượng; Dự đoán; Nhận ra",
  ]);
});

test("marks figure references when no embedded image is present", () => {
  assert.equal(markMissingFigureReferences("Quan sát Hình 44.5."), "Quan sát (Hình 44.5 — chưa có ảnh minh họa).");
  assert.equal(markMissingFigureReferences("![Hình 44.5](figure.png)"), "![Hình 44.5](figure.png)");
});
