import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Check, Pencil, RefreshCw, Sparkles, X } from "lucide-react";
import { idempotencyKey, isApiError } from "../../lib/api";
import { Badge, ErrorBox, Modal } from "../../components/ui";
import { defineText, formatDateTime } from "../../i18n";
import {
  ACTIVE_STATUSES,
  aiQuota,
  cancelAiJob,
  createAiJob,
  decideAiItem,
  effectivePayload,
  getAiJob,
  listAiJobs,
  materializeAiJob,
  MAX_ITEMS,
  POLL_INTERVAL_MS,
  POLL_LIMIT_MS,
  type AiCardItem,
  type AiDifficulty,
  type AiItemPayload,
  type AiJobItem,
  type AiJobView,
  type AiQuestionItem,
  type AiTargetKind,
} from "./teacher-ai-api";

// TAI-05: credit UI is loaded on demand. This panel is also part of the shared class chunk, so it carries no credit copy.
const AiCreditEstimate = lazy(() => import("../credits/AiCreditEstimate"));
const AiJobCredits = lazy(() => import("../credits/AiJobCredits"));
type CreditEstimateValue = { enabled: boolean; credits: number; available: number } | undefined;
const CREDIT_ERROR_CODES = ["AI_ESTIMATE_CHANGED", "AI_CREDITS_INSUFFICIENT"];

const text = defineText({
  vi: {
    eyebrow: "TRỢ LÝ AI · CHỈ GIÁO VIÊN",
    title: "Soạn nháp bằng AI",
    lead: "AI chỉ tạo bản nháp từ bài học đã chọn. Thầy cô duyệt từng mục; học sinh chỉ thấy nội dung sau khi thầy cô xuất bản.",
    kinds: { DECK: "Thẻ học", STUDY_QUIZ: "Quiz luyện tập không điểm", TEST: "Bài kiểm tra" } as Record<AiTargetKind, string>,
    contentType: "Loại nội dung",
    lesson: "Bài học làm căn cứ",
    chooseLesson: "Chọn bài học",
    grade: (g: number) => `Khối ${g}`,
    itemCount: (max: number) => `Số mục (tối đa ${max})`,
    difficulty: "Mức độ",
    anyDifficulty: "Không chỉ định",
    difficulties: { FOUNDATION: "Cơ bản", STANDARD: "Vừa", ADVANCED: "Nâng cao" } as Record<AiDifficulty, string>,
    instruction: "Chỉ dẫn thêm (không bắt buộc)",
    instructionHint: "Chỉ ghi yêu cầu chuyên môn. Không dán tên, bài làm hay thông tin cá nhân của học sinh.",
    chars: (n: number) => `${n}/1000 ký tự`,
    quota: (used: number, limit: number, active: number, conc: number) => `Đã dùng ${used}/${limit} lượt trong 24 giờ · đang chạy ${active}/${conc}`,
    quotaReset: (at: string) => `Lượt đầu tiên được hoàn lại lúc ${at}`,
    quotaFull: "Đã hết lượt hoặc đang chạy đủ số yêu cầu. Thử lại sau.",
    generate: "Tạo bản nháp bằng AI",
    sending: "Đang gửi…",
    recent: "Yêu cầu gần đây",
    noJobs: "Chưa có yêu cầu AI nào trong lớp này.",
    open: "Mở",
    statuses: { PENDING: "Đang chờ", RUNNING: "Đang tạo", SUCCEEDED: "Sẵn sàng duyệt", FAILED: "Thất bại", CANCELLED: "Đã hủy" } as Record<string, string>,
    materialized: "Đã tạo bản nháp",
    jobHeading: (kind: string, n: number) => `${kind} · ${n} mục yêu cầu`,
    createdAt: (at: string) => `Tạo lúc ${at}`,
    processing: "AI đang soạn nội dung. Trang tự cập nhật mỗi 2 giây.",
    stillProcessing: "Yêu cầu vẫn đang xử lý lâu hơn dự kiến. Thầy cô có thể kiểm tra lại sau.",
    checkAgain: "Kiểm tra lại",
    cancel: "Hủy yêu cầu",
    cancelled: "Yêu cầu đã bị hủy. Kết quả đến sau (nếu có) sẽ bị bỏ qua.",
    failed: (reason: string) => `Không tạo được bản nháp: ${reason}`,
    failureCodes: {
      PROVIDER_UNAVAILABLE: "Dịch vụ AI tạm thời không khả dụng",
      PROVIDER_TIMEOUT: "Dịch vụ AI phản hồi quá lâu",
      OUTPUT_SCHEMA_INVALID: "AI trả về dữ liệu không đúng định dạng",
      OUTPUT_VALIDATION_FAILED: "Không có mục nào đạt yêu cầu kiểm tra",
      LESSON_UNAVAILABLE: "Bài học không còn khả dụng",
      INTERNAL_ERROR: "Lỗi hệ thống",
    } as Record<string, string>,
    retryAsNew: "Tạo lại với cùng thiết lập",
    summary: (valid: number, requested: number, dropped: number) =>
      dropped > 0 ? `${valid}/${requested} mục hợp lệ, ${dropped} mục bị loại do không đạt kiểm tra` : `${valid}/${requested} mục hợp lệ`,
    stale: "Bài học đã thay đổi sau khi tạo yêu cầu này. Thầy cô vẫn có thể duyệt, nhưng hãy kiểm tra lại nội dung.",
    progress: (done: number, total: number) => `Đã quyết định ${done}/${total} mục`,
    item: (n: number) => `Mục ${n}`,
    correct: "Đáp án đúng",
    explanation: "Giải thích",
    sources: (refs: string) => `Căn cứ: đoạn ${refs}`,
    front: "Mặt trước",
    back: "Mặt sau",
    flags: {
      EXACT_DUPLICATE: "Trùng với câu đã có",
      NEAR_DUPLICATE: "Gần giống câu đã có",
      EXACT_DUPLICATE_ELSEWHERE: "Trùng với câu ở lớp khác/thư viện",
      NEAR_DUPLICATE_ELSEWHERE: "Gần giống câu ở lớp khác/thư viện",
      BATCH_DUPLICATE: "Trùng với mục khác trong lượt này",
      NUMERIC_REVIEW: "Có số liệu, cần kiểm tra phép tính",
      ANSWER_LENGTH_CUE: "Đáp án đúng dài hơn hẳn, dễ đoán",
      NEGATIVE_STEM: "Câu hỏi dạng phủ định",
      DIFFICULTY_MISMATCH: "Khác mức độ yêu cầu",
    } as Record<string, string>,
    duplicateOf: (title: string, pct: number, exact: boolean) => `${exact ? "Trùng" : "Gần giống"} với “${title}” (${pct}%)`,
    inClass: (name: string) => ` · lớp ${name}`,
    inLibrary: " · thư viện bài học",
    duplicateWarn: "Đây chỉ là cảnh báo; thầy cô vẫn có thể giữ mục này.",
    decisions: { ACCEPTED: "Giữ", EDITED: "Đã sửa", REJECTED: "Bỏ" } as Record<string, string>,
    keep: "Giữ",
    edit: "Sửa",
    reject: "Bỏ",
    rejectReason: "Lý do bỏ",
    reasons: {
      WRONG_ANSWER: "Đáp án sai",
      INACCURATE: "Sai kiến thức",
      OFF_TOPIC: "Không đúng trọng tâm",
      DUPLICATE: "Trùng lặp",
      UNCLEAR: "Diễn đạt chưa rõ",
      OTHER: "Lý do khác",
    } as Record<string, string>,
    confirmReject: "Xác nhận bỏ",
    cancelEdit: "Hủy",
    saveEdit: "Lưu bản sửa",
    prompt: "Câu hỏi",
    option: (n: number) => `Phương án ${String.fromCharCode(65 + n)}`,
    addOption: "Thêm phương án",
    removeOption: "Xóa phương án",
    markCorrect: "Đáp án đúng",
    editedFlags: "Cảnh báo cho bản sửa",
    materialize: "Tạo bản nháp tài nguyên",
    materializeHint: "Cần quyết định mọi mục và giữ ít nhất một mục.",
    materializeTitle: "Tạo bản nháp từ các mục đã giữ",
    resourceName: "Tên tài nguyên",
    materializeLead: (kept: number, kind: string) => `${kept} mục sẽ được đưa vào một ${kind} ở trạng thái bản nháp. Học sinh chưa thấy cho đến khi thầy cô xuất bản.`,
    create: "Tạo bản nháp",
    creating: "Đang tạo…",
    done: (title: string) => `Đã tạo bản nháp “${title}”. Bản nháp đã được mở trong danh sách tài nguyên bên dưới để chỉnh sửa và xuất bản.`,
    alreadyDone: "Bản nháp đã được tạo từ yêu cầu này.",
    viewDraft: "Xem bản nháp",
    close: "Đóng",
  },
  en: {
    eyebrow: "AI ASSISTANT · TEACHERS ONLY",
    title: "Draft with AI",
    lead: "AI only drafts from the selected lesson. You review every item; students see nothing until you publish.",
    kinds: { DECK: "Study cards", STUDY_QUIZ: "Ungraded practice quiz", TEST: "Test" } as Record<AiTargetKind, string>,
    contentType: "Content type",
    lesson: "Source lesson",
    chooseLesson: "Choose a lesson",
    grade: (g: number) => `Grade ${g}`,
    itemCount: (max: number) => `Number of items (max ${max})`,
    difficulty: "Difficulty",
    anyDifficulty: "Not specified",
    difficulties: { FOUNDATION: "Foundation", STANDARD: "Standard", ADVANCED: "Advanced" } as Record<AiDifficulty, string>,
    instruction: "Extra instruction (optional)",
    instructionHint: "Subject guidance only. Never paste student names, work or personal details.",
    chars: (n: number) => `${n}/1000 characters`,
    quota: (used: number, limit: number, active: number, conc: number) => `Used ${used}/${limit} in 24 hours · running ${active}/${conc}`,
    quotaReset: (at: string) => `The oldest use frees up at ${at}`,
    quotaFull: "No uses left or too many requests running. Try again later.",
    generate: "Draft with AI",
    sending: "Sending…",
    recent: "Recent requests",
    noJobs: "No AI requests in this class yet.",
    open: "Open",
    statuses: { PENDING: "Waiting", RUNNING: "Drafting", SUCCEEDED: "Ready to review", FAILED: "Failed", CANCELLED: "Cancelled" } as Record<string, string>,
    materialized: "Draft created",
    jobHeading: (kind: string, n: number) => `${kind} · ${n} items requested`,
    createdAt: (at: string) => `Created ${at}`,
    processing: "The AI is drafting. This page refreshes every 2 seconds.",
    stillProcessing: "The request is taking longer than expected. You can check again later.",
    checkAgain: "Check again",
    cancel: "Cancel request",
    cancelled: "The request was cancelled. Any late result is discarded.",
    failed: (reason: string) => `The draft could not be created: ${reason}`,
    failureCodes: {
      PROVIDER_UNAVAILABLE: "The AI service is temporarily unavailable",
      PROVIDER_TIMEOUT: "The AI service took too long",
      OUTPUT_SCHEMA_INVALID: "The AI returned data in the wrong format",
      OUTPUT_VALIDATION_FAILED: "No item passed the checks",
      LESSON_UNAVAILABLE: "The lesson is no longer available",
      INTERNAL_ERROR: "System error",
    } as Record<string, string>,
    retryAsNew: "Try again with the same settings",
    summary: (valid: number, requested: number, dropped: number) =>
      dropped > 0 ? `${valid}/${requested} items valid, ${dropped} removed by the checks` : `${valid}/${requested} items valid`,
    stale: "The lesson changed after this request. You can still review, but check the content again.",
    progress: (done: number, total: number) => `${done}/${total} items decided`,
    item: (n: number) => `Item ${n}`,
    correct: "Correct answer",
    explanation: "Explanation",
    sources: (refs: string) => `Source: passage ${refs}`,
    front: "Front",
    back: "Back",
    flags: {
      EXACT_DUPLICATE: "Same as an existing question",
      NEAR_DUPLICATE: "Close to an existing question",
      EXACT_DUPLICATE_ELSEWHERE: "Same as a question in another class/library",
      NEAR_DUPLICATE_ELSEWHERE: "Close to a question in another class/library",
      BATCH_DUPLICATE: "Same as another item in this batch",
      NUMERIC_REVIEW: "Has numbers; check the calculation",
      ANSWER_LENGTH_CUE: "The correct answer is much longer",
      NEGATIVE_STEM: "Negative question stem",
      DIFFICULTY_MISMATCH: "Differs from the requested difficulty",
    } as Record<string, string>,
    duplicateOf: (title: string, pct: number, exact: boolean) => `${exact ? "Same as" : "Close to"} “${title}” (${pct}%)`,
    inClass: (name: string) => ` · class ${name}`,
    inLibrary: " · lesson library",
    duplicateWarn: "This is only a warning; you can still keep the item.",
    decisions: { ACCEPTED: "Kept", EDITED: "Edited", REJECTED: "Rejected" } as Record<string, string>,
    keep: "Keep",
    edit: "Edit",
    reject: "Reject",
    rejectReason: "Reason",
    reasons: {
      WRONG_ANSWER: "Wrong answer",
      INACCURATE: "Scientifically inaccurate",
      OFF_TOPIC: "Off topic",
      DUPLICATE: "Duplicate",
      UNCLEAR: "Unclear wording",
      OTHER: "Other reason",
    } as Record<string, string>,
    confirmReject: "Confirm reject",
    cancelEdit: "Cancel",
    saveEdit: "Save edit",
    prompt: "Question",
    option: (n: number) => `Option ${String.fromCharCode(65 + n)}`,
    addOption: "Add option",
    removeOption: "Remove option",
    markCorrect: "Correct answer",
    editedFlags: "Warnings for the edit",
    materialize: "Create resource draft",
    materializeHint: "Decide every item and keep at least one.",
    materializeTitle: "Create a draft from the kept items",
    resourceName: "Resource name",
    materializeLead: (kept: number, kind: string) => `${kept} items go into one ${kind} draft. Students see nothing until you publish.`,
    create: "Create draft",
    creating: "Creating…",
    done: (title: string) => `Draft “${title}” created. It is open in the resource list below for editing and publishing.`,
    alreadyDone: "A draft was already created from this request.",
    viewDraft: "View draft",
    close: "Close",
  },
});
const t = text();

type Lesson = { id: string; title: string; grade: number; subject: { name: string } };
const JOB_PARAM = "aiJob";

/** Teacher AI workspace (TAI-T5): generate -> follow status -> review each item -> materialize a normal DRAFT. */
export function TeacherAiPanel({ classId, lessons, onMaterialized }: { classId: string; lessons: Lesson[]; onMaterialized: (resourceId: string) => void }) {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedJobId = searchParams.get(JOB_PARAM);
  const selectJob = (jobId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (jobId) next.set(JOB_PARAM, jobId);
    else next.delete(JOB_PARAM);
    setSearchParams(next, { replace: true });
  };

  const quota = useQuery({ queryKey: ["ai-quota"], queryFn: aiQuota });
  const jobs = useQuery({ queryKey: ["ai-jobs", classId], queryFn: () => listAiJobs(classId) });

  const [targetKind, setTargetKind] = useState<AiTargetKind>("TEST");
  const [lessonId, setLessonId] = useState("");
  const [itemCount, setItemCount] = useState(10);
  const [difficulty, setDifficulty] = useState<AiDifficulty | "">("");
  const [instruction, setInstruction] = useState("");
  // TAI-05: the estimate shown for the CURRENT inputs (undefined while it is being worked out). `enabled: false` = credits off.
  const [credit, setCredit] = useState<CreditEstimateValue>();
  const creditBody = useMemo(
    () => (lessonId ? { purpose: "GENERATE_RESOURCE" as const, targetKind, lessonId, itemCount, ...(difficulty ? { difficulty } : {}), ...(instruction.trim() ? { instruction: instruction.trim() } : {}) } : null),
    [targetKind, lessonId, itemCount, difficulty, instruction],
  );
  const creditShort = !!credit && credit.enabled && credit.available < credit.credits;
  const creditWait = !!lessonId && !credit;

  const create = useMutation({
    mutationFn: () =>
      createAiJob(
        classId,
        {
          targetKind, lessonId, itemCount, ...(difficulty ? { difficulty } : {}), ...(instruction.trim() ? { instruction: instruction.trim() } : {}),
          ...(credit?.enabled ? { confirmedCredits: credit.credits } : {}),
        },
        idempotencyKey(),
      ),
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: ["my-credits"] });
      qc.invalidateQueries({ queryKey: ["ai-quota"] });
      qc.invalidateQueries({ queryKey: ["ai-jobs", classId] });
      qc.setQueryData(["ai-job", classId, job.id], job);
      selectJob(job.id);
    },
  });

  const max = MAX_ITEMS[targetKind];
  const q = quota.data;
  const quotaFull = !!q && (q.usedLast24h >= q.dailyLimit || q.activeJobs >= q.concurrencyLimit);
  const retryFrom = (job: AiJobView) => {
    setTargetKind(job.targetKind);
    setLessonId(job.lessonId);
    setItemCount(Math.min(job.requestedCount, MAX_ITEMS[job.targetKind]));
    selectJob(null);
    document.getElementById(`ai-form-${classId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="teacher-ai-panel" aria-labelledby={`ai-title-${classId}`}>
      <div className="teacher-ai-head">
        <Sparkles size={18} aria-hidden="true" />
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h3 id={`ai-title-${classId}`}>{t.title}</h3>
          <p className="tiny muted">{t.lead}</p>
        </div>
      </div>

      <form
        id={`ai-form-${classId}`}
        className="teacher-ai-form"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <fieldset className="form-lock" disabled={create.isPending}>
          <div className="import-meta-grid">
            <label className="field">
              <span>{t.contentType}</span>
              <select
                value={targetKind}
                onChange={(e) => {
                  const next = e.target.value as AiTargetKind;
                  setTargetKind(next);
                  setItemCount((n) => Math.min(n, MAX_ITEMS[next]));
                }}
              >
                {(["TEST", "STUDY_QUIZ", "DECK"] as AiTargetKind[]).map((kind) => (
                  <option key={kind} value={kind}>{t.kinds[kind]}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t.lesson}</span>
              <select required value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
                <option value="">{t.chooseLesson}</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {t.grade(lesson.grade)} · {lesson.subject.name} · {lesson.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t.itemCount(max)}</span>
              <input type="number" min={1} max={max} required value={itemCount} onChange={(e) => setItemCount(Math.max(1, Math.min(max, Number(e.target.value) || 1)))} />
            </label>
            <label className="field">
              <span>{t.difficulty}</span>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as AiDifficulty | "")}>
                <option value="">{t.anyDifficulty}</option>
                {(["FOUNDATION", "STANDARD", "ADVANCED"] as AiDifficulty[]).map((d) => (
                  <option key={d} value={d}>{t.difficulties[d]}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>{t.instruction}</span>
            <textarea rows={2} maxLength={1000} value={instruction} onChange={(e) => setInstruction(e.target.value)} />
            <small className="tiny muted">{t.instructionHint} · {t.chars(instruction.length)}</small>
          </label>
          {q && (
            <p className={`tiny ${quotaFull ? "warning-text" : "muted"}`} role="status">
              {t.quota(q.usedLast24h, q.dailyLimit, q.activeJobs, q.concurrencyLimit)}
              {quotaFull && q.resetsAt ? ` · ${t.quotaReset(formatDateTime(q.resetsAt))}` : ""}
              {quotaFull ? ` · ${t.quotaFull}` : ""}
            </p>
          )}
          {creditBody && (
            <Suspense fallback={null}>
              <AiCreditEstimate classId={classId} body={creditBody} error={create.error} onChange={setCredit} />
            </Suspense>
          )}
          <ErrorBox error={quota.error ?? (create.error && CREDIT_ERROR_CODES.some((code) => isApiError(create.error, code)) ? null : create.error)} />
          <button className="primary" disabled={create.isPending || !lessonId || quotaFull || creditWait || creditShort}>
            <Sparkles size={15} aria-hidden="true" /> {create.isPending ? t.sending : t.generate}
          </button>
        </fieldset>
      </form>

      {selectedJobId && (
        <AiJobWorkspace
          key={selectedJobId}
          classId={classId}
          jobId={selectedJobId}
          lessons={lessons}
          onClose={() => selectJob(null)}
          onRetry={retryFrom}
          onMaterialized={onMaterialized}
        />
      )}

      <div className="teacher-ai-jobs">
        <h4>{t.recent}</h4>
        <ErrorBox error={jobs.error} />
        {jobs.data?.items.length === 0 && <p className="tiny muted">{t.noJobs}</p>}
        <ul>
          {jobs.data?.items.map((job) => (
            <li key={job.id} className={job.id === selectedJobId ? "active" : ""}>
              <span>
                <b>{t.kinds[job.targetKind]}</b> · {lessons.find((l) => l.id === job.lessonId)?.title ?? job.lessonId}
                <small className="muted"> · {formatDateTime(job.createdAt)}</small>
              </span>
              <StatusBadge job={job} />
              <button type="button" className="secondary button-compact" onClick={() => selectJob(job.id)}>{t.open}</button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StatusBadge({ job }: { job: AiJobView }) {
  if (job.materializedResourceId) return <Badge>{t.materialized}</Badge>;
  const tone = job.status === "FAILED" ? "not_passed" : job.status === "SUCCEEDED" ? "passed" : "outline";
  return <Badge tone={tone}>{t.statuses[job.status]}</Badge>;
}

function AiJobWorkspace({
  classId,
  jobId,
  lessons,
  onClose,
  onRetry,
  onMaterialized,
}: {
  classId: string;
  jobId: string;
  lessons: Lesson[];
  onClose: () => void;
  onRetry: (job: AiJobView) => void;
  onMaterialized: (resourceId: string) => void;
}) {
  const qc = useQueryClient();
  const [pollStartedAt, setPollStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const job = useQuery({
    queryKey: ["ai-job", classId, jobId],
    queryFn: () => getAiJob(classId, jobId),
    refetchInterval: (query) => {
      const data = query.state.data as AiJobView | undefined;
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
      qc.invalidateQueries({ queryKey: ["ai-jobs", classId] });
      qc.invalidateQueries({ queryKey: ["ai-quota"] });
      qc.invalidateQueries({ queryKey: ["my-credits"] });
    }
  }, [data?.status]);
  const stillProcessing = active && now - pollStartedAt >= POLL_LIMIT_MS;

  const cancel = useMutation({
    mutationFn: () => cancelAiJob(classId, jobId),
    onSuccess: (view) => {
      qc.setQueryData(["ai-job", classId, jobId], view);
      qc.invalidateQueries({ queryKey: ["ai-jobs", classId] });
      qc.invalidateQueries({ queryKey: ["ai-quota"] });
      qc.invalidateQueries({ queryKey: ["my-credits"] });
    },
  });

  const lessonTitle = data ? lessons.find((l) => l.id === data.lessonId)?.title : undefined;

  return (
    <article className="teacher-ai-job" aria-live="polite">
      <div className="teacher-ai-job-head">
        <div>
          <b>{data ? t.jobHeading(t.kinds[data.targetKind], data.requestedCount) : "…"}</b>
          {data && (
            <small className="muted">
              {lessonTitle ? `${lessonTitle} · ` : ""}{t.createdAt(formatDateTime(data.createdAt))}
            </small>
          )}
        </div>
        {data && <StatusBadge job={data} />}
        <button type="button" className="icon-button" aria-label={t.close} onClick={onClose}><X size={16} /></button>
      </div>
      <ErrorBox error={job.error} />
      {data?.credits && (
        <Suspense fallback={null}>
          <AiJobCredits credits={data.credits} />
        </Suspense>
      )}

      {active && !stillProcessing && (
        <p className="notice" role="status"><RefreshCw size={14} className="spin" aria-hidden="true" /> {t.processing}</p>
      )}
      {stillProcessing && (
        <div className="notice" role="status">
          {t.stillProcessing}{" "}
          <button type="button" className="secondary button-compact" onClick={() => { setPollStartedAt(Date.now()); setNow(Date.now()); job.refetch(); }}>
            {t.checkAgain}
          </button>
        </div>
      )}
      {active && (
        <div className="button-row">
          <button type="button" className="danger-text" disabled={cancel.isPending} onClick={() => cancel.mutate()}>{t.cancel}</button>
        </div>
      )}
      <ErrorBox error={cancel.error} />

      {data?.status === "CANCELLED" && <p className="notice">{t.cancelled}</p>}
      {data?.status === "FAILED" && (
        <div className="error" role="alert">
          <p>{t.failed(t.failureCodes[data.failureCode ?? "INTERNAL_ERROR"] ?? data.failureCode ?? "")}</p>
          <button type="button" className="secondary" onClick={() => onRetry(data)}>{t.retryAsNew}</button>
        </div>
      )}
      {data?.status === "SUCCEEDED" && <AiReview classId={classId} job={data} onMaterialized={onMaterialized} />}
    </article>
  );
}

function AiReview({ classId, job, onMaterialized }: { classId: string; job: AiJobView; onMaterialized: (resourceId: string) => void }) {
  const items = job.items ?? [];
  const decided = items.filter((item) => item.decision).length;
  const kept = items.filter((item) => item.decision && item.decision.decision !== "REJECTED").length;
  const locked = !!job.materializedResourceId;
  const [dialog, setDialog] = useState(false);
  const [created, setCreated] = useState<{ id: string; title: string } | null>(null);
  return (
    <div className="teacher-ai-review">
      <p className="tiny">{t.summary(job.validCount ?? items.length, job.requestedCount, job.droppedCount ?? 0)}</p>
      {job.lessonChangedSinceGeneration && (
        <p className="notice warning-text" role="status"><AlertTriangle size={14} aria-hidden="true" /> {t.stale}</p>
      )}
      <p className="tiny" role="status"><b>{t.progress(decided, items.length)}</b></p>
      {items.map((item) => (
        <AiReviewItem key={item.id} classId={classId} job={job} item={item} locked={locked} />
      ))}
      {created && (
        <p className="notice" role="status">
          {t.done(created.title)}{" "}
          <button type="button" className="secondary button-compact" onClick={() => onMaterialized(created.id)}>{t.viewDraft}</button>
        </p>
      )}
      {locked && !created && (
        <p className="notice">
          {t.alreadyDone}{" "}
          <button type="button" className="secondary button-compact" onClick={() => onMaterialized(job.materializedResourceId!)}>{t.viewDraft}</button>
        </p>
      )}
      {!locked && (
        <div className="button-row">
          <button type="button" className="primary" disabled={decided < items.length || kept === 0} onClick={() => setDialog(true)}>{t.materialize}</button>
          {(decided < items.length || kept === 0) && <small className="tiny muted">{t.materializeHint}</small>}
        </div>
      )}
      {dialog && (
        <MaterializeDialog
          classId={classId}
          job={job}
          kept={kept}
          onClose={() => setDialog(false)}
          onDone={(resource) => {
            setDialog(false);
            setCreated(resource);
            onMaterialized(resource.id);
          }}
        />
      )}
    </div>
  );
}

function MaterializeDialog({
  classId,
  job,
  kept,
  onClose,
  onDone,
}: {
  classId: string;
  job: AiJobView;
  kept: number;
  onClose: () => void;
  onDone: (resource: { id: string; title: string }) => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(`${t.kinds[job.targetKind]} (AI)`);
  // One key per dialog: a retried click replays instead of creating a second draft.
  const key = useMemo(() => idempotencyKey(), []);
  const run = useMutation({
    mutationFn: () => materializeAiJob(classId, job.id, title.trim(), key),
    onSuccess: (resource) => {
      qc.invalidateQueries({ queryKey: ["ai-job", classId, job.id] });
      qc.invalidateQueries({ queryKey: ["ai-jobs", classId] });
      qc.invalidateQueries({ queryKey: ["class-resources", classId] });
      onDone({ id: resource.id, title: resource.title });
    },
  });
  return (
    <Modal title={t.materializeTitle} onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); run.mutate(); }}>
        <p className="tiny">{t.materializeLead(kept, t.kinds[job.targetKind])}</p>
        <label className="field">
          <span>{t.resourceName}</span>
          <input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <ErrorBox error={run.error} />
        <div className="button-row">
          <button type="button" className="secondary" onClick={onClose}>{t.cancelEdit}</button>
          <button className="primary" disabled={run.isPending || !title.trim()}>{run.isPending ? t.creating : t.create}</button>
        </div>
      </form>
    </Modal>
  );
}

function AiReviewItem({ classId, job, item, locked }: { classId: string; job: AiJobView; item: AiJobItem; locked: boolean }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"" | "edit" | "reject">("");
  const [reason, setReason] = useState("WRONG_ANSWER");
  const decide = useMutation({
    mutationFn: (body: Parameters<typeof decideAiItem>[3]) => decideAiItem(classId, job.id, item.id, body),
    onSuccess: (view) => {
      qc.setQueryData(["ai-job", classId, job.id], view);
      setMode("");
    },
  });
  const decision = item.decision?.decision;
  const shown = effectivePayload(item);
  return (
    <section className={`teacher-ai-item ${decision ? `decided ${decision.toLowerCase()}` : ""}`} aria-label={t.item(item.position + 1)}>
      <header>
        <b>{t.item(item.position + 1)}</b>
        {decision && <Badge tone={decision === "REJECTED" ? "not_passed" : "passed"}>{t.decisions[decision]}</Badge>}
        {visibleFlags(item.flags).map((flag) => (
          <Badge key={flag} tone="outline">{t.flags[flag] ?? flag}</Badge>
        ))}
      </header>
      {item.duplicateOf.length > 0 && (
        <div className="teacher-ai-duplicates">
          {item.duplicateOf.map((match) => (
            <p key={match.resourceId ?? match.lessonId} className="tiny warning-text">
              <AlertTriangle size={13} aria-hidden="true" /> {t.duplicateOf(match.resourceTitle, Math.round(match.similarity * 100), match.match === "EXACT")}
              {match.sourceKind === "LIBRARY_LESSON" ? t.inLibrary : match.className ? t.inClass(match.className) : ""}
            </p>
          ))}
          <p className="tiny muted">{t.duplicateWarn}</p>
        </div>
      )}

      {mode === "edit" ? (
        <ItemEditor
          initial={shown}
          pending={decide.isPending}
          onCancel={() => { setMode(""); decide.reset(); }}
          onSave={(payload) => decide.mutate({ decision: "EDITED", editedPayload: payload })}
        />
      ) : (
        <ItemView payload={shown} />
      )}
      {decision === "EDITED" && item.decision!.flags.length > 0 && (
        <p className="tiny muted">
          {t.editedFlags}: {visibleFlags(item.decision!.flags).map((flag) => t.flags[flag] ?? flag).join(", ")}
        </p>
      )}
      {decision === "REJECTED" && item.decision!.reasonCode && (
        <p className="tiny muted">{t.rejectReason}: {t.reasons[item.decision!.reasonCode] ?? item.decision!.reasonCode}</p>
      )}

      {!locked && mode === "" && (
        <div className="button-row">
          <button type="button" className={decision === "ACCEPTED" ? "primary button-compact" : "secondary button-compact"} disabled={decide.isPending} onClick={() => decide.mutate({ decision: "ACCEPTED" })}>
            <Check size={14} aria-hidden="true" /> {t.keep}
          </button>
          <button type="button" className="secondary button-compact" disabled={decide.isPending} onClick={() => setMode("edit")}>
            <Pencil size={14} aria-hidden="true" /> {t.edit}
          </button>
          <button type="button" className="danger-text button-compact" disabled={decide.isPending} onClick={() => setMode("reject")}>
            <X size={14} aria-hidden="true" /> {t.reject}
          </button>
        </div>
      )}
      {!locked && mode === "reject" && (
        <div className="teacher-ai-reject">
          <label className="field">
            <span>{t.rejectReason}</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {Object.entries(t.reasons).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </label>
          <div className="button-row">
            <button type="button" className="secondary button-compact" onClick={() => setMode("")}>{t.cancelEdit}</button>
            <button type="button" className="danger button-compact" disabled={decide.isPending} onClick={() => decide.mutate({ decision: "REJECTED", reasonCode: reason })}>
              {t.confirmReject}
            </button>
          </div>
        </div>
      )}
      <ErrorBox error={decide.error} />
    </section>
  );
}

/** An exact duplicate is also a near one (similarity 1); show only the stronger warning. */
const visibleFlags = (flags: string[]) =>
  flags.filter(
    (flag) =>
      !(flag === "NEAR_DUPLICATE" && flags.includes("EXACT_DUPLICATE")) &&
      !(flag === "NEAR_DUPLICATE_ELSEWHERE" && flags.includes("EXACT_DUPLICATE_ELSEWHERE")),
  );

function ItemView({ payload }: { payload: AiItemPayload }) {
  if (payload.type === "CARD")
    return (
      <dl className="teacher-ai-card">
        <dt>{t.front}</dt><dd>{payload.front}</dd>
        <dt>{t.back}</dt><dd>{payload.back}</dd>
        <dd className="tiny muted">{t.sources(payload.sourceRefs.join(", "))}</dd>
      </dl>
    );
  return (
    <div className="teacher-ai-question">
      <p>{payload.prompt}</p>
      <ol type="A">
        {payload.options.map((option, index) => (
          <li key={index} className={index === payload.correctOption ? "correct" : ""}>
            {option}
            {index === payload.correctOption && <small> · {t.correct}</small>}
          </li>
        ))}
      </ol>
      <p className="tiny"><b>{t.explanation}:</b> {payload.explanation}</p>
      <p className="tiny muted">{t.difficulties[payload.difficulty]} · {t.sources(payload.sourceRefs.join(", "))}</p>
    </div>
  );
}

function ItemEditor({ initial, pending, onCancel, onSave }: { initial: AiItemPayload; pending: boolean; onCancel: () => void; onSave: (payload: AiItemPayload) => void }) {
  const [draft, setDraft] = useState<AiItemPayload>(initial);
  if (draft.type === "CARD") {
    const card = draft as AiCardItem;
    return (
      <form className="teacher-ai-editor" onSubmit={(event) => { event.preventDefault(); onSave(card); }}>
        <label className="field"><span>{t.front}</span><textarea rows={2} required maxLength={500} value={card.front} onChange={(e) => setDraft({ ...card, front: e.target.value })} /></label>
        <label className="field"><span>{t.back}</span><textarea rows={2} required maxLength={500} value={card.back} onChange={(e) => setDraft({ ...card, back: e.target.value })} /></label>
        <div className="button-row">
          <button type="button" className="secondary button-compact" onClick={onCancel}>{t.cancelEdit}</button>
          <button className="primary button-compact" disabled={pending}>{t.saveEdit}</button>
        </div>
      </form>
    );
  }
  const question = draft as AiQuestionItem;
  const setOptions = (options: string[], correctOption = question.correctOption) =>
    setDraft({ ...question, options, correctOption: Math.min(correctOption, options.length - 1) });
  return (
    <form className="teacher-ai-editor" onSubmit={(event) => { event.preventDefault(); onSave(question); }}>
      <label className="field"><span>{t.prompt}</span><textarea rows={2} required maxLength={500} value={question.prompt} onChange={(e) => setDraft({ ...question, prompt: e.target.value })} /></label>
      {question.options.map((option, index) => (
        <div className="teacher-ai-option" key={index}>
          <label className="check">
            <input type="radio" name="ai-correct" checked={question.correctOption === index} onChange={() => setDraft({ ...question, correctOption: index })} aria-label={`${t.markCorrect} ${t.option(index)}`} />
          </label>
          <label className="field">
            <span>{t.option(index)}</span>
            <input required maxLength={500} value={option} onChange={(e) => setOptions(question.options.map((o, i) => (i === index ? e.target.value : o)))} />
          </label>
          {question.options.length > 2 && (
            <button type="button" className="icon-button" aria-label={`${t.removeOption} ${t.option(index)}`}
              onClick={() => setOptions(question.options.filter((_, i) => i !== index), question.correctOption > index ? question.correctOption - 1 : question.correctOption === index ? 0 : question.correctOption)}>
              <X size={14} />
            </button>
          )}
        </div>
      ))}
      {question.options.length < 6 && (
        <button type="button" className="secondary button-compact" onClick={() => setOptions([...question.options, ""])}>{t.addOption}</button>
      )}
      <label className="field"><span>{t.explanation}</span><textarea rows={2} required maxLength={1000} value={question.explanation} onChange={(e) => setDraft({ ...question, explanation: e.target.value })} /></label>
      <label className="field">
        <span>{t.difficulty}</span>
        <select value={question.difficulty} onChange={(e) => setDraft({ ...question, difficulty: e.target.value as AiDifficulty })}>
          {(["FOUNDATION", "STANDARD", "ADVANCED"] as AiDifficulty[]).map((d) => <option key={d} value={d}>{t.difficulties[d]}</option>)}
        </select>
      </label>
      <div className="button-row">
        <button type="button" className="secondary button-compact" onClick={onCancel}>{t.cancelEdit}</button>
        <button className="primary button-compact" disabled={pending}>{t.saveEdit}</button>
      </div>
    </form>
  );
}
