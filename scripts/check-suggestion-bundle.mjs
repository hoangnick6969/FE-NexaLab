// TAI2-T6 bundle isolation check. Run after `vite build` (npm run test:suggestion-bundle does both).
// It proves on the emitted files that the teacher AI suggestion code is in a chunk that neither the entry chunk nor the
// student class chunk imports statically, so a student or a parent never downloads it.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "..", "dist");
const assets = path.join(root, "assets");
const chunks = new Map(readdirSync(assets).filter((f) => f.endsWith(".js")).map((f) => [f, readFileSync(path.join(assets, f), "utf8")]));

// Strings that only the AI suggestion UI contains, in both languages, plus the request route.
const SUGGESTION_MARKERS = ["AI không đưa ra gợi ý hợp lệ", "The AI gave no valid suggestion", "/ai-assessments"];
// A string that only the student class screens contain.
const STUDENT_MARKERS = ["Nội dung theo môn học"];

const holding = (markers) => [...chunks].filter(([, text]) => markers.some((m) => text.includes(m))).map(([name]) => name);
const suggestionChunks = holding(SUGGESTION_MARKERS);
const studentChunks = holding(STUDENT_MARKERS);
assert.ok(suggestionChunks.length >= 1, "the suggestion copy was not found in any chunk: the markers or the build changed");
assert.ok(studentChunks.length >= 1, "the student class chunk was not found: the marker changed");

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
for (const chunk of suggestionChunks) {
  assert.ok(!entryClosure.has(chunk), `${chunk} holds AI suggestion code but the entry chunk imports it statically`);
  assert.ok(!studentClosure.has(chunk), `${chunk} holds AI suggestion code but a student class chunk imports it statically`);
  assert.ok(!studentChunks.includes(chunk), `${chunk} holds both the AI suggestion code and the student class screens`);
}
console.log(`AI suggestion code is in: ${suggestionChunks.join(", ")}`);
console.log(`student class screens are in: ${studentChunks.join(", ")}`);
console.log(`entry chunk(s): ${entry.join(", ")}`);
console.log("Bundle isolation passed: the AI suggestion code is not in the entry or student class closure.");
