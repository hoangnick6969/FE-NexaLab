import assert from "node:assert/strict";
import test from "node:test";
import { renderLessonMath, repairLessonHtml } from "./lesson-html-format.ts";

test("turns pipe rows split across paragraphs into one table", () => {
  const html = repairLessonHtml("<p>Bảng 37.1</p><p>| Tính trạng | Dạng hạt</p><p>| $P_{tc}$ | Trơn × Nhăn</p><p>| Tỉ lệ | 2,96 : 1</p><p>Quan sát</p>");
  assert.match(html, /<p>Bảng 37.1<\/p>/);
  assert.match(html, /<thead><tr><th>Tính trạng<\/th><th>Dạng hạt<\/th><\/tr><\/thead>/);
  assert.equal((html.match(/<tr>/g) ?? []).length, 3);
  assert.match(html, /<td>\$P_\{tc\}\$<\/td>/);
  assert.match(html, /<p>Quan sát<\/p>$/);
});

test("turns pipe rows joined by <br> and drops separator rows", () => {
  const html = repairLessonHtml("<p>| A | B |<br>| --- | --- |<br/>| 1 | 2 |</p>");
  assert.equal(html, '<div class="lesson-table-scroll"><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table></div>');
});

test("turns escaped and square bullets into a list without touching negative numbers", () => {
  const html = repairLessonHtml("<p>Tiến hành:</p><p>\\- Kéo vật nặng.</p><p>\\- So sánh độ cao.</p><p>■ Cơ năng là tổng.</p><p>-5 °C là nhiệt độ.</p>");
  assert.equal(html, "<p>Tiến hành:</p>\n<ul><li>Kéo vật nặng.</li><li>So sánh độ cao.</li><li>Cơ năng là tổng.</li></ul>\n<p>-5 °C là nhiệt độ.</p>");
});

test("keeps ordinary multi-line paragraphs intact", () => {
  assert.equal(repairLessonHtml("<section><h2>I - Cơ năng</h2><p>Dòng một<br>Dòng hai</p></section>"), "<section><h2>I - Cơ năng</h2><p>Dòng một<br>Dòng hai</p></section>");
});

test("renders inline and display formulas with KaTeX", () => {
  const html = renderLessonMath("<p>$W_{c} = \\frac{1}{2}mvˆ{2} + Ph$</p><p>$$x &lt; 1$$</p><p>Trong đó: W$_{c}$ là cơ năng.</p>");
  assert.equal((html.match(/class="katex"/g) ?? []).length, 3);
  assert.equal((html.match(/class="katex-display"/g) ?? []).length, 1);
  assert.ok(!html.includes("$"));
  assert.ok(html.includes("<msup>"), "the OCR caret becomes a superscript");
  assert.ok(!html.includes("katex-error"));
});

test("leaves text without formulas unchanged", () => {
  assert.equal(renderLessonMath("<p>Giá 5 nghìn đồng.</p>"), "<p>Giá 5 nghìn đồng.</p>");
});
