import katex from "katex";
import "katex/dist/katex.min.css";
import { useMutation } from "@tanstack/react-query";
import { Suspense, lazy, useMemo, useRef, useState } from "react";
import { Badge, ErrorBox } from "../../components/ui";
import { idempotencyKey, isApiError, mutate } from "../../lib/api";
import { defineText } from "../../i18n";
import { segmentsOf } from "./similarity-spans";
import {
  aiNotice,
  canAcceptAsIs,
  canUseSuggestion,
  isActiveJob,
  rationaleSegments,
  type AiChoice,
  type AiJobState,
  type AssessmentRequestResult,
  type BoardAiState,
  type GradeKind,
  type SkipReason,
  type SuggestionCriterion,
  type WrittenSuggestion,
} from "./written-suggestion";

// TAI-05: the credit estimate is loaded on demand (teacher only).
const AiCreditEstimate = lazy(() => import("../credits/AiCreditEstimate"));
type CreditEstimateValue = { enabled: boolean; credits: number; available: number } | undefined;

/**
 * TAI2-T6 teacher-only AI rubric suggestion UI. Loaded with the teacher class screens only; students and parents never
 * import it (written-suggestion.test.ts). The suggestion is a reference: the teacher's points are the grade.
 */
const text = defineText({
  vi: {
    request: (n: number) => `Gợi ý AI cho bài chưa chấm (${n})`,
    requesting: "Đang gửi yêu cầu…",
    requestHint: "AI chỉ đưa ra gợi ý cho giáo viên tham khảo. Điểm chính thức luôn do giáo viên quyết định; học sinh và phụ huynh không thấy gợi ý.",
    created: (n: number) => `Đã tạo ${n} yêu cầu gợi ý.`,
    shadowNote: "Hệ thống đang ở chế độ đánh giá thử: gợi ý được lưu để so sánh và không hiển thị khi chấm.",
    skippedTitle: "Không gửi cho AI:",
    skip: {
      NOT_GRADEABLE: "chưa thể chấm (đang chờ duyệt trễ hoặc đã bị từ chối)",
      NOT_CURRENT: "không phải bài nộp mới nhất",
      AI_POLICY_INELIGIBLE: "không đủ điều kiện gửi theo chính sách bảo vệ dữ liệu; hãy chấm thủ công",
      CONSENT_REQUIRED: "chưa có đồng ý của phụ huynh cho mục đích này",
      ALREADY_SUGGESTED: "đã có gợi ý hoặc đang xử lý",
      LESSON_UNAVAILABLE: "bài học gắn với bài tự luận không còn",
    } as Record<SkipReason, string>,
    column: "Gợi ý AI",
    state: { pending: "Đang tạo gợi ý", ready: "Có gợi ý", partial: "Gợi ý một phần", suppressed: "Không có gợi ý hợp lệ", failed: "Lỗi AI, chấm thủ công", none: "—" },
    panel: "Gợi ý AI (chỉ giáo viên thấy)",
    notice: {
      pending: "AI đang tạo gợi ý. Bạn vẫn có thể chấm thủ công ngay.",
      provider_down: "Dịch vụ AI tạm thời không khả dụng. Hãy chấm thủ công hoặc yêu cầu gợi ý lại sau.",
      failed: "AI không tạo được gợi ý cho bài này. Hãy chấm thủ công.",
      suppressed: "AI không đưa ra gợi ý hợp lệ cho bài này. Hãy chấm thủ công.",
      partial: "Gợi ý chỉ có ở một số tiêu chí; các tiêu chí còn lại cần chấm thủ công.",
      ready: "Đối chiếu gợi ý với bài làm rồi tự quyết định điểm.",
      injection: "Bài làm có câu giống lệnh gửi cho AI nên hệ thống không gửi bài này cho AI.",
    },
    accept: "Dùng gợi ý",
    edit: "Sửa từ gợi ý",
    reject: "Không dùng gợi ý",
    acceptOnlyValid: "Chỉ dùng nguyên gợi ý khi mọi tiêu chí đều có gợi ý hợp lệ.",
    kind: { MANUAL: "Chấm thủ công", ACCEPTED_AI: "Dùng nguyên gợi ý AI", EDITED_AI: "Đã sửa từ gợi ý AI", REJECTED_AI: "Không dùng gợi ý AI" } as Record<GradeKind, string>,
    willSave: (kind: string) => `Sẽ lưu: ${kind}`,
    suggested: (points: number, max: number) => `AI gợi ý: ${points} / ${max}`,
    invalid: "AI không đưa ra gợi ý hợp lệ",
    uncertainty: "Lưu ý",
    evidence: "Phần được đánh dấu trong bài làm là trích dẫn AI dùng làm căn cứ.",
  },
  en: {
    request: (n: number) => `AI suggestions for ungraded work (${n})`,
    requesting: "Sending the request…",
    requestHint: "AI only suggests points for the teacher to consider. The official grade is always the teacher's; students and parents never see suggestions.",
    created: (n: number) => `${n} suggestion request(s) created.`,
    shadowNote: "The system is in trial (shadow) mode: suggestions are stored for comparison and are not shown while grading.",
    skippedTitle: "Not sent to AI:",
    skip: {
      NOT_GRADEABLE: "not gradeable yet (late review pending or rejected)",
      NOT_CURRENT: "not the latest submission",
      AI_POLICY_INELIGIBLE: "not eligible under the data protection policy; grade by hand",
      CONSENT_REQUIRED: "no parent consent for this purpose",
      ALREADY_SUGGESTED: "already suggested or in progress",
      LESSON_UNAVAILABLE: "the lesson of this written task is no longer available",
    } as Record<SkipReason, string>,
    column: "AI suggestion",
    state: { pending: "Preparing", ready: "Suggestion ready", partial: "Partial suggestion", suppressed: "No valid suggestion", failed: "AI failed, grade by hand", none: "—" },
    panel: "AI suggestion (teacher only)",
    notice: {
      pending: "The AI suggestion is being prepared. You can grade by hand right away.",
      provider_down: "The AI service is temporarily unavailable. Grade by hand or request a suggestion again later.",
      failed: "The AI could not prepare a suggestion for this submission. Grade by hand.",
      suppressed: "The AI gave no valid suggestion for this submission. Grade by hand.",
      partial: "Only some criteria have a suggestion; grade the others by hand.",
      ready: "Compare the suggestion with the answer and decide the points yourself.",
      injection: "The answer contains text that looks like instructions to the AI, so it was not sent to the AI.",
    },
    accept: "Use suggestion",
    edit: "Edit from suggestion",
    reject: "Do not use suggestion",
    acceptOnlyValid: "A suggestion can be used as is only when every criterion has a valid suggestion.",
    kind: { MANUAL: "Graded by hand", ACCEPTED_AI: "AI suggestion used as is", EDITED_AI: "Edited from the AI suggestion", REJECTED_AI: "AI suggestion not used" } as Record<GradeKind, string>,
    willSave: (kind: string) => `Will save as: ${kind}`,
    suggested: (points: number, max: number) => `AI suggests: ${points} / ${max}`,
    invalid: "The AI gave no valid suggestion",
    uncertainty: "Note",
    evidence: "The highlighted parts of the answer are the quotes the AI used as evidence.",
  },
});

export const gradeKindLabel = (kind: string) => text().kind[kind as GradeKind] ?? kind;

/** Bulk request on the written-status board; the result lists skipped submissions with neutral reasons. */
export function AiSuggestionRequest({ classId, assignmentId, submissionIds, names, onDone }: { classId: string; assignmentId: string; submissionIds: string[]; names: Record<string, string>; onDone: () => void }) {
  const t = text();
  const key = useRef<string | null>(null);
  // TAI-05: undefined while the estimate is being worked out; `enabled: false` means credits are off.
  const [credit, setCredit] = useState<CreditEstimateValue>();
  const creditBody = useMemo(() => (submissionIds.length ? { purpose: "ASSESS_SUBMISSION" as const, submissionCount: submissionIds.length } : null), [submissionIds.length]);
  const creditHold = !!creditBody && (!credit || (credit.enabled && credit.available < credit.credits));
  const request = useMutation({
    mutationFn: () => {
      key.current ??= idempotencyKey();
      return mutate<AssessmentRequestResult>(
        `/classes/${classId}/assignments/${assignmentId}/ai-assessments`, "POST",
        { submissionIds, ...(credit?.enabled ? { confirmedCredits: credit.credits } : {}) }, key.current);
    },
    onSuccess: () => {
      key.current = null;
      onDone();
    },
  });
  const result = request.data;
  return (
    <div className="ai-suggestion-request">
      {creditBody && (
        <Suspense fallback={null}>
          <AiCreditEstimate classId={classId} body={creditBody} error={request.error} onChange={setCredit} />
        </Suspense>
      )}
      <button type="button" className="secondary" disabled={!submissionIds.length || request.isPending || creditHold} onClick={() => request.mutate()}>
        {request.isPending ? t.requesting : t.request(submissionIds.length)}
      </button>
      <p className="tiny muted">{t.requestHint}</p>
      <ErrorBox error={request.error && (isApiError(request.error, "AI_ESTIMATE_CHANGED") || isApiError(request.error, "AI_CREDITS_INSUFFICIENT")) ? null : request.error} />
      {result && (
        <div className="notice" role="status">
          <p>{t.created(result.created.length)}</p>
          {result.mode === "shadow" && <p className="tiny">{t.shadowNote}</p>}
          {result.skipped.length > 0 && (
            <>
              <b>{t.skippedTitle}</b>
              <ul>{result.skipped.map((s) => <li key={s.submissionId}>{names[s.submissionId] ?? s.submissionId}: {t.skip[s.reason] ?? s.reason}</li>)}</ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Board cell for one student's latest AI state (assist mode only). Neutral tones. */
export function AiStateBadge({ state }: { state: BoardAiState | null | undefined }) {
  const t = text();
  if (!state) return <>{t.state.none}</>;
  if (isActiveJob(state)) return <Badge tone="outline">{t.state.pending}</Badge>;
  if (state.jobStatus === "FAILED") return <Badge tone="outline">{t.state.failed}</Badge>;
  if (state.status === "VALID") return <Badge tone="partial">{t.state.ready}</Badge>;
  if (state.status === "PARTIAL") return <Badge tone="partial">{t.state.partial}</Badge>;
  if (state.status === "SUPPRESSED") return <Badge tone="outline">{t.state.suppressed}</Badge>;
  return <>{t.state.none}</>;
}

/** Original answer with the verified evidence ranges marked (text nodes and <mark>, never HTML). */
export function AnswerWithEvidence({ answer, spans }: { answer: string; spans: Array<{ start: number; end: number }> }) {
  return (
    <blockquote className="written-answer">
      {segmentsOf(answer, spans).map((segment, index) => (segment.marked ? <mark key={index} className="evidence-mark">{segment.text}</mark> : <span key={index}>{segment.text}</span>))}
    </blockquote>
  );
}

/** Rationale with inline KaTeX for $...$ only (trust off, never throws). */
function Rationale({ value }: { value: string }) {
  return (
    <span>
      {rationaleSegments(value).map((segment, index) =>
        segment.math ? (
          <span key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(segment.text, { throwOnError: false, trust: false, displayMode: false, strict: "ignore" }) }} />
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </span>
  );
}

/** One criterion's suggestion under its points input. */
export function CriterionSuggestion({ criterion, maxPoints }: { criterion: SuggestionCriterion | undefined; maxPoints: number }) {
  const t = text();
  if (!criterion) return null;
  if (!criterion.valid || criterion.suggestedPoints === null) return <p className="tiny muted ai-criterion">{t.invalid}</p>;
  return (
    <div className="tiny ai-criterion">
      <b>{t.suggested(criterion.suggestedPoints, maxPoints)}</b>
      {criterion.rationale && <> · <Rationale value={criterion.rationale} /></>}
      {criterion.uncertainty && <div className="muted">{t.uncertainty}: {criterion.uncertainty}</div>}
    </div>
  );
}

/** Notice and accept / edit / reject actions above the grading form. Manual grading always stays available. */
export function AiSuggestionBar({ job, suggestion, choice, kind, onChoose }: { job: AiJobState | null; suggestion: WrittenSuggestion | null; choice: AiChoice; kind: GradeKind; onChoose: (choice: AiChoice) => void }) {
  const t = text();
  const notice = aiNotice(job, suggestion);
  if (notice === "none") return null;
  const injection = suggestion?.flags.includes("INJECTION_SUSPECTED");
  return (
    <section className="ai-suggestion" aria-label={t.panel}>
      <h3>{t.panel}</h3>
      <p role="status">{injection ? t.notice.injection : t.notice[notice]}</p>
      {canUseSuggestion(suggestion) && (
        <>
          <p className="tiny muted">{t.evidence}</p>
          <div className="button-row">
            <button type="button" className={choice === "accept" ? "primary" : "secondary"} disabled={!canAcceptAsIs(suggestion)} title={canAcceptAsIs(suggestion) ? undefined : t.acceptOnlyValid} onClick={() => onChoose("accept")}>{t.accept}</button>
            <button type="button" className={choice === "edit" ? "primary" : "secondary"} onClick={() => onChoose("edit")}>{t.edit}</button>
            <button type="button" className={choice === "reject" ? "primary" : "secondary"} onClick={() => onChoose("reject")}>{t.reject}</button>
          </div>
          <p className="tiny"><b>{t.willSave(gradeKindLabel(kind))}</b></p>
        </>
      )}
    </section>
  );
}
