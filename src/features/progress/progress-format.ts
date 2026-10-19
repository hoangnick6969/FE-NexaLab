import { type MyProgressAssignment, type MyProgressStep } from "../../lib/api";

export const stepNames: Record<string, string> = {
  READING: "Đọc",
  VIDEO: "Video",
  STUDY_CARDS: "Thẻ học",
  QUIZ: "Bài kiểm tra",
  LAB: "Thực hành",
  CHALLENGE: "Thử thách",
};

export const stateNames: Record<MyProgressStep["state"], string> = {
  COMPLETED: "Hoàn thành",
  IN_PROGRESS: "Đang học",
  AVAILABLE: "Chưa bắt đầu",
  LOCKED: "Chưa mở",
};

export const stateTones: Record<MyProgressStep["state"], string> = {
  COMPLETED: "passed",
  IN_PROGRESS: "partial",
  AVAILABLE: "outline",
  LOCKED: "outline",
};

export const verdictTone = (verdict: string | null) => (verdict === "passed" ? "passed" : verdict === "partial" ? "partial" : "practice");

export const time = (value: string | null) => (value ? new Date(value).toLocaleString("vi-VN") : "—");

export const stepLink = (assignmentId: string | null, stepId: string | null) =>
  assignmentId ? `/assignments/${assignmentId}${stepId ? "#step-" + stepId : ""}` : null;

export type SheetView =
  | { kind: "step"; assignment: MyProgressAssignment; step: MyProgressStep }
  | { kind: "quiz"; id: string }
  | { kind: "practical"; id: string };
