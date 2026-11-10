import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, FlaskConical, RefreshCw, Sparkles, X } from "lucide-react";
import { api, idempotencyKey, isApiError } from "../../lib/api";
import { Badge, ErrorBox, verdictLabel } from "../../components/ui";
import { defineText, formatDateTime } from "../../i18n";
import {
  ACTIVE_STATUSES,
  MAX_PROPOSALS,
  POLL_INTERVAL_MS,
  POLL_LIMIT_MS,
  applyLabProposal,
  cancelLabJob,
  createLabJob,
  getLabJob,
  labQuota,
  listLabJobs,
  rejectLabProposal,
  type ApplyResult,
  type LabJobView,
  type LabProposalCard,
} from "./lab-challenge-api";
import { droppedSummary, engineSummary, jobPhase, jobsForLesson, openProposals, paramRows, unavailableReason, type ChallengeParameters, type Unavailable } from "./lab-challenge-view";
import "./lab-challenge.css";

// Credit UI is loaded on demand, like every other Teacher AI screen, so this chunk carries no credit copy of its own.
const AiCreditEstimate = lazy(() => import("../credits/AiCreditEstimate"));
const AiJobCredits = lazy(() => import("../credits/AiJobCredits"));
type CreditEstimateValue = { enabled: boolean; credits: number; available: number } | undefined;
const CREDIT_ERROR_CODES = ["AI_ESTIMATE_CHANGED", "AI_CREDITS_INSUFFICIENT"];

const text = defineText({
  vi: {
    action: "Gợi ý thử thách bằng AI",
    eyebrow: "TRỢ LÝ AI · CHỈ GIÁO VIÊN",
    lead: "AI chỉ đề xuất một phòng thực hành có sẵn và giá trị tham số trong khoảng cho phép. Máy chủ kiểm tra từng gợi ý bằng bộ mô phỏng. Thầy cô quyết định áp dụng; học sinh chỉ thấy câu mục tiêu do hệ thống tạo sau khi thầy cô xuất bản và giao bài.",
    saveFirst: "Lưu bài học trước, rồi mới nhờ AI gợi ý thử thách. Gợi ý dựa trên bản đã lưu.",
    noModel: "Chưa có mô hình được duyệt phạm vi tham số, nên chưa thể gợi ý thử thách.",
    locked: "Bài học đã có bài làm hoặc đã được giao, nên không đổi được thử thách. Hãy tạo bản sao để thay đổi.",
    notDraft: "Chỉ bản nháp riêng của thầy cô mới nhận gợi ý thử thách.",
    notPrivate: "Bài dùng chung không sửa trực tiếp. Hãy tạo bản riêng trước.",
    noClass: "Cần ít nhất một lớp đang hoạt động của thầy cô để yêu cầu AI.",
    classLabel: "Lớp dùng để yêu cầu",
    countLabel: "Số gợi ý",
    instruction: "Chỉ dẫn thêm (không bắt buộc)",
    instructionHint: "Chỉ ghi yêu cầu chuyên môn. Không dán tên, bài làm hay thông tin cá nhân của học sinh.",
    chars: (n: number) => `${n}/1000 ký tự`,
    quota: (used: number, limit: number, active: number, conc: number) => `Đã dùng ${used}/${limit} lượt trong 24 giờ · đang chạy ${active}/${conc}`,
    quotaFull: "Đã hết lượt hoặc đang chạy đủ số yêu cầu. Thử lại sau.",
    request: "Nhờ AI gợi ý",
    sending: "Đang gửi…",
    recent: "Yêu cầu gần đây cho bài này",
    open: "Mở",
    close: "Đóng",
    processing: "AI đang soạn gợi ý. Có thể mất vài giây.",
    stillProcessing: "Yêu cầu vẫn đang chạy. Thầy cô có thể kiểm tra lại hoặc hủy.",
    checkAgain: "Kiểm tra lại",
    cancel: "Hủy yêu cầu",
    status: { PENDING: "Đang chờ", RUNNING: "Đang chạy", SUCCEEDED: "Hoàn tất", FAILED: "Không thành công", CANCELLED: "Đã hủy" } as Record<string, string>,
    createdAt: (at: string) => `Tạo lúc ${at}`,
    summary: (valid: number, requested: number, dropped: number) => `${valid}/${requested} gợi ý hợp lệ${dropped > 0 ? `, ${dropped} bị loại` : ""}.`,
    droppedTitle: "Gợi ý bị loại sau khi kiểm tra",
    reasons: {
      MODEL_NOT_ALLOWED: "phòng thực hành không nằm trong danh sách cho phép",
      PARAMS_OUT_OF_RANGE: "tham số ngoài khoảng cho phép",
      PARAMS_OUTSIDE_PACK_RANGE: "tham số ngoài khoảng của gói mô phỏng đang dùng",
      GROUNDING_REF_INVALID: "dẫn chiếu đoạn bài học không hợp lệ",
      OUTCOME_INVALID: "mã yêu cầu cần đạt không hợp lệ",
      NO_REFERENCE_STATES: "chưa có trạng thái tham chiếu để kiểm tra",
      CHALLENGE_UNSOLVABLE: "không có trạng thái tham chiếu nào đạt với tham số này",
      CHALLENGE_NOT_DISCRIMINATING: "mọi trạng thái tham chiếu đều đạt nên thử thách không phân biệt được",
      DUPLICATE_PROPOSAL: "trùng với một gợi ý khác hoặc với thử thách hiện tại của bài",
      SAFETY_REJECTED: "nội dung không đạt kiểm tra an toàn",
      LENGTH_INVALID: "phần giải thích quá ngắn hoặc quá dài",
      OVER_COUNT: "vượt quá số gợi ý đã yêu cầu",
    } as Record<string, string>,
    reasonFallback: "không hợp lệ",
    failedUnavailable: "Dịch vụ AI tạm thời không khả dụng. Thầy cô gửi lại như một yêu cầu mới.",
    failedSchema: "AI trả về kết quả sai định dạng. Thầy cô gửi lại như một yêu cầu mới.",
    failedValidation: "Không có gợi ý nào hợp lệ sau khi kiểm tra.",
    failedOther: "Yêu cầu không thành công. Thầy cô thử lại sau.",
    cancelled: "Yêu cầu đã bị hủy; kết quả đến muộn không được lưu.",
    changed: "Nội dung bài học đã thay đổi từ lúc tạo gợi ý. Hãy xem lại trước khi áp dụng.",
    labs: { circuit: "Mạch điện", chemistry: "Hóa học", eye: "Cấu tạo mắt" } as Record<string, string>,
    labName: (name: string) => `Phòng thực hành: ${name}`,
    params: "Tham số đề xuất",
    allowed: (bounds: string) => `khoảng cho phép ${bounds}`,
    objective: "Câu mục tiêu học sinh sẽ thấy (do hệ thống tạo, không phải AI viết)",
    engine: "Kết quả của bộ mô phỏng trên các trạng thái tham chiếu",
    engineCount: (passed: number, total: number) => `Đạt ${passed}/${total} trạng thái tham chiếu`,
    engineNote: "Chỉ để thầy cô xem. Đây không phải bài làm hay dữ liệu học tập của học sinh.",
    referenceBuiltin: "Trạng thái tham chiếu mẫu của hệ thống (chưa có gói hoặc cấu hình riêng).",
    rationale: "Lý do AI nêu",
    teacherOnly: "chỉ giáo viên thấy",
    reject: "Bỏ gợi ý",
    apply: "Áp dụng vào bài học",
    applying: "Đang áp dụng…",
    rejected: "Đã bỏ",
    appliedBadge: "Đã áp dụng",
    appliedTitle: "Đã áp dụng vào bài học",
    appliedNote: "Lab và tham số đã được điền vào mục Chương trình và thử thách bên dưới. Thầy cô có thể chỉnh giá trị trong khoảng cho phép rồi bấm Lưu; học sinh chỉ thấy thử thách sau khi thầy cô xuất bản và giao bài.",
    preview: "Xem trước bài học",
    noOpen: "Mọi gợi ý đã được bỏ. Thầy cô có thể gửi một yêu cầu mới.",
    stale: "Gợi ý này không còn hợp lệ vì phạm vi tham số hoặc danh sách mô hình đã đổi. Hãy gửi một yêu cầu mới.",
  },
  en: {
    action: "Suggest a challenge with AI",
    eyebrow: "AI ASSISTANT · TEACHERS ONLY",
    lead: "AI only proposes an existing practice lab and parameter values inside the allowed ranges. The server checks every suggestion with the simulation engine. You decide what to apply; students only see the objective sentence the system writes after you publish and assign the lesson.",
    saveFirst: "Save the lesson first, then ask AI for a challenge. Suggestions use the saved version.",
    noModel: "No model has reviewed parameter ranges yet, so challenges cannot be suggested.",
    locked: "This lesson already has results or is assigned, so its challenge cannot change. Make a copy to change it.",
    notDraft: "Only your own private drafts can receive challenge suggestions.",
    notPrivate: "A shared lesson cannot be edited directly. Make a private copy first.",
    noClass: "You need at least one active class of your own to make an AI request.",
    classLabel: "Class used for the request",
    countLabel: "Number of suggestions",
    instruction: "Extra instruction (optional)",
    instructionHint: "Write subject requirements only. Do not paste student names, work or personal details.",
    chars: (n: number) => `${n}/1000 characters`,
    quota: (used: number, limit: number, active: number, conc: number) => `Used ${used}/${limit} requests in 24 hours · ${active}/${conc} running`,
    quotaFull: "You are out of requests or have too many running. Try again later.",
    request: "Ask AI for suggestions",
    sending: "Sending…",
    recent: "Recent requests for this lesson",
    open: "Open",
    close: "Close",
    processing: "AI is drafting suggestions. This can take a few seconds.",
    stillProcessing: "The request is still running. You can check again or cancel it.",
    checkAgain: "Check again",
    cancel: "Cancel request",
    status: { PENDING: "Waiting", RUNNING: "Running", SUCCEEDED: "Done", FAILED: "Failed", CANCELLED: "Cancelled" },
    createdAt: (at: string) => `Created ${at}`,
    summary: (valid: number, requested: number, dropped: number) => `${valid}/${requested} suggestions are valid${dropped > 0 ? `, ${dropped} dropped` : ""}.`,
    droppedTitle: "Suggestions dropped by the checks",
    reasons: {
      MODEL_NOT_ALLOWED: "the lab is not on the allowed list",
      PARAMS_OUT_OF_RANGE: "a parameter is outside the allowed range",
      PARAMS_OUTSIDE_PACK_RANGE: "a parameter is outside the range of the active simulation pack",
      GROUNDING_REF_INVALID: "the lesson passage reference is not valid",
      OUTCOME_INVALID: "the learning outcome code is not valid",
      NO_REFERENCE_STATES: "there are no reference states to check against",
      CHALLENGE_UNSOLVABLE: "no reference state passes with these parameters",
      CHALLENGE_NOT_DISCRIMINATING: "every reference state passes, so the challenge does not tell anything apart",
      DUPLICATE_PROPOSAL: "it repeats another suggestion or the lesson's current challenge",
      SAFETY_REJECTED: "the text failed the safety check",
      LENGTH_INVALID: "the explanation is too short or too long",
      OVER_COUNT: "it is more than the number requested",
    },
    reasonFallback: "not valid",
    failedUnavailable: "The AI service is temporarily unavailable. Send the request again as a new request.",
    failedSchema: "The AI answered in the wrong format. Send the request again as a new request.",
    failedValidation: "No suggestion was valid after the checks.",
    failedOther: "The request did not succeed. Try again later.",
    cancelled: "The request was cancelled; a late result is not saved.",
    changed: "The lesson changed after these suggestions were made. Review them before applying.",
    labs: { circuit: "Circuits", chemistry: "Chemistry", eye: "Eye structure" },
    labName: (name: string) => `Practice lab: ${name}`,
    params: "Proposed parameters",
    allowed: (bounds: string) => `allowed ${bounds}`,
    objective: "Objective sentence students will see (written by the system, not by AI)",
    engine: "Simulation engine results on the reference states",
    engineCount: (passed: number, total: number) => `Passes ${passed}/${total} reference states`,
    engineNote: "For you only. This is not student work or learning data.",
    referenceBuiltin: "Built-in reference states (no pack or configuration of its own yet).",
    rationale: "Reason AI gave",
    teacherOnly: "teachers only",
    reject: "Reject suggestion",
    apply: "Apply to lesson",
    applying: "Applying…",
    rejected: "Rejected",
    appliedBadge: "Applied",
    appliedTitle: "Applied to the lesson",
    appliedNote: "The lab and parameters are filled in under Curriculum and challenge below. You can adjust the values inside the allowed ranges and press Save; students only see the challenge after you publish and assign the lesson.",
    preview: "Preview the lesson",
    noOpen: "Every suggestion was rejected. You can send a new request.",
    stale: "This suggestion is no longer valid because the parameter ranges or the model list changed. Send a new request.",
  },
});

type ClassSummary = { id: string; name: string; status: string };
type Props = {
  lesson: { id?: string | null; title?: string; status?: string; scope?: string };
  meta?: { structureLocked?: boolean };
  parameters?: ChallengeParameters;
  onApplied: (applied: ApplyResult["lesson"]) => void;
  onPreview: (lessonId: string) => void;
};

/**
 * "Gợi ý thử thách bằng AI" (TAI6-T4). Loaded on demand by the teacher lesson editor only. Flow: request -> follow the
 * job -> compare proposals (parameters, deterministic objective, engine results, teacher-only rationale) -> reject or
 * apply one to the draft lesson. Apply re-validates on the server; the editor then holds the applied values, which the
 * teacher may still tune inside the allowed ranges before saving.
 */
export default function LabChallengeEntry(props: Props) {
  const t = text();
  const [open, setOpen] = useState(false);
  const reason = unavailableReason(props.lesson, props.meta, props.parameters);
  if (reason) return <p className="tiny muted lab-challenge-disabled" data-testid="lab-challenge-disabled">{t[REASON_COPY[reason]]}</p>;
  return (
    <div className="lab-challenge">
      {!open && (
        <button type="button" className="secondary lab-challenge-open" onClick={() => setOpen(true)}>
          <Sparkles size={15} aria-hidden="true" /> {t.action}
        </button>
      )}
      {open && <LabChallengePanel {...props} onClose={() => setOpen(false)} />}
    </div>
  );
}
const REASON_COPY: Record<Unavailable, "noModel" | "saveFirst" | "notDraft" | "notPrivate" | "locked"> = {
  no_model: "noModel",
  not_saved: "saveFirst",
  not_draft: "notDraft",
  not_private: "notPrivate",
  locked: "locked",
};

function LabChallengePanel({ lesson, parameters, onApplied, onPreview, onClose }: Props & { onClose: () => void }) {
  const t = text();
  const qc = useQueryClient();
  const lessonId = lesson.id!;
  const classes = useQuery<ClassSummary[]>({ queryKey: ["classes", "ACTIVE"], queryFn: () => api("/classes?status=ACTIVE") });
  const [classId, setClassId] = useState("");
  useEffect(() => {
    if (!classId && classes.data?.length) setClassId(classes.data[0].id);
  }, [classes.data, classId]);
  const quota = useQuery({ queryKey: ["ai-quota", "DRAFT_LAB_CHALLENGE"], queryFn: labQuota });
  const recent = useQuery({ queryKey: ["lab-jobs", classId], queryFn: () => listLabJobs(classId), enabled: !!classId });
  const [count, setCount] = useState(3);
  const [instruction, setInstruction] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [credit, setCredit] = useState<CreditEstimateValue>();
  const creditBody = useMemo(
    () => (classId ? { purpose: "DRAFT_LAB_CHALLENGE" as const, lessonId, proposalCount: count, ...(instruction.trim() ? { instruction: instruction.trim() } : {}) } : null),
    [classId, lessonId, count, instruction],
  );
  const creditShort = !!credit && credit.enabled && credit.available < credit.credits;
  const creditWait = !!classId && !credit;
  // One key per request attempt, so a double click replays the same job instead of creating two.
  const requestKey = useRef(idempotencyKey());

  const create = useMutation({
    mutationFn: () =>
      createLabJob(classId, { lessonId, proposalCount: count, ...(instruction.trim() ? { instruction: instruction.trim() } : {}), ...(credit?.enabled ? { confirmedCredits: credit.credits } : {}) }, requestKey.current),
    onSuccess: (job) => {
      requestKey.current = idempotencyKey();
      qc.invalidateQueries({ queryKey: ["my-credits"] });
      qc.invalidateQueries({ queryKey: ["ai-quota"] });
      qc.invalidateQueries({ queryKey: ["lab-jobs", classId] });
      qc.setQueryData(["lab-job", classId, job.id], job);
      setJobId(job.id);
    },
  });
  const q = quota.data;
  const quotaFull = !!q && (q.usedLast24h >= q.dailyLimit || q.activeJobs >= q.concurrencyLimit);
  const lessonJobs = jobsForLesson(recent.data?.items ?? [], lessonId).slice(0, 3);

  return (
    <section className="lab-challenge-panel" aria-labelledby={`lab-title-${lessonId}`}>
      <div className="lab-challenge-head">
        <FlaskConical size={18} aria-hidden="true" />
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h3 id={`lab-title-${lessonId}`}>{t.action}</h3>
          <p className="tiny muted">{t.lead}</p>
        </div>
        <button type="button" className="icon-button" aria-label={t.close} onClick={onClose}><X size={16} /></button>
      </div>

      {classes.data && classes.data.length === 0 && <p className="notice" role="status">{t.noClass}</p>}
      {classes.data && classes.data.length > 0 && (
        <fieldset className="form-lock lab-challenge-form" disabled={create.isPending}>
          <div className="form-grid">
            <label className="field">
              <span>{t.classLabel}</span>
              <select value={classId} onChange={(event) => setClassId(event.target.value)}>
                {classes.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>{t.countLabel}</span>
              <select value={count} onChange={(event) => { setCount(Number(event.target.value)); requestKey.current = idempotencyKey(); }}>
                {Array.from({ length: MAX_PROPOSALS }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <label className="field">
            <span>{t.instruction}</span>
            <textarea rows={2} maxLength={1000} value={instruction} onChange={(event) => { setInstruction(event.target.value); requestKey.current = idempotencyKey(); }} />
            <small className="tiny muted">{t.instructionHint} {t.chars(instruction.length)}</small>
          </label>
          {q && <p className="tiny muted">{t.quota(q.usedLast24h, q.dailyLimit, q.activeJobs, q.concurrencyLimit)}</p>}
          {quotaFull && <p className="notice" role="status">{t.quotaFull}</p>}
          {creditBody && (
            <Suspense fallback={null}>
              <AiCreditEstimate classId={classId} body={creditBody as never} error={create.error} onChange={setCredit} />
            </Suspense>
          )}
          <ErrorBox error={create.error && CREDIT_ERROR_CODES.some((code) => isApiError(create.error, code)) ? null : create.error} />
          <button type="button" className="primary" disabled={create.isPending || !classId || quotaFull || creditWait || creditShort} onClick={() => create.mutate()}>
            <Sparkles size={15} aria-hidden="true" /> {create.isPending ? t.sending : t.request}
          </button>
        </fieldset>
      )}

      {lessonJobs.length > 0 && (
        <div className="lab-challenge-recent">
          <b className="tiny">{t.recent}</b>
          <ul>
            {lessonJobs.map((job) => (
              <li key={job.id}>
                <span className="tiny">{formatDateTime(job.createdAt)} · {t.status[job.status] ?? job.status}{job.appliedItemId ? ` · ${t.appliedBadge}` : ""}</span>
                <button type="button" className="text-button" onClick={() => setJobId(job.id)}>{t.open}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {jobId && classId && <LabJobDetail key={jobId} classId={classId} jobId={jobId} parameters={parameters} onApplied={onApplied} onPreview={onPreview} onClose={() => setJobId(null)} />}
    </section>
  );
}

function LabJobDetail({ classId, jobId, parameters, onApplied, onPreview, onClose }: { classId: string; jobId: string; parameters?: ChallengeParameters; onApplied: Props["onApplied"]; onPreview: Props["onPreview"]; onClose: () => void }) {
  const t = text();
  const qc = useQueryClient();
  const [pollStartedAt, setPollStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const job = useQuery({
    queryKey: ["lab-job", classId, jobId],
    queryFn: () => getLabJob(classId, jobId),
    refetchInterval: (query) => {
      const data = query.state.data as LabJobView | undefined;
      return data && ACTIVE_STATUSES.includes(data.status) && Date.now() - pollStartedAt < POLL_LIMIT_MS ? POLL_INTERVAL_MS : false;
    },
  });
  const data = job.data;
  const active = !!data && ACTIVE_STATUSES.includes(data.status);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (data && !ACTIVE_STATUSES.includes(data.status)) {
      qc.invalidateQueries({ queryKey: ["lab-jobs", classId] });
      qc.invalidateQueries({ queryKey: ["ai-quota"] });
      qc.invalidateQueries({ queryKey: ["my-credits"] });
    }
  }, [data?.status]);
  const stillProcessing = active && now - pollStartedAt >= POLL_LIMIT_MS;
  const refresh = (view: LabJobView) => {
    qc.setQueryData(["lab-job", classId, jobId], view);
    qc.invalidateQueries({ queryKey: ["lab-jobs", classId] });
  };
  const cancel = useMutation({
    mutationFn: () => cancelLabJob(classId, jobId),
    onSuccess: (view) => {
      refresh(view);
      qc.invalidateQueries({ queryKey: ["ai-quota"] });
      qc.invalidateQueries({ queryKey: ["my-credits"] });
    },
  });
  const [applied, setApplied] = useState<ApplyResult | null>(null);
  const phase = data ? jobPhase(data) : "active";
  const failure = (code: string | null) =>
    code === "PROVIDER_UNAVAILABLE" || code === "PROVIDER_TIMEOUT" ? t.failedUnavailable : code === "OUTPUT_SCHEMA_INVALID" ? t.failedSchema : code === "OUTPUT_VALIDATION_FAILED" ? t.failedValidation : t.failedOther;
  const reasons = data ? droppedSummary(data.dropped ?? []) : [];

  return (
    <article className="lab-challenge-job" aria-live="polite">
      <div className="lab-challenge-job-head">
        <div>
          {data && <small className="muted">{t.createdAt(formatDateTime(data.createdAt))}</small>}
        </div>
        {data && <Badge tone={phase === "failed" ? "not_passed" : phase === "applied" ? "passed" : ""}>{t.status[data.status] ?? data.status}</Badge>}
        <button type="button" className="icon-button" aria-label={t.close} onClick={onClose}><X size={16} /></button>
      </div>
      <ErrorBox error={job.error} />
      {data?.credits && (
        <Suspense fallback={null}>
          <AiJobCredits credits={data.credits} />
        </Suspense>
      )}
      {active && !stillProcessing && <p className="notice" role="status"><RefreshCw size={14} className="spin" aria-hidden="true" /> {t.processing}</p>}
      {stillProcessing && (
        <div className="notice" role="status">
          {t.stillProcessing}{" "}
          <button type="button" className="secondary button-compact" onClick={() => { setPollStartedAt(Date.now()); setNow(Date.now()); job.refetch(); }}>{t.checkAgain}</button>
        </div>
      )}
      {active && <div className="button-row"><button type="button" className="danger-text" disabled={cancel.isPending} onClick={() => cancel.mutate()}>{t.cancel}</button></div>}
      <ErrorBox error={cancel.error} />
      {phase === "failed" && data && (
        <div className="notice" role="alert">
          <AlertTriangle size={14} aria-hidden="true" /> {failure(data.failureCode)}
          {reasons.length > 0 && <ReasonList reasons={reasons} />}
        </div>
      )}
      {phase === "cancelled" && <p className="notice" role="status">{t.cancelled}</p>}
      {data && (phase === "review" || phase === "applied") && (
        <>
          <p className="notice" role="status">{t.summary(data.validCount ?? 0, data.requestedCount, data.droppedCount ?? 0)}</p>
          {data.lessonChangedSinceGeneration && <p className="notice warning-text" role="status"><AlertTriangle size={14} aria-hidden="true" /> {t.changed}</p>}
          {reasons.length > 0 && <div className="tiny muted"><b>{t.droppedTitle}</b><ReasonList reasons={reasons} /></div>}
          {phase === "review" && openProposals(data).length === 0 && <p className="notice" role="status">{t.noOpen}</p>}
          <ul className="lab-challenge-cards">
            {(data.proposals ?? []).map((proposal) => (
              <ProposalCard
                key={proposal.id}
                classId={classId}
                jobId={jobId}
                proposal={proposal}
                parameters={parameters}
                job={data}
                onJob={refresh}
                onApplied={(result) => {
                  setApplied(result);
                  qc.invalidateQueries({ queryKey: ["lab-job", classId, jobId] });
                  qc.invalidateQueries({ queryKey: ["lessons"] });
                  qc.invalidateQueries({ queryKey: ["teacher-content"] });
                  onApplied(result.lesson);
                }}
              />
            ))}
          </ul>
        </>
      )}
      {applied && (
        <div className="notice lab-challenge-applied" role="status" data-testid="lab-challenge-applied">
          <Check size={14} aria-hidden="true" /> <b>{t.appliedTitle}</b>
          <p className="tiny">{applied.objectivePreview}</p>
          <p className="tiny muted">{t.appliedNote}</p>
          <button type="button" className="secondary button-compact" onClick={() => onPreview(applied.lesson.id)}>{t.preview}</button>
        </div>
      )}
    </article>
  );
}

function ReasonList({ reasons }: { reasons: Array<{ code: string; count: number }> }) {
  const t = text();
  return (
    <ul className="lab-challenge-reasons">
      {reasons.map((reason) => <li key={reason.code}>{reason.count}× {t.reasons[reason.code] ?? t.reasonFallback}</li>)}
    </ul>
  );
}

function ProposalCard({ classId, jobId, proposal, parameters, job, onJob, onApplied }: { classId: string; jobId: string; proposal: LabProposalCard; parameters?: ChallengeParameters; job: LabJobView; onJob: (view: LabJobView) => void; onApplied: (result: ApplyResult) => void }) {
  const t = text();
  const { labId, challengeParams, rationale } = proposal.proposal;
  const rows = paramRows(labId, challengeParams, parameters);
  const summary = engineSummary(proposal.engineResults);
  const rejected = proposal.decision?.decision === "REJECTED";
  const accepted = job.appliedItemId === proposal.id;
  const decided = !!job.appliedItemId;
  // One apply key per proposal: a double click or a retried request replays the same apply instead of repeating it.
  const applyKey = useRef(idempotencyKey());
  const reject = useMutation({ mutationFn: () => rejectLabProposal(classId, jobId, proposal.id, "NOT_SUITABLE"), onSuccess: onJob });
  const apply = useMutation({ mutationFn: () => applyLabProposal(classId, jobId, proposal.id, applyKey.current), onSuccess: onApplied });
  const stale = isApiError(apply.error, "AI_PROPOSAL_NO_LONGER_VALID");
  return (
    <li className={`lab-challenge-card${rejected ? " is-rejected" : ""}${accepted ? " is-applied" : ""}`}>
      <div className="lab-challenge-card-head">
        <b>{t.labName(t.labs[labId] ?? labId)}</b>
        {rejected && <Badge tone="outline">{t.rejected}</Badge>}
        {accepted && <Badge tone="passed">{t.appliedBadge}</Badge>}
      </div>
      <h4 className="tiny">{t.params}</h4>
      <dl className="lab-challenge-params">
        {rows.map((row) => (
          <div key={row.name}>
            <dt>{row.label}</dt>
            <dd>{row.value}{row.unit ? ` ${row.unit}` : ""}{row.bounds ? <small className="muted"> · {t.allowed(row.bounds)}{row.unit ? ` ${row.unit}` : ""}</small> : null}</dd>
          </div>
        ))}
      </dl>
      {proposal.objectivePreview && (
        <>
          <h4 className="tiny">{t.objective}</h4>
          <p className="lab-challenge-objective" data-testid="lab-objective">{proposal.objectivePreview}</p>
        </>
      )}
      <h4 className="tiny">{t.engine}</h4>
      <p className="tiny"><b>{t.engineCount(summary.passed, summary.total)}</b></p>
      <ul className="lab-challenge-engine">
        {proposal.engineResults.map((result) => (
          <li key={result.label}><span>{result.label}</span> <Badge tone={result.verdict === "passed" ? "passed" : "outline"}>{verdictLabel(result.verdict)}</Badge></li>
        ))}
      </ul>
      <p className="tiny muted">{t.engineNote}{proposal.referenceSource === "BUILTIN" ? ` ${t.referenceBuiltin}` : ""}</p>
      <h4 className="tiny">{t.rationale} <Badge tone="outline">{t.teacherOnly}</Badge></h4>
      <p className="lab-challenge-rationale" data-testid="lab-rationale">{rationale}</p>
      {!rejected && !decided && (
        <div className="button-row">
          <button type="button" className="primary" disabled={apply.isPending || reject.isPending} onClick={() => apply.mutate()}>
            <Check size={15} aria-hidden="true" /> {apply.isPending ? t.applying : t.apply}
          </button>
          <button type="button" className="danger-text" disabled={apply.isPending || reject.isPending} onClick={() => reject.mutate()}>{t.reject}</button>
        </div>
      )}
      {stale ? <p className="notice warning-text" role="alert">{t.stale}</p> : <ErrorBox error={apply.error} />}
      <ErrorBox error={reject.error} />
    </li>
  );
}
