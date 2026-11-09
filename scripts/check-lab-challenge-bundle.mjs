// TAI6-T4 bundle isolation check. Run after `vite build` (npm run test:lab-challenge-bundle does both).
// It proves on the emitted files that the AI lab-challenge panel (teacher request form, proposal cards, engine results,
// its API paths and its copy in both languages) lives in a chunk that the entry chunk and the student lesson/class chunks
// never import statically, and that no chunk a student or a parent downloads on first load carries its copy or API paths.
// The teacher lesson editor shares the lessons chunk with the student lesson hub, so the panel is loaded on demand from it.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "..", "dist");
const assets = path.join(root, "assets");
const chunks = new Map(readdirSync(assets).filter((f) => f.endsWith(".js")).map((f) => [f, readFileSync(path.join(assets, f), "utf8")]));

// Strings that only the lab-challenge panel contains (both languages) and its API path.
const PANEL_MARKERS = ["Gợi ý thử thách bằng AI", "Suggest a challenge with AI", "purpose=DRAFT_LAB_CHALLENGE", "Câu mục tiêu học sinh sẽ thấy", "Objective sentence students will see"];
// A string that only the student lesson hub contains.
const STUDENT_MARKERS = ["Bài học được giao", "Assigned lessons"];

const holding = (markers) => [...chunks].filter(([, text]) => markers.some((m) => text.includes(m))).map(([name]) => name);
const panelChunks = holding(PANEL_MARKERS);
assert.ok(panelChunks.length >= 1, "the lab-challenge panel copy was not found in any chunk: the markers or the build changed");
for (const marker of PANEL_MARKERS) assert.ok(holding([marker]).length >= 1, `marker "${marker}" is in no chunk: the copy or the build changed`);
const studentChunks = holding(STUDENT_MARKERS);
assert.ok(studentChunks.length >= 1, "the student lesson hub chunk was not found: the marker changed");

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
for (const chunk of panelChunks) {
  assert.ok(!entryClosure.has(chunk), `${chunk} holds the lab-challenge panel but the entry chunk imports it statically`);
  assert.ok(!studentClosure.has(chunk), `${chunk} holds the lab-challenge panel but a student lesson chunk imports it statically`);
  assert.ok(!studentChunks.includes(chunk), `${chunk} holds both the lab-challenge panel and the student lesson hub`);
}
// Stronger: nothing a student or parent loads up front mentions the panel, its copy or its API path.
for (const chunk of new Set([...entryClosure, ...studentClosure])) {
  const text = chunks.get(chunk) ?? "";
  for (const marker of PANEL_MARKERS) assert.ok(!text.includes(marker), `${chunk} (entry or student closure) contains the lab-challenge marker "${marker}"`);
  assert.ok(!text.includes("DRAFT_LAB_CHALLENGE"), `${chunk} (entry or student closure) names the DRAFT_LAB_CHALLENGE purpose`);
}
console.log(`lab-challenge panel is in: ${panelChunks.join(", ")}`);
console.log(`student lesson hub is in: ${studentChunks.join(", ")}`);
console.log(`entry chunk(s): ${entry.join(", ")}`);
console.log("Bundle isolation passed: the AI lab-challenge code is not in the entry or student lesson closure.");
