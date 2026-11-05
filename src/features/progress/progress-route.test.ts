import test from "node:test";
import assert from "node:assert/strict";
import { progressTab, withAttempt, withProgressTab, withoutAttempt } from "./progress-route.ts";

test("a shared attempt link opens history even with an old tab selection", () => {
  assert.equal(progressTab(new URLSearchParams("tab=courses&attemptId=attempt-1")), "history");
  assert.equal(progressTab(new URLSearchParams("tab=unknown")), "all");
  assert.equal(progressTab(withoutAttempt(new URLSearchParams("tab=courses&attemptId=attempt-1"))), "history");
});

test("closing an attempt preserves the history destination and unrelated filters", () => {
  const original = new URLSearchParams("tab=courses&grade=8");
  const opened = withAttempt(original, "attempt / 1", "quiz");
  const shared = new URLSearchParams(opened.toString());
  assert.equal(shared.get("attemptId"), "attempt / 1");
  assert.equal(shared.get("attemptKind"), "quiz");
  const closed = withoutAttempt(shared);
  assert.equal(progressTab(closed), "history");
  assert.equal(closed.get("grade"), "8");
  assert.equal(closed.has("attemptId"), false);
  assert.equal(closed.has("attemptKind"), false);
  assert.equal(original.get("tab"), "courses");
});

test("changing tabs removes the attempt so refreshing cannot reopen a dismissed sheet", () => {
  const next = withProgressTab(new URLSearchParams("tab=history&attemptId=old&attemptKind=quiz"), "assignments");
  assert.equal(progressTab(new URLSearchParams(next.toString())), "assignments");
  assert.equal(next.has("attemptId"), false);
  assert.equal(next.has("attemptKind"), false);
  assert.equal(withProgressTab(next, "all").has("tab"), false);
});

test("nested attempts remain shareable and returning to a step removes the stale attempt", () => {
  const stepRoute = new URLSearchParams("tab=assignments&grade=8");
  const quiz = withAttempt(stepRoute, "quiz-1", "quiz");
  const practical = withAttempt(quiz, "practical-2", "practical");
  assert.equal(practical.get("attemptId"), "practical-2");
  assert.equal(practical.has("attemptKind"), false);
  const backToStep = withoutAttempt(practical);
  assert.equal(backToStep.has("attemptId"), false);
  assert.equal(backToStep.has("attemptKind"), false);
  assert.equal(backToStep.get("grade"), "8");
});
