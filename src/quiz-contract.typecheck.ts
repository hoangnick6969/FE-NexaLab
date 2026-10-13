import type {
  ApiErrorEnvelope,
  QuizAttemptHistoryResponse,
  QuizAttemptRequest,
  QuizAttemptResponse,
  StudentQuiz,
} from "./api";

export const studentQuizContractTypecheck = {
  quiz: {
    lessonId: "lesson-id",
    stepId: "step-id",
    questions: [{ id: "question-id", prompt: "Prompt", options: [{ id: "option-id", text: "Option" }] }],
  },
  request: { answers: [{ questionId: "question-id", optionId: "option-id" }], idempotencyKey: "00000000-0000-4000-8000-000000000000" },
  response: {
    attempt: { id: "attempt-id", score: 50, passed: true, correctCount: 1, questionCount: 2, createdAt: "2026-10-13T00:00:00.000Z", results: [{ questionId: "question-id", correct: true }] },
    pathway: {
      lesson: { id: "lesson-id", title: "Lesson", subject: { id: "subject-id", name: "Physics" }, grade: 8, chapter: "Chapter", topic: "Topic", learningObjective: "Objective", prerequisites: "" },
      assignment: { id: "assignment-id", dueDate: "2026-10-14T00:00:00.000Z", overdue: false },
      steps: [{ id: "step-id", type: "QUIZ", position: 40, required: true, state: "IN_PROGRESS", progressValue: 0, lastPosition: null, lockReasonCode: null, resource: null }],
      nextStepId: "step-id",
      updatedAt: "2026-10-13T00:00:00.000Z",
    },
  },
  history: {
    attempts: [{
      id: "attempt-id", idempotencyKey: "00000000-0000-4000-8000-000000000000", score: 50, passed: true,
      correctCount: 1, questionCount: 2, createdAt: "2026-10-13T00:00:00.000Z", latest: true, best: true,
      results: [{ questionId: "question-id", prompt: "Prompt", selectedOptionText: "Option", correct: true }],
    }],
  },
  error: { message: "Bài kiểm tra chưa khả dụng" },
} satisfies {
  quiz: StudentQuiz;
  request: QuizAttemptRequest;
  response: QuizAttemptResponse;
  history: QuizAttemptHistoryResponse;
  error: ApiErrorEnvelope;
};
