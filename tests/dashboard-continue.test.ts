import assert from "node:assert/strict";
import test from "node:test";
import { openResumeAction, nextOpenActivity, selectAssignedWork, selectOpenResume } from "../src/features/dashboard/dashboard-continue.ts";
import { chapterLessonHref, lessonActivityHref } from "../src/features/lessons/lesson-navigation.ts";

test("assignment completion is scoped to assignment, not a shared lesson", () => {
  const queue = [{ id: "old", contentId: "lesson-one" }, { id: "new", contentId: "lesson-one" }];
  assert.equal(selectAssignedWork(queue, [{ assignmentId: "old", completed: true }])?.id, "new");
  assert.equal(selectAssignedWork(queue, [{ assignmentId: "old", completed: true }, { assignmentId: "new", completed: true }]), undefined);
});
test("closed assignments and submitted tests do not become Continue actions", () => {
  const queue = [{ id: "closed", canOpen: false }, { id: "submitted", contentType: "test", testStatus: { status: "SUBMITTED" } }, { id: "late", contentType: "test", testStatus: { status: "LATE_REVIEW_PENDING" } }, { id: "open", canOpen: true }];
  assert.equal(selectAssignedWork(queue, [])?.id, "open");
});
test("resume chooses the newest incomplete public lesson, not a lab or removed lesson", () => {
  const subjects = [{ name: "Science", grades: [{ chapters: [{ lessons: [{ id: "older", title: "Older" }], topics: [{ lessons: [{ id: "recent", title: "Recent" }, { id: "done", title: "Done" }] }] }] }] }];
  const row = (contentId: string, date: string, status = "in_progress") => ({ contentId, updatedAt: date, status });
  const progress = [row("older", "2026-11-01"), row("recent", "2026-11-02"), row("lab", "2026-11-03"), row("done", "2026-11-04", "completed"), row("older", "not-a-date")];
  assert.equal(selectOpenResume(progress, subjects)?.id, "recent");
  assert.equal(selectOpenResume(progress, []), undefined);
});
test("activity links preserve the desired tab and do not leak assignment context to another lesson", () => {
  assert.equal(lessonActivityHref("lesson one", "VIDEO", "assignment-one"), "/lessons/lesson%20one?tab=video&assignmentId=assignment-one");
  assert.equal(lessonActivityHref("lesson-one", "BASIC_EXERCISE"), "/lessons/lesson-one?tab=exercise");
  assert.equal(chapterLessonHref("other", "current", "assignment-one"), "/lessons/other?tab=reading");
  assert.equal(chapterLessonHref("current", "current", "assignment-one"), "/lessons/current?tab=reading&assignmentId=assignment-one");
});

test("open resume prioritizes the activity already in progress without changing server order", () => {
  const steps = [{ id: "read", type: "READING", position: 1, state: "NOT_STARTED" }, { id: "video", type: "VIDEO", position: 2, state: "IN_PROGRESS" }, { id: "exercise", type: "BASIC_EXERCISE", position: 3, state: "NOT_STARTED" }];
  assert.equal(nextOpenActivity(steps)?.id, "video");
  assert.equal(nextOpenActivity(steps.map((step) => ({ ...step, state: "COMPLETED" }))), undefined);
  assert.equal(nextOpenActivity([{ id: "locked", type: "READING", position: 1, state: "LOCKED" }, { id: "available", type: "VIDEO", position: 2, state: "NOT_STARTED" }])?.id, "available");
  assert.deepEqual(steps.map((step) => step.id), ["read", "video", "exercise"]);
});

test("unsupported open activities never masquerade as unfinished reading", () => {
  const unsupported = [{ type: "LAB", position: 1, state: "IN_PROGRESS" }, { type: "STUDY_CARDS", position: 2, state: "NOT_STARTED" }];
  assert.equal(nextOpenActivity(unsupported), undefined);
  assert.equal(lessonActivityHref("lesson-one", "LAB"), null);
  assert.equal(lessonActivityHref("lesson-one", "STUDY_CARDS"), null);
  const action = openResumeAction("lesson-one", unsupported);
  assert.equal(action.review, true);
  assert.equal(action.href, "/lessons/lesson-one");
  assert.equal(action.step, undefined);
  assert.equal(nextOpenActivity([...unsupported, { type: "VIDEO", position: 3, state: "NOT_STARTED" }])?.type, "VIDEO");
});
test("a stale in-progress summary offers Review when the actual supported lesson activities are all completed", () => {
  const subjects = [{ name: "Science", grades: [{ chapters: [{ lessons: [{ id: "lesson-one", title: "Lesson" }] }] }] }];
  const candidate = selectOpenResume([{ contentId: "lesson-one", updatedAt: "2026-11-04", status: "in_progress" }], subjects);
  assert.equal(candidate?.id, "lesson-one");
  const action = openResumeAction(candidate!.id, [{ type: "READING", position: 1, state: "COMPLETED" }, { type: "VIDEO", position: 2, state: "COMPLETED" }, { type: "BASIC_EXERCISE", position: 3, state: "COMPLETED" }]);
  assert.equal(action.review, true);
  assert.equal(action.href, "/lessons/lesson-one");
  assert.equal(action.step, undefined);
});
