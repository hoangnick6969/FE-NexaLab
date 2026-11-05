const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

function loadStandalone(relative) {
  const filename = path.join(root, relative);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(output, filename);
  return mod.exports;
}

test("moving circuit evidence out of the scene preserves defaults and readiness", () => {
  const bulb = loadStandalone("src/features/labs/physics/electricity/circuit-bulb-evidence.ts");
  const draft = bulb.defaultBulbEvidence();
  assert.deepEqual(draft.checkpoints.map((item) => [item.id, bulb.switchClosed(item), item.prediction]), [
    ["CLOSED", false, null], ["OPEN", true, null],
  ]);
  assert.equal(bulb.bulbEvidenceReady(draft), false);
  assert.equal(bulb.bulbEvidenceReady(null), false);
  draft.checkpoints[0].prediction = "ON";
  draft.checkpoints[0].state = bulb.circuit(true);
  draft.checkpoints[1].prediction = "OFF";
  draft.checkpoints[1].state = bulb.circuit(false);
  draft.explanation = "A";
  assert.equal(bulb.bulbEvidenceReady(draft), true);
  assert.equal(bulb.phaseOf(draft), "ready");
  draft.checkpoints[1].state = bulb.circuit(true);
  assert.equal(bulb.bulbEvidenceReady(draft), false);
  const circuit = loadStandalone("src/features/labs/physics/electricity/circuit-state.ts");
  assert.deepEqual(circuit.defaultCircuit().nodes.map((node) => node.id), ["b1", "r1", "l1", "s1"]);
  assert.deepEqual(circuit.defaultCircuit().edges, []);
});

test("lab route and registries do not eagerly import WebGL or scene editor packages", () => {
  const visited = new Set();
  const heavy = /^(three|@react-three\/fiber|@react-three\/drei|@xyflow\/react)(\/|$)/;
  function visit(filename, chain = []) {
    if (visited.has(filename)) return;
    visited.add(filename);
    const source = ts.createSourceFile(filename, fs.readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true);
    for (const node of source.statements) {
      if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) continue;
      if (node.isTypeOnly || (ts.isImportDeclaration(node) && node.importClause?.isTypeOnly)) continue;
      const bindings = ts.isImportDeclaration(node) ? node.importClause?.namedBindings : node.exportClause;
      if (bindings && ts.isNamedImports(bindings) && bindings.elements.every((item) => item.isTypeOnly)) continue;
      if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) continue;
      const specifier = node.moduleSpecifier.text;
      const nextChain = [...chain, path.relative(root, filename)];
      assert.equal(heavy.test(specifier), false, `${nextChain.join(" -> ")} -> ${specifier}`);
      if (!specifier.startsWith(".") || /\.(css|webp|svg|png|jpg)$/.test(specifier)) continue;
      const base = path.resolve(path.dirname(filename), specifier);
      const target = [base + ".ts", base + ".tsx", path.join(base, "index.ts"), path.join(base, "index.tsx")].find(fs.existsSync);
      if (target) visit(target, nextChain);
    }
  }
  for (const file of ["Lab.tsx", "runtime/activity-renderers.tsx", "runtime/checkpoint-views.tsx"])
    visit(path.join(root, "src/features/labs", file));
});
