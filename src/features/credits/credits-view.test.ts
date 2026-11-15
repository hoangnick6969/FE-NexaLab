import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { confirmState, confirmedCreditsOf, historyAmount, isShort, jobCreditSummary, signed } from "./credits-view.ts";

const estimate = (patch: Record<string, unknown> = {}) => ({ enabled: true, credits: 12, pricingVersion: 1, available: 100, ...patch }) as never;

test("signed always shows the direction of a credit movement", () => {
  assert.equal(signed(12), "+12");
  assert.equal(signed(-7), "-7");
  assert.equal(signed(0), "0");
});

test("the confirm control is loading until the estimate is known, off when credits are disabled, short when the balance is low", () => {
  assert.equal(confirmState(undefined), "loading");
  assert.equal(confirmState(estimate({ enabled: false, credits: 0, available: 0 })), "off");
  assert.equal(confirmState(estimate()), "ready");
  assert.equal(confirmState(estimate({ available: 12 })), "ready");
  assert.equal(confirmState(estimate({ available: 11 })), "short");
  assert.equal(isShort(undefined), false);
  assert.equal(isShort(estimate({ enabled: false, available: 0 })), false);
});

test("confirmedCredits is sent only while credits are enabled, and it is the estimate the teacher saw", () => {
  assert.equal(confirmedCreditsOf(undefined), undefined);
  assert.equal(confirmedCreditsOf(estimate({ enabled: false })), undefined);
  assert.equal(confirmedCreditsOf(estimate({ credits: 7 })), 7);
});

test("a job's credit state reads as reserved, settled with the part returned, or refunded in full", () => {
  assert.equal(jobCreditSummary(null), null);
  assert.equal(jobCreditSummary(undefined), null);
  assert.deepEqual(jobCreditSummary({ estimated: 12, state: "reserved", charged: null, refunded: null }), { kind: "reserved", amount: 12 });
  assert.deepEqual(jobCreditSummary({ estimated: 12, state: "settled", charged: 7, refunded: 5 }), { kind: "settled", charged: 7, returned: 5 });
  assert.deepEqual(jobCreditSummary({ estimated: 12, state: "refunded", charged: 0, refunded: 12 }), { kind: "refunded", amount: 12 });
});

test("history rows show the charge for a settlement and the signed effect otherwise", () => {
  assert.deepEqual(historyAmount({ kind: "SETTLE", credits: 5, charged: 7 }), { label: "charge", text: "7" });
  assert.deepEqual(historyAmount({ kind: "RESERVE", credits: -12, charged: null }), { label: "delta", text: "-12" });
  assert.deepEqual(historyAmount({ kind: "REFUND", credits: 12, charged: null }), { label: "delta", text: "+12" });
  assert.deepEqual(historyAmount({ kind: "GRANT", credits: 100, charged: null }), { label: "delta", text: "+100" });
});

test("only teacher and admin screens reference the credit modules; student, parent and shared shell code never import them statically", () => {
  const root = path.resolve(import.meta.dirname, "../..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) files.push(full);
    }
  };
  walk(root);
  const rel = (f: string) => path.relative(root, f).split(path.sep).join("/");
  const importsCredits = (f: string, kind: "static" | "dynamic") => {
    const text = readFileSync(f, "utf8");
    const staticImport = /(?:^|\n)\s*import\s[^;]*from\s+["'][^"']*\/credits\//.test(text);
    const dynamicImport = /import\(\s*["'][^"']*credits\//.test(text);
    return kind === "static" ? staticImport : dynamicImport;
  };
  // Static importers outside the credits folder are limited to teacher/admin screens (types and pure helpers only).
  const allowedStatic = new Set(["features/admin/AdminCreditsPanel.tsx"]);
  for (const file of files) {
    const r = rel(file);
    if (r.startsWith("features/credits/")) continue;
    if (importsCredits(file, "static")) assert.ok(allowedStatic.has(r), `${r} imports the credit modules statically`);
  }
  // Teacher screens that show credits load them on demand, so the shared class chunk and the entry chunk stay free of them.
  const lazyLoaders = files.filter((f) => importsCredits(f, "dynamic")).map(rel).sort();
  assert.deepEqual(lazyLoaders, ["app/App.tsx", "features/ai-usage/TeacherAiUsageSettings.tsx", "features/classes/ExamAiPanel.tsx", "features/classes/TeacherAiPanel.tsx", "features/classes/WrittenAiSuggestion.tsx", "features/lab-challenge/LabChallengePanel.tsx"]);
  const studentFiles = files.filter((f) => /StudentClasses|[\\/]dashboard[\\/]|[\\/]progress[\\/]|[\\/]lessons[\\/]|[\\/]assignments[\\/]|[\\/]parents?[\\/]/.test(f));
  for (const file of studentFiles) assert.ok(!/features\/credits|\/me\/credits|confirmedCredits|ai-jobs\/estimate/.test(readFileSync(file, "utf8")), `${rel(file)} mentions credits`);
});

test("credit copy never names tokens, providers or models and keeps neutral wording", () => {
  const dir = path.resolve(import.meta.dirname);
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".tsx"))) {
    const copy = readFileSync(path.join(dir, name), "utf8").toLowerCase();
    for (const word of ["token", "gemini", "provider", "model", "nhà cung cấp"]) assert.ok(!copy.includes(word), `${name} contains "${word}"`);
  }
});
