import { AiChip } from "../student-ai/AiChip";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lightbulb } from "lucide-react";
import { api } from "../../lib/api";
import { ErrorBox } from "../../components/ui";
import { withAssignmentContext } from "../lessons/lesson-catalog";
import { defineText } from "../../i18n";
import "./QuizQuestionHint.css";

/**
 * Rules-only hint on one question (BE lesson-hints@1): SAI-03A lesson quiz and SAI-03-T3 basic exercise.
 * Never the answer; the draft is never sent.
 */
type QuestionHint = { id: string; level: 1 | 2 | 3; maxLevel: 2 | 3; content: string; escalated: boolean; repeatReason: "TOP_LEVEL" | "NEEDS_ATTEMPT" | null };

const text = defineText({
  vi: {
    ask: "Gợi ý cho câu này",
    more: "Gợi ý thêm",
    level: (n: number) => `Mức ${n}/3 · ${["Câu hỏi gợi mở", "Chỗ cần xem lại", "Câu trong bài học"][n - 1]}`,
    needsAttempt: "Mức 3 sẽ mở nếu em nộp bài mà câu này vẫn chưa đúng.",
    topLevel: "Đây đã là mức gợi ý cao nhất cho câu này.",
    note: "Gợi ý không cho đáp án và không trừ điểm.",
  },
  en: {
    ask: "Hint for this question",
    more: "Another hint",
    level: (n: number) => `Level ${n}/3 · ${["Guiding question", "Where to look", "Sentence from the lesson"][n - 1]}`,
    needsAttempt: "Level 3 opens if you submit and this question is still not right.",
    topLevel: "This is already the highest hint level for this question.",
    note: "Hints never give the answer and never lower your score.",
  },
});

export function QuizQuestionHint({ lessonId, assignmentId, questionId }: { lessonId: string; assignmentId: string; questionId: string }) {
  return <QuestionHintButton path={withAssignmentContext(`/lessons/${encodeURIComponent(lessonId)}/quiz/hints`, assignmentId)} questionId={questionId} />;
}

/** SAI-03-T3: the same hint on an Open Curriculum basic exercise question. */
export function ExerciseQuestionHint({ lessonId, stepId, questionId }: { lessonId: string; stepId: string; questionId: string }) {
  return <QuestionHintButton path={`/open-curriculum/lessons/${encodeURIComponent(lessonId)}/exercises/${encodeURIComponent(stepId)}/hints`} questionId={questionId} />;
}

function QuestionHintButton({ path, questionId }: { path: string; questionId: string }) {
  const t = text();
  const [hint, setHint] = useState<QuestionHint | null>(null);
  const ask = useMutation({
    mutationFn: () => api<QuestionHint>(path, "POST", { questionId }),
    onSuccess: setHint,
  });
  return (
    <div className="quiz-question-hint" aria-live="polite" data-testid="quiz-question-hint">
      {hint && (
        <div className="quiz-question-hint-body">
          <small className="muted">{t.level(hint.level)}</small>
          <AiChip provider={(hint as any).provider} />
          <p>{hint.content}</p>
          {hint.repeatReason === "NEEDS_ATTEMPT" && <small className="muted">{t.needsAttempt}</small>}
          {hint.repeatReason === "TOP_LEVEL" && <small className="muted">{t.topLevel}</small>}
        </div>
      )}
      <button type="button" className="text-button" disabled={ask.isPending} onClick={() => ask.mutate()}>
        <Lightbulb size={15} aria-hidden /> {hint ? t.more : t.ask}
      </button>
      <ErrorBox error={ask.error} />
      {!hint && <small className="muted">{t.note}</small>}
    </div>
  );
}
