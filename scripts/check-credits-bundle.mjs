// TAI5-T5 bundle isolation check. Run after `vite build` (npm run test:credits-bundle does both).
// It proves on the emitted files that the AI credit screens (teacher estimate, job credits, balance and history, nav entry)
// and the admin credits panel are in chunks that the entry chunk and the student class chunk never import statically, and
// that no chunk a student or a parent downloads on first load carries their copy or API paths. The teacher class chunk
// shares code with the student class chunk (class resources), so the credit code is loaded on demand from it.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "..", "dist");
const assets = path.join(root, "assets");
const chunks = new Map(readdirSync(assets).filter((f) => f.endsWith(".js")).map((f) => [f, readFileSync(path.join(assets, f), "utf8")]));

// Strings that only the teacher credit screens contain (both languages), their API paths, and the admin panel.
const TEACHER_MARKERS = ["Lịch sử tín dụng AI", "AI credit history", "/me/credits", "ai-jobs/estimate", "Giữ trước cho một yêu cầu AI", "Held for an AI request"];
const ADMIN_MARKERS = ["/admin/credits/accounts", "Chỉ quản trị viên cấp hoặc điều chỉnh tín dụng", "Only an administrator grants or adjusts credits"];
// A string that only the student class screens contain.
const STUDENT_MARKERS = ["Nội dung theo môn học"];

const holding = (markers) => [...chunks].filter(([, text]) => markers.some((m) => text.includes(m))).map(([name]) => name);
const teacherChunks = holding(TEACHER_MARKERS);
const adminChunks = holding(ADMIN_MARKERS);
const studentChunks = holding(STUDENT_MARKERS);
assert.ok(teacherChunks.length >= 1, "the teacher credit copy was not found in any chunk: the markers or the build changed");
assert.ok(adminChunks.length >= 1, "the admin credits panel was not found in any chunk: the markers or the build changed");
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
for (const [label, group] of [["teacher credit", teacherChunks], ["admin credits", adminChunks]]) {
  for (const chunk of group) {
    assert.ok(!entryClosure.has(chunk), `${chunk} holds ${label} code but the entry chunk imports it statically`);
    assert.ok(!studentClosure.has(chunk), `${chunk} holds ${label} code but a student class chunk imports it statically`);
    assert.ok(!studentChunks.includes(chunk), `${chunk} holds both the ${label} code and the student class screens`);
  }
}
// Stronger: nothing a student or parent loads up front mentions the credit screens or their routes.
for (const chunk of new Set([...entryClosure, ...studentClosure])) {
  const text = chunks.get(chunk) ?? "";
  for (const marker of [...TEACHER_MARKERS, ...ADMIN_MARKERS]) assert.ok(!text.includes(marker), `${chunk} (entry or student closure) contains the credit marker "${marker}"`);
}
console.log(`teacher credit code is in: ${teacherChunks.join(", ")}`);
console.log(`admin credits panel is in: ${adminChunks.join(", ")}`);
console.log(`student class screens are in: ${studentChunks.join(", ")}`);
console.log(`entry chunk(s): ${entry.join(", ")}`);
console.log("Bundle isolation passed: the AI credit code is not in the entry or student class closure.");
