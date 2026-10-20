import { type MyProgressAssignment, type MyProgressStep } from "../../lib/api";
import { defineText, formatDateTime } from "../../i18n";

const text = defineText({
  vi: {
    steps: { READING: "Đọc", VIDEO: "Video", STUDY_CARDS: "Thẻ học", QUIZ: "Bài kiểm tra", LAB: "Thực hành", CHALLENGE: "Thử thách" } as Record<string, string>,
    states: { COMPLETED: "Hoàn thành", IN_PROGRESS: "Đang học", AVAILABLE: "Chưa bắt đầu", LOCKED: "Chưa mở" },
  },
  en: {
    steps: { READING: "Reading", VIDEO: "Video", STUDY_CARDS: "Study cards", QUIZ: "Quiz", LAB: "Practice", CHALLENGE: "Challenge" },
    states: { COMPLETED: "Completed", IN_PROGRESS: "In progress", AVAILABLE: "Not started", LOCKED: "Locked" },
  },
});

export const stepNames: Record<string, string> = text().steps;

export const stateNames: Record<MyProgressStep["state"], string> = text().states;

export const stateTones: Record<MyProgressStep["state"], string> = {
  COMPLETED: "passed",
  IN_PROGRESS: "partial",
  AVAILABLE: "outline",
  LOCKED: "outline",
};

export const verdictTone = (verdict: string | null) => (verdict === "passed" ? "passed" : verdict === "partial" ? "partial" : "practice");

export const time = (value: string | null) => (value ? formatDateTime(value) : "—");

export const stepLink = (assignmentId: string | null, stepId: string | null) =>
  assignmentId ? `/assignments/${assignmentId}${stepId ? "#step-" + stepId : ""}` : null;

export type SheetView =
  | { kind: "step"; assignment: MyProgressAssignment; step: MyProgressStep }
  | { kind: "quiz"; id: string }
  | { kind: "practical"; id: string };
