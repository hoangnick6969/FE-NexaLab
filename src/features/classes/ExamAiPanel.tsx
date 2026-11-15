import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, RefreshCw, Sparkles } from "lucide-react";
import { api, idempotencyKey, isApiError, mutate } from "../../lib/api";
import { Badge, ErrorBox } from "../../components/ui";
import { AiQuotaMeter, isQuotaFull, useAiQuota } from "../ai-usage/AiQuota";
import { Confirm } from "./class-ui";
import {
  defaultForm, DEFAULTS, draftContent, draftReview, failureText, formProblems, isActive, levelTargets, LEVEL_LABEL, LEVELS, MAX_MCQ, MAX_WRITTEN,
  matrixTotal, pointPreview, pointsText, requestBody, slotTotal, TYPE_LABEL, WARNING_TEXT,
  type DraftContent, type ExamAiForm, type ExamAssessmentType, type ExamDraftJob,
} from "./exam-ai-view";
import "./exam-ai.css";

// Credit UI is loaded on demand (teacher only), exactly like the other Teacher AI panels.
const AiCreditEstimate = lazy(() => import("../credits/AiCreditEstimate"));
const AiJobCredits = lazy(() => import("../credits/AiJobCredits"));
type CreditEstimateValue = { enabled: boolean; credits: number; available: number } | undefined;
const CREDIT_ERROR_CODES = ["AI_ESTIMATE_CHANGED", "AI_CREDITS_INSUFFICIENT"];
const POLL_MS = 2_000;
const SLOW_MS = 120_000;

type LabOption = { id: string; title: string; release: { id: string }; lessonIds: string[]; challenges: Array<{ id: string; objective?: string }> };

/**
 * TAI7-T5 "AI Gợi ý đề & biểu điểm" inside the EXAM creation form. The teacher picks the grade column, the matrix
 * (Nhận biết / Thông hiểu / Vận dụng), the parts and, optionally, a Lab of the lesson; the server builds the blueprint, the
 * model writes the content and the server returns a draft of exactly 10,0 points. The draft is only loaded into the editor
 * (nothing is saved or published): the teacher reviews the levels, answers, rubric and points, then saves like any exam.
 */
export default function ExamAiPanel({
  classId, lessonId, lessonTitle, hasContent, onApply,
}: {
  classId: string;
  lessonId: string;
  lessonTitle: string;
  hasContent: boolean;
  onApply: (content: DraftContent, suggestedTitle: string) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ExamAiForm>(() => defaultForm());
  const [jobId, setJobId] = useState<string | null>(null);
  const [credit, setCredit] = useState<CreditEstimateValue>();
  const [replacing, setReplacing] = useState<DraftContent | null>(null);
  const [applied, setApplied] = useState(false);
  const startedAt = useRef(0);
  const [slow, setSlow] = useState(false);
  const quota = useAiQuota("GENERATE_ASSESSMENT");

  const labs = useQuery<{ labs: LabOption[] }>({ queryKey: ["assignable", classId], queryFn: () => api(`/classes/${classId}/assignable-content`) });
  const lessonLabs = useMemo(() => (labs.data?.labs ?? []).filter((lab) => lab.lessonIds.includes(lessonId)), [labs.data, lessonId]);
  const pickedLab = lessonLabs.find((lab) => lab.id === form.lab?.labId);

  const problems = formProblems(form);
  const body = useMemo(() => (lessonId && problems.length === 0 ? requestBody(lessonId, form) : null), [lessonId, form, problems.length]);
  const points = pointPreview(form);
  const levels = levelTargets(form.matrix, slotTotal(form));

  const create = useMutation({
    mutationFn: () => mutate<ExamDraftJob>(`/classes/${classId}/ai-jobs`, "POST", { ...body!, ...(credit?.enabled ? { confirmedCredits: credit.credits } : {}) }, idempotencyKey()),
    onSuccess: (job) => {
      setApplied(false);
      setSlow(false);
      startedAt.current = Date.now();
      qc.setQueryData(["exam-draft-job", classId, job.id], job);
      qc.invalidateQueries({ queryKey: ["my-credits"] });
      qc.invalidateQueries({ queryKey: ["ai-quota"] });
      setJobId(job.id);
    },
    onError: (error) => { if (isApiError(error, "AI_QUOTA_EXCEEDED")) void quota.refetch(); },
  });

  const job = useQuery<ExamDraftJob>({
    queryKey: ["exam-draft-job", classId, jobId],
    queryFn: () => api(`/classes/${classId}/ai-jobs/${jobId}`),
    enabled: !!jobId,
    refetchInterval: (query) => (isActive(query.state.data) ? POLL_MS : false),
  });
  const data = job.data;
  useEffect(() => {
    if (!isActive(data)) return setSlow(false);
    const timer = setTimeout(() => setSlow(true), Math.max(0, SLOW_MS - (Date.now() - startedAt.current)));
    return () => clearTimeout(timer);
  }, [data?.id, data?.status]);

  const cancel = useMutation({
    mutationFn: () => api<ExamDraftJob>(`/classes/${classId}/ai-jobs/${jobId}/cancel`, "POST", {}),
    onSuccess: (next) => {
      qc.setQueryData(["exam-draft-job", classId, jobId], next);
      qc.invalidateQueries({ queryKey: ["my-credits"] });
      qc.invalidateQueries({ queryKey: ["ai-quota"] });
    },
  });

  const set = (patch: Partial<ExamAiForm>) => setForm((current) => ({ ...current, ...patch }));
  const setType = (assessmentType: ExamAssessmentType) => set({ assessmentType, ...DEFAULTS[assessmentType] });
  const number = (value: string) => (value === "" ? 0 : Number(value));
  const creditShort = !!credit && credit.enabled && credit.available < credit.credits;
  const creditWait = !!body && !credit;
  const blocked = create.isPending || !body || isQuotaFull(quota.data) || creditWait || creditShort || isActive(data);

  const review = data?.status === "SUCCEEDED" ? draftReview(data) : null;
  const content = data?.status === "SUCCEEDED" ? draftContent(data) : null;
  const apply = (draft: DraftContent) => {
    onApply(draft, `Đề ${form.assessmentType === "MIDTERM_45M" ? "giữa kỳ" : "15 phút"} – ${lessonTitle}`);
    setApplied(true);
    setReplacing(null);
  };

  return (
    <section className="panel exam-ai" aria-label="AI Gợi ý đề và biểu điểm">
      <header className="exam-ai-head">
        <h4><Sparkles size={16} aria-hidden="true" /> AI Gợi ý đề &amp; biểu điểm</h4>
        <p className="tiny muted">
          Chọn cột điểm và ma trận mức độ nhận thức; AI soạn bản nháp đủ 10,0 điểm từ bài học đã chọn. Bản nháp chỉ được nạp vào trình soạn đề bên dưới — thầy/cô xem lại, sửa rồi mới lưu.
        </p>
      </header>

      {!lessonId ? (
        <p className="notice" role="status">Hãy chọn Bài học liên kết ở trên trước: AI chỉ dùng nội dung của bài học này.</p>
      ) : (
        // Not a <form>: this panel sits inside the resource form, and a nested form would submit the page. Enter in an
        // input must not save the exam either, so it is swallowed here.
        <div
          role="group"
          aria-label="Thiết lập đề AI soạn"
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") event.preventDefault();
          }}
        >
          <fieldset className="segmented">
            <legend>Cột điểm</legend>
            {(Object.keys(TYPE_LABEL) as ExamAssessmentType[]).map((type) => (
              <label className="check" key={type}>
                <input type="radio" name="exam-ai-type" checked={form.assessmentType === type} onChange={() => setType(type)} />
                {TYPE_LABEL[type]}
              </label>
            ))}
          </fieldset>

          <div className="exam-ai-grid">
            <label className="field">
              <span>Số câu trắc nghiệm (0–{MAX_MCQ})</span>
              <input type="number" min={0} max={MAX_MCQ} value={form.mcqCount} onChange={(e) => set({ mcqCount: number(e.target.value) })} />
            </label>
            <label className="field">
              <span>Số câu tự luận có rubric (0–{MAX_WRITTEN})</span>
              <input type="number" min={0} max={MAX_WRITTEN} value={form.writtenCount} onChange={(e) => set({ writtenCount: number(e.target.value) })} />
            </label>
          </div>

          <fieldset className="exam-ai-lab">
            <legend>Thử thách phòng Lab (tùy chọn)</legend>
            {labs.isLoading && <p className="tiny muted">Đang tải Lab của bài học…</p>}
            {labs.isError && <p role="alert" className="tiny">Không tải được danh sách Lab.</p>}
            {labs.data && lessonLabs.length === 0 && <p className="tiny muted">Bài học này chưa có Lab đã phát hành gắn kèm, nên đề chỉ gồm trắc nghiệm và tự luận.</p>}
            {lessonLabs.length > 0 && (
              <>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={!!form.lab}
                    onChange={(e) => {
                      const lab = lessonLabs[0]!;
                      set({ lab: e.target.checked ? { labId: lab.id, releaseId: lab.release.id, challengeId: lab.challenges[0]!.id } : null });
                    }}
                  />
                  Nhúng một thử thách Lab làm câu thực hành (2,0 điểm, mức Vận dụng)
                </label>
                {form.lab && (
                  <div className="exam-ai-grid">
                    <label className="field">
                      <span>Phòng Lab</span>
                      <select value={form.lab.labId} onChange={(e) => { const lab = lessonLabs.find((l) => l.id === e.target.value)!; set({ lab: { labId: lab.id, releaseId: lab.release.id, challengeId: lab.challenges[0]!.id } }); }}>
                        {lessonLabs.map((lab) => <option key={lab.id} value={lab.id}>{lab.title}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span>Thử thách</span>
                      <select value={form.lab.challengeId} onChange={(e) => set({ lab: { ...form.lab!, challengeId: e.target.value } })}>
                        {pickedLab?.challenges.map((c) => <option key={c.id} value={c.id}>{c.objective || c.id}</option>)}
                      </select>
                    </label>
                  </div>
                )}
              </>
            )}
          </fieldset>

          <fieldset className="exam-ai-matrix">
            <legend>Ma trận mức độ nhận thức (%)</legend>
            <div className="exam-ai-grid exam-ai-grid-3">
              {LEVELS.map((level) => (
                <label className="field" key={level}>
                  <span>{LEVEL_LABEL[level]}</span>
                  <input type="number" min={0} max={100} step={1} value={form.matrix[level]} onChange={(e) => set({ matrix: { ...form.matrix, [level]: number(e.target.value) } })} />
                  <small className="tiny muted">≈ {levels[level]} câu</small>
                </label>
              ))}
            </div>
            <p className={matrixTotal(form.matrix) === 100 ? "tiny muted" : "field-error"} role="status" aria-live="polite">
              Tổng {matrixTotal(form.matrix)}% {matrixTotal(form.matrix) === 100 ? "" : "— cần đúng 100%"}
            </p>
          </fieldset>

          {points && (
            <p className="exam-ai-points" role="status">
              Điểm dự kiến:{" "}
              {[points.mcq > 0 && `trắc nghiệm ${pointsText(points.mcq)}`, points.written > 0 && `tự luận ${pointsText(points.written)}`, points.lab > 0 && `Lab ${pointsText(points.lab)}`].filter(Boolean).join(" · ")}
              {" = "}<b>10,0</b> điểm · {slotTotal(form)} câu
            </p>
          )}

          <label className="field">
            <span>Chỉ dẫn thêm cho AI (không bắt buộc)</span>
            <textarea rows={2} maxLength={1000} value={form.instruction} onChange={(e) => set({ instruction: e.target.value })} placeholder="Ví dụ: tập trung vào cách mắc ampe kế và vôn kế" />
          </label>

          {problems.length > 0 && <ul className="exam-ai-problems" role="alert">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>}
          <AiQuotaMeter title="Lượt dùng AI soạn đề hôm nay" query={quota} />
          {body && (
            <Suspense fallback={null}>
              <AiCreditEstimate classId={classId} body={body} error={create.error} onChange={setCredit} />
            </Suspense>
          )}
          <ErrorBox error={create.error && CREDIT_ERROR_CODES.some((code) => isApiError(create.error, code)) ? null : create.error} />
          <div className="button-row">
            <button type="button" className="primary" disabled={blocked} onClick={() => create.mutate()}>
              <Sparkles size={15} aria-hidden="true" /> {create.isPending ? "Đang gửi…" : data && !isActive(data) ? "Soạn lại bản nháp khác" : "AI soạn đề nháp"}
            </button>
          </div>
        </div>
      )}

      {data && isActive(data) && (
        <div className="exam-ai-status" role="status" aria-live="polite">
          <RefreshCw size={15} className="spin" aria-hidden="true" /> AI đang soạn đề…
          {slow && <span className="tiny muted"> Việc này lâu hơn dự kiến. Thầy/cô có thể đợi thêm hoặc hủy (tín dụng được hoàn lại).</span>}
          <button type="button" className="text-button" disabled={cancel.isPending} onClick={() => cancel.mutate()}>Hủy</button>
          <ErrorBox error={cancel.error} />
        </div>
      )}
      {data?.status === "FAILED" && (
        <div className="error" role="alert">
          <AlertTriangle size={15} aria-hidden="true" /> {failureText(data.failureCode)}
          {data.credits && <Suspense fallback={null}><AiJobCredits credits={data.credits} /></Suspense>}
        </div>
      )}
      {data?.status === "CANCELLED" && <p className="notice" role="status">Đã hủy yêu cầu. Tín dụng đã được hoàn lại.</p>}

      {job.isError && !data && <ErrorBox error={job.error} />}

      {review && content && (
        <div className="exam-ai-result" aria-label="Bản nháp do AI soạn">
          <div className="exam-ai-total">
            <Badge tone="passed">Đủ {pointsText(review.totals.points)}/10 điểm</Badge>
            <span>
              Trắc nghiệm {pointsText(review.totals.mcq)} · Tự luận {pointsText(review.totals.written)}
              {review.totals.lab > 0 && ` · Lab ${pointsText(review.totals.lab)}`} · {content.questions.length + content.prompts.length + content.labs.length}/{data!.requestedCount} câu
            </span>
          </div>
          <table className="data-table exam-ai-matrix-table">
            <thead><tr><th>Mức độ</th><th>Yêu cầu</th><th>Đề nháp</th></tr></thead>
            <tbody>
              {LEVELS.map((level) => (
                <tr key={level}>
                  <td>{LEVEL_LABEL[level]}</td>
                  <td>{review.matrix.requested[level]}% ≈ {review.matrix.target[level]} câu</td>
                  <td>{review.matrix.actual[level]} câu</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data!.items![0]!.flags.length > 0 && (
            <ul className="exam-ai-warnings" role="status">
              {data!.items![0]!.flags.map((flag) => <li key={flag}><AlertTriangle size={13} aria-hidden="true" /> {WARNING_TEXT[flag]}</li>)}
            </ul>
          )}
          {data!.credits && <Suspense fallback={null}><AiJobCredits credits={data!.credits} /></Suspense>}
          <div className="button-row">
            <button type="button" className="primary" onClick={() => (hasContent ? setReplacing(content) : apply(content))}>
              <Check size={15} aria-hidden="true" /> Nạp vào trình soạn đề
            </button>
          </div>
          {applied && (
            <p className="notice" role="status">
              Đã nạp bản nháp vào trình soạn đề bên dưới. Xem lại từng câu (đáp án, nhãn mức độ, rubric, điểm), chỉnh sửa nếu cần rồi bấm Lưu nháp.
            </p>
          )}
          <p className="tiny muted">AI chỉ gợi ý: thầy/cô chịu trách nhiệm về đáp án, biểu điểm và điểm từng câu trước khi giao bài.</p>
        </div>
      )}
      {replacing && (
        <Confirm
          action="thay nội dung đang soạn bằng bản nháp AI"
          item="đề này"
          detail="Các câu hỏi đang có trong trình soạn đề sẽ bị thay thế. Thầy/cô vẫn chỉnh sửa được sau khi nạp."
          onClose={() => setReplacing(null)}
          onConfirm={() => apply(replacing)}
        />
      )}
    </section>
  );
}
