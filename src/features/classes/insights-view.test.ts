import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { insightMessages } from "./insights-copy.ts";
import {
  ackBody, ackErrorKind, ackLabel, evidencePath, insightCopy, isHandled, noteLength, noteTooLong, NOTE_MAX, partitionStudents, similarityAssignmentId, statusTone, withSimilarityTarget,
  type InsightItem, type StudentInsights,
} from "./insights-view.ts";

const insight = (ruleCode: string, extra: Partial<InsightItem> = {}): InsightItem => ({
  fingerprint: ruleCode.toLowerCase().padEnd(64, "0"), ruleVersion: "insights@1", ruleCode, status: "INFORMATIONAL", studentId: "s", message: "msg từ máy chủ",
  thresholds: {}, values: {}, evidence: [], computedAt: "2026-11-07T00:00:00.000Z", ...extra,
});
const student = (id: string, name: string, ...codes: string[]): StudentInsights => ({ studentId: id, displayName: name, insights: codes.map((c) => insight(c, { studentId: id })) });

test("the main list keeps the API order, drops students without insights and never re-sorts", () => {
  const students = [student("s3", "Chi", "SCORE_CHANGE_UNUSUAL"), student("s1", "An"), student("s2", "Bình", "HIGH_HINT_DEPENDENCE"), student("s0", "Anh", "SCORE_CHANGE_UNUSUAL")];
  const { main } = partitionStudents(students);
  assert.deepEqual(main.map((s) => s.studentId), ["s3", "s2", "s0"]);
});

test("students with too few scored items go to the collapsed group in API order, and carry no count of their own", () => {
  const students = [student("s1", "An", "INSUFFICIENT_EVIDENCE"), student("s2", "Bình", "SCORE_CHANGE_UNUSUAL"), student("s3", "Chi", "INSUFFICIENT_EVIDENCE", "HIGH_HINT_DEPENDENCE")];
  const { main, insufficient } = partitionStudents(students);
  assert.deepEqual(insufficient, [{ studentId: "s1", displayName: "An" }, { studentId: "s3", displayName: "Chi" }]);
  assert.deepEqual(main.map((s) => s.studentId), ["s2", "s3"]);
  assert.deepEqual(main[1]!.insights.map((i) => i.ruleCode), ["HIGH_HINT_DEPENDENCE"]);
  for (const entry of insufficient) assert.deepEqual(Object.keys(entry).sort(), ["displayName", "studentId"]);
  for (const entry of main) assert.deepEqual(Object.keys(entry).sort(), ["displayName", "insights", "studentId"]);
});

test("an empty class and a class of only handled-out students give empty groups", () => {
  assert.deepEqual(partitionStudents([]), { main: [], insufficient: [] });
  assert.deepEqual(partitionStudents([student("s1", "An")]), { main: [], insufficient: [] });
});

test("status tones are neutral: never the passed, partial, not-passed or gold tones", () => {
  for (const status of ["INFORMATIONAL", "NEEDS_MORE_EVIDENCE", "TEACHER_REVIEW_RECOMMENDED", "SOMETHING_NEW"])
    assert.ok(!["passed", "partial", "not_passed", "gold", "danger", "success"].includes(statusTone(status)), status);
});

test("evidence opens the existing B2 detail routes for quiz and practical, and not for TEST", () => {
  assert.equal(evidencePath("c 1", "s/1", { kind: "QUIZ", id: "q1", at: "x" }), "/classes/c%201/students/s%2F1/quiz-attempts/q1");
  assert.equal(evidencePath("c1", "s1", { kind: "PRACTICAL", id: "p1", at: "x" }), "/classes/c1/students/s1/attempts/p1");
  assert.equal(evidencePath("c1", "s1", { kind: "TEST", id: "t1", at: "x" }), null);
});

test("notes count code points after trimming and NFC, with a 500 limit, and an empty note is left out of the body", () => {
  assert.equal(noteLength("  é  "), 1);
  assert.equal(noteLength("😀".repeat(3)), 3);
  assert.equal(noteTooLong("đ".repeat(NOTE_MAX)), false);
  assert.equal(noteTooLong("đ".repeat(NOTE_MAX + 1)), true);
  assert.deepEqual(ackBody("DISMISSED", "   "), { action: "DISMISSED" });
  assert.deepEqual(ackBody("ACKNOWLEDGED", "  đã xem  "), { action: "ACKNOWLEDGED", note: "đã xem" });
});

test("API errors map to stale, archived or other without needing the API client", () => {
  assert.equal(ackErrorKind({ code: "INSIGHT_STALE", status: 409 }), "stale");
  assert.equal(ackErrorKind({ code: "CLASS_ARCHIVED" }), "archived");
  assert.equal(ackErrorKind({ code: "NOT_FOUND" }), "other");
  assert.equal(ackErrorKind(new Error("x")), "other");
  assert.equal(ackErrorKind(null), "other");
});

test("handled state and labels follow latestAcknowledgement", () => {
  assert.equal(isHandled(insight("SCORE_CHANGE_UNUSUAL")), false);
  assert.equal(isHandled(insight("SCORE_CHANGE_UNUSUAL", { latestAcknowledgement: null })), false);
  assert.equal(isHandled(insight("SCORE_CHANGE_UNUSUAL", { latestAcknowledgement: { action: "DISMISSED", createdAt: "x" } })), true);
  assert.equal(ackLabel("DISMISSED"), insightMessages.vi.dismissed);
  assert.equal(ackLabel("ACKNOWLEDGED"), insightMessages.vi.acknowledged);
});

test("known rules read from the page-language copy and show the values and thresholds", () => {
  const copy = insightCopy(insight("SCORE_CHANGE_UNUSUAL", {
    values: { latest: 90, mean: 60, delta: 30, direction: "UP" },
    thresholds: { baselineMin: 3, baselineMax: 10, sigmaMultiplier: 2, minDelta: 25 },
  }));
  assert.equal(copy.title, insightMessages.vi.rules.SCORE_CHANGE_UNUSUAL.title);
  assert.match(copy.summary, /90/);
  assert.match(copy.summary, /\+30/);
  assert.match(copy.threshold, /25/);
  const mastery = insightCopy(insight("OBJECTIVE_MASTERY_INCONSISTENT", {
    values: { outcomeCode: "OUT-1", passingKind: "QUIZ", nonPassingKind: "PRACTICAL" },
    thresholds: { minItems: 3, minPassing: 1, minNonPassing: 2 },
  }));
  assert.match(mastery.summary, /OUT-1/);
  assert.match(mastery.summary, /Bài trắc nghiệm/);
  assert.match(mastery.summary, /Lượt thực hành/);
});

test("an unknown rule code falls back to the API message and lists its thresholds", () => {
  const copy = insightCopy(insight("EXPLANATION_MISMATCH_FUTURE", { message: "Thông điệp từ máy chủ", thresholds: { high: 5 } }));
  assert.equal(copy.title, insightMessages.vi.unknownTitle);
  assert.equal(copy.summary, "Thông điệp từ máy chủ");
  assert.equal(copy.threshold, "high: 5");
});

/* ---- TAI4-T6: similarity insight ------------------------------------------------------------------------------ */

test("a similarity insight reads from the page-language copy with its title and counts", () => {
  const copy = insightCopy(insight("SUBMISSION_SIMILARITY_HIGH", {
    values: { assignmentId: "a1", assignmentTitle: "Bài tự luận 1", level: "HIGH", pairCount: 2 },
    thresholds: { highContainmentPercent: 80, minSharedShingles: 8 },
  }));
  assert.equal(copy.title, insightMessages.vi.rules.SUBMISSION_SIMILARITY_HIGH.title);
  assert.match(copy.summary, /Bài tự luận 1/);
  assert.match(copy.summary, /2 cặp/);
  assert.match(copy.summary, /không phải kết luận/);
  assert.match(copy.threshold, /80%/);
  assert.match(copy.threshold, /8 đoạn/);
});

test("the evidence kinds of a similarity insight have labels in both languages and no detail route", () => {
  for (const lang of ["vi", "en"] as const) {
    assert.ok(insightMessages[lang].evidenceKind.WRITTEN);
    assert.ok(insightMessages[lang].evidenceKind.SIMILARITY_MATCH);
    assert.ok(insightMessages[lang].openSimilarity);
  }
  assert.equal(evidencePath("c1", "s1", { kind: "WRITTEN", id: "w1", at: "x" }), null);
  assert.equal(evidencePath("c1", "s1", { kind: "SIMILARITY_MATCH", id: "m1", at: "x" }), null);
});

test("only a similarity insight with an assignment id has a review target", () => {
  assert.equal(similarityAssignmentId(insight("SUBMISSION_SIMILARITY_HIGH", { values: { assignmentId: "a1" } })), "a1");
  assert.equal(similarityAssignmentId(insight("SUBMISSION_SIMILARITY_HIGH", { values: {} })), null);
  assert.equal(similarityAssignmentId(insight("SUBMISSION_SIMILARITY_HIGH", { values: { assignmentId: 7 } })), null);
  assert.equal(similarityAssignmentId(insight("SUBMISSION_SIMILARITY_HIGH", { values: { assignmentId: "" } })), null);
  assert.equal(similarityAssignmentId(insight("SCORE_CHANGE_UNUSUAL", { values: { assignmentId: "a1" } })), null);
});

test("the deep link opens the work tab with the assignment and keeps other parameters", () => {
  const next = withSimilarityTarget(new URLSearchParams("tab=insights&status=ARCHIVED"), "a 1");
  assert.equal(next.get("tab"), "work");
  assert.equal(next.get("similarity"), "a 1");
  assert.equal(next.get("status"), "ARCHIVED");
  assert.equal(next.toString(), "tab=work&status=ARCHIVED&similarity=a+1");
  const original = new URLSearchParams("tab=insights");
  withSimilarityTarget(original, "a1");
  assert.equal(original.toString(), "tab=insights");
});

/* ---- TAI4-T5: explanation-mismatch insights ------------------------------------------------------------------ */

test("explanation-mismatch insights read from the page-language copy and say they are not a conclusion", () => {
  const mcq = { assignmentTitle: "Bài tự luận 1", mcqScore: 90, explanationPercent: 20, direction: "ANSWER_HIGH_EXPLANATION_LOW" };
  const th = { answerHighMin: 80, answerLowMax: 40, explanationHighMin: 80, explanationLowMax: 40 };
  const a = insightCopy(insight("MCQ_EXPLANATION_MISMATCH", { values: mcq, thresholds: th }));
  assert.equal(a.title, insightMessages.vi.rules.MCQ_EXPLANATION_MISMATCH.title);
  assert.match(a.summary, /Bài tự luận 1/);
  assert.match(a.summary, /90/);
  assert.match(a.summary, /20%/);
  assert.match(a.summary, /không phải kết luận/);
  assert.match(a.threshold, /80/);
  assert.match(a.threshold, /40%/);
  const inverse = insightCopy(insight("MCQ_EXPLANATION_MISMATCH", { values: { ...mcq, direction: "ANSWER_LOW_EXPLANATION_HIGH" }, thresholds: th }));
  assert.match(inverse.summary, /trắc nghiệm thấp, giải thích cao/);
  const sim = insightCopy(insight("SIMULATION_EXPLANATION_MISMATCH", { values: { assignmentTitle: "T", verdict: "needs_practice", explanationPercent: 90 }, thresholds: th }));
  assert.equal(sim.title, insightMessages.vi.rules.SIMULATION_EXPLANATION_MISMATCH.title);
  assert.match(sim.summary, /cần luyện thêm/);
  assert.match(sim.summary, /90%/);
});

test("the grade evidence kind has labels in both languages and no detail route", () => {
  for (const lang of ["vi", "en"] as const) assert.ok(insightMessages[lang].evidenceKind.WRITTEN_GRADE);
  assert.equal(evidencePath("c1", "s1", { kind: "WRITTEN_GRADE", id: "g1", at: "x" }), null);
  assert.equal(similarityAssignmentId(insight("MCQ_EXPLANATION_MISMATCH", { values: { assignmentId: "a1" } })), null);
});

/* ---- vocabulary and isolation ------------------------------------------------------------------------------ */

const FORBIDDEN = ["gian lận", "năng lực thật", "yếu kém", "xếp hạng", "nghi ngờ", "đạo văn", "sao chép", "copied", "cheat", "true ability", "real ability", "weak", "poor", "ranking", "rank ", "suspect", "suspicio", "plagiar", "sudden"];
const RAW_CODES = ["INSUFFICIENT_EVIDENCE", "SCORE_CHANGE_UNUSUAL", "HIGH_HINT_DEPENDENCE", "OBJECTIVE_MASTERY_INCONSISTENT", "SUDDEN_UNAIDED_PASS", "SUBMISSION_SIMILARITY_HIGH", "MCQ_EXPLANATION_MISMATCH", "SIMULATION_EXPLANATION_MISMATCH"];
const SAMPLE_VALUES = { latest: 90, mean: 60, delta: 30, standardDeviation: 5, threshold: 25, direction: "UP", scoredCount: 2, practicalCount: 4, highHintCount: 3, outcomeCode: "OUT-1", passingKind: "QUIZ", nonPassingKind: "PRACTICAL", assignmentTitle: "Bài tự luận 1", pairCount: 2, mcqScore: 90, explanationPercent: 20, verdict: "passed" };
const SAMPLE_THRESHOLDS = { minScoredItems: 3, baselineMin: 3, baselineMax: 10, sigmaMultiplier: 2, minDelta: 25, minPracticals: 3, highHintLevel: 3, shareNumerator: 2, shareDenominator: 3, minItems: 3, minPassing: 1, minNonPassing: 2, highContainmentPercent: 80, minSharedShingles: 8, answerHighMin: 80, answerLowMax: 40, explanationHighMin: 80, explanationLowMax: 40 };

function strings(value: unknown, lang: "vi" | "en"): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") {
    const out = (value as (...args: unknown[]) => unknown)(SAMPLE_VALUES, insightMessages[lang].evidenceKind, 2, "đ", true);
    return typeof out === "string" ? [out] : [];
  }
  if (value && typeof value === "object") return Object.values(value).flatMap((v) => strings(v, lang));
  return [];
}

test("every Vietnamese and English string is free of forbidden words and raw rule codes", () => {
  for (const lang of ["vi", "en"] as const) {
    const all = strings(insightMessages[lang], lang);
    assert.ok(all.length > 40, `${lang} has strings`);
    for (const rule of Object.values(insightMessages[lang].rules)) {
      all.push(rule.threshold(SAMPLE_THRESHOLDS));
      all.push(rule.summary(SAMPLE_VALUES, insightMessages[lang].evidenceKind));
    }
    for (const text of all) {
      const lower = text.toLowerCase();
      for (const word of FORBIDDEN) assert.ok(!lower.includes(word), `${lang}: "${text}" contains "${word}"`);
      for (const code of RAW_CODES) assert.ok(!text.includes(code), `${lang}: "${text}" shows a raw rule code`);
    }
  }
});

test("the English copy has the same keys as the Vietnamese copy", () => {
  const keys = (o: unknown, prefix = ""): string[] => (o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, prefix + k + ".") : [prefix + k])) : []);
  assert.deepEqual(keys(insightMessages.en).sort(), keys(insightMessages.vi).sort());
});

test("only the teacher class screens import the insight modules, never student or parent code", () => {
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
  const allowed = new Set(["ClassInsights.tsx", "ClassDetail.tsx", "PracticeAnalytics.tsx", "insights-view.ts", "insights-view.test.ts", "insights-copy.ts"].map((n) => path.join(root, "features", "classes", n)));
  const importers = files.filter((f) => /from\s+["'][^"']*(insights-view|insights-copy|ClassInsights)(\.tsx?)?["']/.test(readFileSync(f, "utf8")));
  assert.ok(importers.length >= 3, "the teacher screens do use the modules");
  for (const file of importers) assert.ok(allowed.has(file), `${path.relative(root, file)} must not import insight modules`);
  const studentFiles = files.filter((f) => /StudentClasses|[\\/]dashboard[\\/]|[\\/]progress[\\/]|[\\/]lessons[\\/]|[\\/]assignments[\\/]/.test(f));
  for (const file of studentFiles) assert.ok(!/insights-(view|copy)|ClassInsights|\/insights/.test(readFileSync(file, "utf8")), `${path.relative(root, file)} mentions insights`);
});
