// TAI4-T7 bundle isolation check. Run after `vite build` (npm run test:insights-bundle does both).
// It proves on the emitted files that the teacher insight code is in a chunk that neither the entry chunk nor the student
// class chunk imports statically, so a student or a parent never downloads it.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "..", "dist");
const assets = path.join(root, "assets");
const chunks = new Map(readdirSync(assets).filter((f) => f.endsWith(".js")).map((f) => [f, readFileSync(path.join(assets, f), "utf8")]));

// Strings that only the teacher insight screens contain, in both languages.
const INSIGHT_MARKERS = ["Các gợi ý chỉ là lý do", "Insights are only a reason", "Gợi ý hỗ trợ học sinh", "Student support insights", "Xem xét nội dung tương đồng", "Review similar content"];
// A string that only the student class screens contain.
const STUDENT_MARKERS = ["Nội dung theo môn học"];

const holding = (markers) => [...chunks].filter(([, text]) => markers.some((m) => text.includes(m))).map(([name]) => name);
const insightChunks = holding(INSIGHT_MARKERS);
const studentChunks = holding(STUDENT_MARKERS);
assert.ok(insightChunks.length >= 1, "the insight copy was not found in any chunk: the markers or the build changed");
assert.ok(studentChunks.length >= 1, "the student class chunk was not found: the marker changed");

// Static import graph (dynamic import() calls are not edges: they are loaded only on demand).
const staticImports = (name) => {
  const text = chunks.get(name) ?? "";
  return [...text.matchAll(/(?:\bfrom|\bimport)\s*["']\.\/([^"']+\.js)["']/g)].map((m) => m[1]).filter((f) => chunks.has(f));
};
const closure = (starts) => {
  const seen = new Set();
  const stack = [...starts];
  while (stack.length) {
    const next = stack.pop();
    if (seen.has(next)) continue;
    seen.add(next);
    stack.push(...staticImports(next));
  }
  return seen;
};
const html = readFileSync(path.join(root, "index.html"), "utf8");
const entry = [...html.matchAll(/(?:src|href)="\/assets\/([^"]+\.js)"/g)].map((m) => m[1]).filter((f) => chunks.has(f));
assert.ok(entry.length >= 1, "no entry chunk found in dist/index.html");

const entryClosure = closure(entry);
const studentClosure = closure(studentChunks);
for (const chunk of insightChunks) {
  assert.ok(!entryClosure.has(chunk), `${chunk} holds teacher insight code but the entry chunk imports it statically`);
  assert.ok(!studentClosure.has(chunk), `${chunk} holds teacher insight code but a student class chunk imports it statically`);
  assert.ok(!studentChunks.includes(chunk), `${chunk} holds both the teacher insight code and the student class screens`);
}
// The insight code is reached only on demand.
const dynamicLoaders = [...chunks].filter(([name, text]) => !insightChunks.includes(name) && insightChunks.some((c) => text.includes(`./${c}`))).map(([name]) => name);
console.log(`insight code is in: ${insightChunks.join(", ")}`);
console.log(`student class screens are in: ${studentChunks.join(", ")}`);
console.log(`entry chunk(s): ${entry.join(", ")}`);
console.log(`chunks that reference the insight chunk (dynamic loads only): ${dynamicLoaders.join(", ") || "none"}`);
console.log("Bundle isolation passed: the insight code is not in the entry or student class closure.");
