import { Suspense, lazy, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  HelpCircle,
  Layers,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { isApiError } from "../../lib/api";
import { useAiJobs, useAiRequestForm, useAiJob, useAiReview, CREDIT_ERROR_CODES } from "./teacher-ai-hooks";
import { canMaterialize, decisionCounts, filterItems, type AiItemFilter } from "./teacher-ai-view";
import { ErrorBox } from "../../components/ui";
import { defineText, formatDateTime } from "../../i18n";
import { AiQuotaMeter } from "../ai-usage/AiQuota";
import {
  MAX_ITEMS,
  type AiDifficulty,
  type AiJobView,
  type AiTargetKind,
} from "./teacher-ai-api";
import {
  AiCreditEstimate,
  AiJobCredits,
  AiReviewItem,
  MaterializeDialog,
  StatusBadge,
} from "./TeacherAiPanel";
import "./teacher-ai-studio.css";

const text = defineText({
  vi: {
    eyebrow: "TRỢ LÝ AI · CHỈ GIÁO VIÊN",
    title: "Soạn nháp bằng AI",
    lead: "AI chỉ tạo bản nháp từ bài học đã chọn. Thầy cô duyệt từng mục; học sinh chỉ thấy nội dung sau khi thầy cô xuất bản.",
    contentType: "Loại nội dung",
    targetKinds: {
      STUDY_QUIZ: "Quiz",
      DECK: "Thẻ ghi nhớ",
      TEST: "Bài kiểm tra",
    } as Record<AiTargetKind, string>,
    lesson: "Bài học làm căn cứ",
    chooseLesson: "Chọn bài học",
    grade: (g: number) => `Khối ${g}`,
    itemCount: (max: number) => `Số mục (1–${max})`,
    difficulty: "Mức độ",
    anyDifficulty: "Không chỉ định",
    difficulties: {
      FOUNDATION: "Cơ bản",
      STANDARD: "Vừa",
      ADVANCED: "Nâng cao",
    } as Record<AiDifficulty, string>,
    instruction: "Chỉ dẫn thêm (không bắt buộc)",
    instructionPlaceholder: "Ví dụ: Tập trung vào công thức định luật Ohm, tránh câu hỏi lý thuyết suông…",
    instructionHint: "Chỉ ghi yêu cầu chuyên môn. Không dán tên, bài làm hay thông tin cá nhân của học sinh.",
    chars: (n: number) => `${n}/1000 ký tự`,
    quotaTitle: "Tạo bản nháp học liệu",
    quotaSettings: "Xem mức sử dụng AI",
    generate: "Tạo bản nháp bằng AI",
    sending: "Đang gửi…",
    selectLessonToGenerate: "Chọn bài học để tạo bản nháp bằng AI.",
    quotaFullReason: "Đã đạt giới hạn yêu cầu AI trong ngày hoặc đang có yêu cầu khác đang chạy.",
    creditShortReason: "Tài khoản không đủ tín dụng để thực hiện yêu cầu này.",
    creditWaitReason: "Đang tính toán mức tín dụng ước tính…",
    stepperDecrease: "Giảm số mục",
    stepperIncrease: "Tăng số mục",
    toggleComposer: "Thu gọn / mở rộng khung soạn",
    recent: "Yêu cầu gần đây",
    noJobs: "Chưa có yêu cầu AI nào trong lớp này.",
    itemsCount: (valid: number, requested: number) => `${valid}/${requested} mục`,
    itemsCountSimple: (n: number) => `${n} mục`,
    open: "Mở",
    close: "Đóng",
    stepsTitle: "Quy trình soạn học liệu với Trợ lý AI",
    step1Title: "1. Chọn bài học",
    step1Desc: "Chọn bài học trong chương trình làm nguồn kiến thức căn cứ cho nội dung AI tạo.",
    step2Title: "2. AI soạn nháp",
    step2Desc: "AI tự động tạo câu hỏi trắc nghiệm hoặc thẻ ghi nhớ bám sát nội dung bài học trong vài giây.",
    step3Title: "3. Thầy cô duyệt từng mục",
    step3Desc: "Kiểm tra, chỉnh sửa hoặc loại bỏ từng câu hỏi. Chỉ những mục được giữ mới được tạo thành bản nháp.",
    emptyRule: "Học sinh chỉ thấy nội dung sau khi bạn tạo bản nháp và xuất bản.",
    processing: "AI đang soạn nội dung…",
    elapsed: (sec: number) => `Đang chạy ${sec}s`,
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
    progress: (done: number, total: number) => `Đã quyết định ${done}/${total} mục`,
    keepAll: (n: number) => `Giữ tất cả ${n} mục chưa quyết định`,
    keepingAll: (n: number) => `Đang lưu ${n} mục…`,
    keepAllFailed: (failed: number, total: number) => `${failed}/${total} mục chưa lưu được nên đã hoàn tác; hãy bấm lại.`,
    materialize: "Tạo bản nháp",
    materializeHint: "Cần quyết định mọi mục và giữ ít nhất một mục.",
    filterAll: "Tất cả",
    filterPending: "Chưa quyết định",
    filterKept: "Đã giữ",
    filterEdited: "Đã sửa",
    filterRejected: "Đã bỏ",
    noFilteredItems: "Không có mục nào phù hợp bộ lọc này.",
    stale: "Bài học đã thay đổi sau khi tạo yêu cầu này. Thầy cô vẫn có thể duyệt, nhưng hãy kiểm tra lại nội dung.",
    done: (title: string) => `Đã tạo bản nháp “${title}”.`,
    alreadyDone: "Bản nháp đã được tạo từ yêu cầu này.",
    viewDraft: "Xem bản nháp",
    navLabel: "Điều hướng danh sách mục",
    filterLabel: "Bộ lọc trạng thái mục",
  },
  en: {
    eyebrow: "AI ASSISTANT · TEACHERS ONLY",
    title: "Draft with AI",
    lead: "AI only drafts from the selected lesson. You review every item; students see nothing until you publish.",
    contentType: "Content type",
    targetKinds: {
      STUDY_QUIZ: "Quiz",
      DECK: "Flashcards",
      TEST: "Test",
    } as Record<AiTargetKind, string>,
    lesson: "Source lesson",
    chooseLesson: "Choose a lesson",
    grade: (g: number) => `Grade ${g}`,
    itemCount: (max: number) => `Number of items (1–${max})`,
    difficulty: "Difficulty",
    anyDifficulty: "Not specified",
    difficulties: {
      FOUNDATION: "Foundation",
      STANDARD: "Standard",
      ADVANCED: "Advanced",
    } as Record<AiDifficulty, string>,
    instruction: "Extra instruction (optional)",
    instructionPlaceholder: "e.g. Focus on Ohm's law formula, avoid purely theoretical questions…",
    instructionHint: "Subject guidance only. Never paste student names, work or personal details.",
    chars: (n: number) => `${n}/1000 characters`,
    quotaTitle: "Learning resource drafts",
    quotaSettings: "View AI usage",
    generate: "Draft with AI",
    sending: "Sending…",
    selectLessonToGenerate: "Choose a lesson to create an AI draft.",
    quotaFullReason: "Daily AI quota reached or another request is currently running.",
    creditShortReason: "Insufficient credits to run this request.",
    creditWaitReason: "Calculating credit estimate…",
    stepperDecrease: "Decrease item count",
    stepperIncrease: "Increase item count",
    toggleComposer: "Toggle composer card",
    recent: "Recent requests",
    noJobs: "No AI requests in this class yet.",
    itemsCount: (valid: number, requested: number) => `${valid}/${requested} items`,
    itemsCountSimple: (n: number) => `${n} items`,
    open: "Open",
    close: "Close",
    stepsTitle: "AI Authoring Workflow",
    step1Title: "1. Choose a lesson",
    step1Desc: "Select a curriculum lesson as the authoritative source for AI drafting.",
    step2Title: "2. AI drafts items",
    step2Desc: "AI drafts quiz questions or flashcards aligned with the lesson in seconds.",
    step3Title: "3. Review each item",
    step3Desc: "Check, edit or reject each item. Only kept items become the class draft.",
    emptyRule: "Students only see the content after you create the draft and publish it.",
    processing: "AI is drafting items…",
    elapsed: (sec: number) => `Running ${sec}s`,
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
    progress: (done: number, total: number) => `${done}/${total} items decided`,
    keepAll: (n: number) => `Keep all ${n} undecided items`,
    keepingAll: (n: number) => `Saving ${n} items…`,
    keepAllFailed: (failed: number, total: number) => `${failed}/${total} items could not be saved and were rolled back; try again.`,
    materialize: "Create draft",
    materializeHint: "Decide every item and keep at least one.",
    filterAll: "All",
    filterPending: "Pending",
    filterKept: "Kept",
    filterEdited: "Edited",
    filterRejected: "Rejected",
    noFilteredItems: "No items match this filter.",
    stale: "The lesson changed after this request. You can still review, but check the content again.",
    done: (title: string) => `Draft “${title}” created.`,
    alreadyDone: "A draft was already created from this request.",
    viewDraft: "View draft",
    navLabel: "Item list navigation",
    filterLabel: "Item status filter",
  },
});

type Lesson = { id: string; title: string; grade: number; subject: { name: string } };
const JOB_PARAM = "aiJob";

export interface TeacherAiStudioProps {
  classId: string;
  lessons: Lesson[];
  onMaterialized: (resourceId: string) => void;
}

/**
 * Teacher AI Studio (TAI-01 authoring, redesigned per SPEC.md U-1 ... U-8).
 * 2-column studio layout: left composer + recent requests, right review workspace with sticky header and navigator.
 */
export function TeacherAiStudio({ classId, lessons, onMaterialized }: TeacherAiStudioProps) {
  const t = text();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedJobId = searchParams.get(JOB_PARAM);
  // One-column layout (< 1100px): when a job is open, start with the composer folded so the review is near the top.
  // The collapsed style only applies inside that media query, so desktop is unaffected.
  const [composerCollapsed, setComposerCollapsed] = useState(
    () => !!selectedJobId && typeof window !== "undefined" && window.matchMedia("(max-width: 1099px)").matches,
  );

  const selectJob = (jobId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (jobId) next.set(JOB_PARAM, jobId);
    else next.delete(JOB_PARAM);
    setSearchParams(next, { replace: true });
  };

  const { jobs } = useAiJobs(classId);
  const {
    quota,
    targetKind,
    setTargetKind,
    lessonId,
    setLessonId,
    itemCount,
    setItemCount,
    difficulty,
    setDifficulty,
    instruction,
    setInstruction,
    setCredit,
    creditBody,
    creditShort,
    creditWait,
    create,
    max,
    quotaFull,
    cannotGenerate,
    retryFrom,
  } = useAiRequestForm(classId, (id) => selectJob(id), () => selectJob(null));

  return (
    <div className="tai-studio-shell" aria-labelledby={`ai-studio-title-${classId}`}>
      {/* Cột trái: Soạn yêu cầu + Yêu cầu gần đây */}
      <div className="tai-studio-col-left">
        <section className="tai-studio-composer panel" aria-labelledby={`ai-studio-title-${classId}`}>
          <div className="tai-studio-composer-head">
            <div className="tai-studio-eyebrow-row">
              <Sparkles size={15} aria-hidden="true" className="tai-studio-brand-icon" />
              <span className="tai-studio-eyebrow">{t.eyebrow}</span>
            </div>
            <div className="tai-studio-title-row">
              <h3 id={`ai-studio-title-${classId}`}>{t.title}</h3>
              <button
                type="button"
                className="tai-studio-collapse-toggle"
                onClick={() => setComposerCollapsed((prev) => !prev)}
                aria-expanded={!composerCollapsed}
                aria-label={t.toggleComposer}
              >
                {composerCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            </div>
            <p className="tiny muted tai-studio-lead">{t.lead}</p>
          </div>

          <form
            id={`ai-form-${classId}`}
            className={`tai-studio-form ${composerCollapsed ? "tai-studio-form-collapsed" : ""}`}
            onSubmit={(event) => {
              event.preventDefault();
              if (!cannotGenerate) create.mutate();
            }}
          >
            <fieldset className="tai-studio-fieldset" disabled={create.isPending}>
              {/* 1. Bài học căn cứ */}
              <label className="tai-studio-field">
                <span className="tai-studio-label">{t.lesson}</span>
                <select
                  required
                  className="tai-studio-select"
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                >
                  <option value="">{t.chooseLesson}</option>
                  {lessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {t.grade(lesson.grade)} · {lesson.subject.name} · {lesson.title}
                    </option>
                  ))}
                </select>
              </label>

              {/* 2. Loại nội dung (Segmented control 3 nút có icon) */}
              <div className="tai-studio-field">
                <span className="tai-studio-label">{t.contentType}</span>
                <div className="tai-studio-segmented" role="radiogroup" aria-label={t.contentType}>
                  {([
                    { id: "STUDY_QUIZ", label: t.targetKinds.STUDY_QUIZ, icon: HelpCircle },
                    { id: "DECK", label: t.targetKinds.DECK, icon: Layers },
                    { id: "TEST", label: t.targetKinds.TEST, icon: FileText },
                  ] as const).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={targetKind === id}
                      className={`tai-studio-seg-btn ${targetKind === id ? "is-active" : ""}`}
                      onClick={() => {
                        setTargetKind(id);
                        setItemCount((n) => Math.min(n, MAX_ITEMS[id]));
                      }}
                    >
                      <Icon size={15} aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Số mục (Stepper − / +) */}
              <div className="tai-studio-field">
                <span className="tai-studio-label">{t.itemCount(max)}</span>
                <div className="tai-studio-stepper" role="group" aria-label={t.itemCount(max)}>
                  <button
                    type="button"
                    className="tai-studio-stepper-btn"
                    disabled={itemCount <= 1 || create.isPending}
                    onClick={() => setItemCount(Math.max(1, itemCount - 1))}
                    aria-label={t.stepperDecrease}
                  >
                    <Minus size={16} aria-hidden="true" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={max}
                    required
                    className="tai-studio-stepper-input"
                    value={itemCount}
                    onChange={(e) =>
                      setItemCount(Math.max(1, Math.min(max, Number(e.target.value) || 1)))
                    }
                    aria-label={t.itemCount(max)}
                  />
                  <button
                    type="button"
                    className="tai-studio-stepper-btn"
                    disabled={itemCount >= max || create.isPending}
                    onClick={() => setItemCount(Math.min(max, itemCount + 1))}
                    aria-label={t.stepperIncrease}
                  >
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* 4. Mức độ (Segmented control) */}
              <div className="tai-studio-field">
                <span className="tai-studio-label">{t.difficulty}</span>
                <div
                  className="tai-studio-segmented tai-studio-segmented-4"
                  role="radiogroup"
                  aria-label={t.difficulty}
                >
                  {([
                    { id: "", label: t.anyDifficulty },
                    { id: "FOUNDATION", label: t.difficulties.FOUNDATION },
                    { id: "STANDARD", label: t.difficulties.STANDARD },
                    { id: "ADVANCED", label: t.difficulties.ADVANCED },
                  ] as const).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={difficulty === id}
                      className={`tai-studio-seg-btn ${difficulty === id ? "is-active" : ""}`}
                      onClick={() => setDifficulty(id as AiDifficulty | "")}
                    >
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Chỉ dẫn thêm */}
              <label className="tai-studio-field">
                <span className="tai-studio-label">{t.instruction}</span>
                <textarea
                  rows={3}
                  maxLength={1000}
                  className="tai-studio-textarea"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder={t.instructionPlaceholder}
                />
                <div className="tai-studio-counter-row">
                  <small className="tiny muted">{t.instructionHint}</small>
                  <small className="tiny muted">{t.chars(instruction.length)}</small>
                </div>
              </label>

              {/* Quota & Tín dụng gọn */}
              <div className="tai-studio-usage-box">
                <AiQuotaMeter
                  title={t.quotaTitle}
                  query={quota}
                  footer={<Link className="tiny" to="/settings#teacher-ai-usage">{t.quotaSettings}</Link>}
                />
                {creditBody && (
                  <Suspense fallback={null}>
                    <AiCreditEstimate classId={classId} body={creditBody} error={create.error} onChange={setCredit} />
                  </Suspense>
                )}
              </div>

              <ErrorBox
                error={
                  create.error && CREDIT_ERROR_CODES.some((code) => isApiError(create.error, code))
                    ? null
                    : create.error
                }
              />

              {/* Nút Tạo bản nháp chính */}
              <div className="tai-studio-submit-block">
                <button
                  type="submit"
                  className="tai-studio-submit-btn primary"
                  disabled={cannotGenerate}
                >
                  {create.isPending ? (
                    <>
                      <RefreshCw size={16} className="spin" aria-hidden="true" />
                      <span>{t.sending}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} aria-hidden="true" />
                      <span>{t.generate}</span>
                    </>
                  )}
                </button>
                {!lessonId && (
                  <p className="tiny muted tai-studio-disabled-reason" role="status">
                    {t.selectLessonToGenerate}
                  </p>
                )}
                {lessonId && quotaFull && (
                  <p className="tiny warning-text tai-studio-disabled-reason" role="status">
                    {t.quotaFullReason}
                  </p>
                )}
                {lessonId && !quotaFull && creditShort && (
                  <p className="tiny warning-text tai-studio-disabled-reason" role="status">
                    {t.creditShortReason}
                  </p>
                )}
                {lessonId && !quotaFull && !creditShort && creditWait && (
                  <p className="tiny muted tai-studio-disabled-reason" role="status">
                    {t.creditWaitReason}
                  </p>
                )}
              </div>
            </fieldset>
          </form>
        </section>

        {/* Danh sách yêu cầu gần đây dạng thẻ */}
        <section className="tai-studio-recent panel" aria-labelledby={`tai-recent-title-${classId}`}>
          <div className="tai-studio-recent-head">
            <Clock size={16} aria-hidden="true" className="tai-studio-brand-icon" />
            <h4 id={`tai-recent-title-${classId}`}>{t.recent}</h4>
          </div>
          <ErrorBox error={jobs.error} />
          {jobs.data?.items.length === 0 && (
            <p className="tiny muted tai-studio-no-jobs">{t.noJobs}</p>
          )}
          <div className="tai-studio-recent-list">
            {jobs.data?.items.map((job) => {
              const isSelected = job.id === selectedJobId;
              const lessonTitle = lessons.find((l) => l.id === job.lessonId)?.title ?? job.lessonId;
              const KindIcon =
                job.targetKind === "DECK" ? Layers : job.targetKind === "TEST" ? FileText : HelpCircle;
              const countText =
                job.validCount !== null
                  ? t.itemsCount(job.validCount, job.requestedCount)
                  : t.itemsCountSimple(job.requestedCount);

              return (
                <div
                  key={job.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  className={`tai-studio-job-card ${isSelected ? "tai-studio-job-card-active" : ""}`}
                  onClick={() => selectJob(job.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectJob(job.id);
                    }
                  }}
                >
                  <div className="tai-studio-job-card-icon">
                    <KindIcon size={16} aria-hidden="true" />
                  </div>
                  <div className="tai-studio-job-card-main">
                    <div className="tai-studio-job-card-title-row">
                      <span className="tai-studio-job-kind">
                        {t.targetKinds[job.targetKind]}
                      </span>
                      <span className="tai-studio-job-count muted">({countText})</span>
                    </div>
                    <p className="tai-studio-job-lesson" title={lessonTitle}>
                      {lessonTitle}
                    </p>
                    <div className="tai-studio-job-meta">
                      <span className="tiny muted">{formatDateTime(job.createdAt)}</span>
                      <StatusBadge job={job} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Cột phải: Không gian làm việc (Trống / Đang chạy / Duyệt / Lỗi) */}
      <div className="tai-studio-col-right">
        {!selectedJobId ? (
          <StudioEmptyWorkspace />
        ) : (
          <StudioJobWorkspace
            key={selectedJobId}
            classId={classId}
            jobId={selectedJobId}
            lessons={lessons}
            onClose={() => selectJob(null)}
            onRetry={retryFrom}
            onMaterialized={onMaterialized}
          />
        )}
      </div>
    </div>
  );
}

/** U-4: Trạng thái trống 3 bước không minh họa rườm rà */
function StudioEmptyWorkspace() {
  const t = text();
  return (
    <section className="tai-studio-workspace panel" aria-labelledby="tai-empty-title">
      <div className="tai-studio-empty">
        <div className="tai-studio-empty-badge">
          <Sparkles size={15} aria-hidden="true" />
          <span>{t.eyebrow}</span>
        </div>
        <h3 id="tai-empty-title" className="tai-studio-empty-heading">
          {t.stepsTitle}
        </h3>
        <div className="tai-studio-steps">
          <div className="tai-studio-step-card">
            <div className="tai-studio-step-num">1</div>
            <div className="tai-studio-step-content">
              <h4>{t.step1Title}</h4>
              <p>{t.step1Desc}</p>
            </div>
          </div>
          <div className="tai-studio-step-card">
            <div className="tai-studio-step-num">2</div>
            <div className="tai-studio-step-content">
              <h4>{t.step2Title}</h4>
              <p>{t.step2Desc}</p>
            </div>
          </div>
          <div className="tai-studio-step-card">
            <div className="tai-studio-step-num">3</div>
            <div className="tai-studio-step-content">
              <h4>{t.step3Title}</h4>
              <p>{t.step3Desc}</p>
            </div>
          </div>
        </div>
        <div className="tai-studio-empty-rule" role="note">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>{t.emptyRule}</span>
        </div>
      </div>
    </section>
  );
}

/** Quản lý trạng thái chi tiết của một yêu cầu AI (Đang chạy, Xong, Hủy, Thất bại) */
function StudioJobWorkspace({
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
  const t = text();
  const { job, data, active, stillProcessing, checkAgain, cancel, pollStartedAt, now } = useAiJob(
    classId,
    jobId,
  );
  const lessonTitle = data ? lessons.find((l) => l.id === data.lessonId)?.title : undefined;

  if (active) {
    const elapsedSeconds = Math.max(0, Math.floor((now - pollStartedAt) / 1000));
    return (
      <div className="tai-studio-running panel" aria-live="polite">
        <div className="tai-studio-running-head">
          <div className="tai-studio-running-title-block">
            <RefreshCw size={20} className="spin tai-studio-brand-icon" aria-hidden="true" />
            <div>
              <h4>{t.processing}</h4>
              <p className="tiny muted">
                {data ? `${t.targetKinds[data.targetKind]} · ${lessonTitle ?? data.lessonId}` : "…"}
                {" · "}
                <span className="tai-studio-elapsed">{t.elapsed(elapsedSeconds)}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="secondary button-compact danger-text"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            {t.cancel}
          </button>
        </div>

        {stillProcessing && (
          <div className="notice" role="status">
            {t.stillProcessing}{" "}
            <button type="button" className="secondary button-compact" onClick={checkAgain}>
              {t.checkAgain}
            </button>
          </div>
        )}

        {/* U-5: 3 skeleton item cards */}
        <div className="tai-studio-skeletons" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="tai-studio-skeleton-card">
              <div className="tai-studio-skeleton-line short" />
              <div className="tai-studio-skeleton-line long" />
              <div className="tai-studio-skeleton-line medium" />
              <div className="tai-studio-skeleton-options">
                <div className="tai-studio-skeleton-line option" />
                <div className="tai-studio-skeleton-line option" />
              </div>
            </div>
          ))}
        </div>
        {/* A failed poll leaves the last known state on screen: say so, as the original panel did. */}
        <ErrorBox error={job.error} />
        <ErrorBox error={cancel.error} />
      </div>
    );
  }

  if (data?.status === "CANCELLED") {
    return (
      <div className="tai-studio-cancelled panel" role="status">
        <div className="tai-studio-msg-row">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>{t.cancelled}</p>
        </div>
        <button type="button" className="secondary" onClick={() => onRetry(data)}>
          {t.retryAsNew}
        </button>
      </div>
    );
  }

  if (data?.status === "FAILED") {
    return (
      <div className="tai-studio-failed panel" role="alert">
        <div className="tai-studio-msg-row">
          <AlertTriangle size={18} className="warning-text" aria-hidden="true" />
          <div>
            <h4>
              {t.failed(
                t.failureCodes[data.failureCode ?? "INTERNAL_ERROR"] ?? data.failureCode ?? "",
              )}
            </h4>
          </div>
        </div>
        <button type="button" className="secondary" onClick={() => onRetry(data)}>
          {t.retryAsNew}
        </button>
      </div>
    );
  }

  if (data?.status === "SUCCEEDED") {
    return (
      <StudioReviewSpace
        classId={classId}
        job={data}
        lessons={lessons}
        onClose={onClose}
        onMaterialized={onMaterialized}
      />
    );
  }

  return (
    <div className="tai-studio-workspace panel">
      <ErrorBox error={job.error} />
    </div>
  );
}

/** U-6: Không gian duyệt với sticky header, progress bar, filter chips, navigator strip, và item cards */
function StudioReviewSpace({
  classId,
  job,
  lessons,
  onClose,
  onMaterialized,
}: {
  classId: string;
  job: AiJobView;
  lessons: Lesson[];
  onClose: () => void;
  onMaterialized: (resourceId: string) => void;
}) {
  const t = text();
  const {
    items,
    decided,
    kept,
    locked,
    dialog,
    setDialog,
    created,
    setCreated,
    undecided,
    keepingAll,
    keepAllFailure,
    keepAllUndecided,
    decideItem,
    materialize,
  } = useAiReview(classId, job);

  const [filter, setFilter] = useState<AiItemFilter>("ALL");
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const counts = useMemo(() => decisionCounts(items), [items]);
  const displayedItems = useMemo(() => filterItems(items, filter), [items, filter]);
  const lessonTitle = lessons.find((l) => l.id === job.lessonId)?.title ?? job.lessonId;
  const isAllDecided = items.length > 0 && decided === items.length;

  const scrollToItem = (itemId: string) => {
    setActiveItemId(itemId);
    const scroll = () => document.getElementById(`tai-item-${itemId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    // The navigator lists every item; if the active filter hides this one, show all first, then scroll once it renders.
    if (!displayedItems.some((item) => item.id === itemId)) {
      setFilter("ALL");
      window.setTimeout(scroll, 0);
      return;
    }
    scroll();
  };

  return (
    <div className="tai-studio-review-space">
      {/* U-6: Sticky header với thông tin, tiến độ, nút giữ tất cả và nút tạo bản nháp */}
      <header className="tai-studio-sticky-header">
        <div className="tai-studio-sticky-top">
          <div className="tai-studio-sticky-title-wrap">
            <span className="tai-studio-sticky-title">
              {t.targetKinds[job.targetKind]} · {lessonTitle}
            </span>
            <StatusBadge job={job} />
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={t.close}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="tai-studio-sticky-progress-row">
          <div className="tai-studio-progress-wrap">
            <div
              className="tai-studio-progress-track"
              role="progressbar"
              aria-valuenow={decided}
              aria-valuemin={0}
              aria-valuemax={items.length}
              aria-label={t.progress(decided, items.length)}
            >
              <div
                className={`tai-studio-progress-fill ${isAllDecided ? "is-all-decided" : ""}`}
                style={{ width: `${items.length > 0 ? (decided / items.length) * 100 : 0}%` }}
              />
            </div>
            <span className="tai-studio-progress-text">
              {t.progress(decided, items.length)}
            </span>
          </div>

          <div className="tai-studio-sticky-actions">
            {!locked && (undecided.length > 0 || keepingAll !== null) && (
              <button
                type="button"
                className="secondary button-compact"
                disabled={keepingAll !== null}
                onClick={() => void keepAllUndecided()}
              >
                <Check size={14} aria-hidden="true" />
                <span>{keepingAll !== null ? t.keepingAll(keepingAll) : t.keepAll(undecided.length)}</span>
              </button>
            )}
            {!locked && (
              <button
                type="button"
                className="primary button-compact"
                disabled={!canMaterialize(job, items)}
                onClick={() => setDialog(true)}
              >
                {t.materialize}
              </button>
            )}
          </div>
        </div>

        {!locked && !canMaterialize(job, items) && (
          <small className="tiny muted tai-studio-mat-hint">
            {t.materializeHint}
          </small>
        )}
      </header>

      {/* Thông báo kết quả bản nháp (U-7) */}
      {created && (
        <div className="notice tai-studio-done-notice" role="status">
          <p>{t.done(created.title)}</p>
          <button
            type="button"
            className="secondary button-compact"
            onClick={() => onMaterialized(created.id)}
          >
            {t.viewDraft}
          </button>
        </div>
      )}

      {locked && !created && (
        <div className="notice tai-studio-done-notice">
          <p>{t.alreadyDone}</p>
          <button
            type="button"
            className="secondary button-compact"
            onClick={() => onMaterialized(job.materializedResourceId!)}
          >
            {t.viewDraft}
          </button>
        </div>
      )}

      {/* Cảnh báo bài học thay đổi sau khi tạo */}
      {job.lessonChangedSinceGeneration && (
        <p className="notice warning-text" role="status">
          <AlertTriangle size={14} aria-hidden="true" /> {t.stale}
        </p>
      )}

      {/* Cảnh báo lỗi lưu đồng loạt */}
      {keepAllFailure && (
        <div role="alert">
          <p className="tiny warning-text">
            {t.keepAllFailed(keepAllFailure.failed, keepAllFailure.total)}
          </p>
          <ErrorBox error={keepAllFailure.error} />
        </div>
      )}

      {/* Tín dụng sử dụng */}
      {job.credits && (
        <Suspense fallback={null}>
          <AiJobCredits credits={job.credits} />
        </Suspense>
      )}

      {/* Chip lọc có số đếm */}
      <div className="tai-studio-filter-bar" role="group" aria-label={t.filterLabel}>
        {([
          { id: "ALL", label: t.filterAll, count: counts.ALL },
          { id: "PENDING", label: t.filterPending, count: counts.PENDING },
          { id: "KEPT", label: t.filterKept, count: counts.KEPT },
          { id: "EDITED", label: t.filterEdited, count: counts.EDITED },
          { id: "REJECTED", label: t.filterRejected, count: counts.REJECTED },
        ] as const).map(({ id, label, count }) => (
          <button
            key={id}
            type="button"

            aria-pressed={filter === id}
            className={`tai-studio-filter-chip ${filter === id ? "is-active" : ""}`}
            onClick={() => setFilter(id)}
          >
            <span>{label}</span>
            <span className="tai-studio-filter-count">({count})</span>
          </button>
        ))}
      </div>

      {/* Dải chip điều hướng đánh số theo màu quyết định */}
      <div className="tai-studio-navigator-wrap">
        <span className="tai-studio-navigator-label">{t.navLabel}</span>
        <div className="tai-studio-navigator" role="navigation" aria-label={t.navLabel}>
          {items.map((item, index) => {
            const dec = item.decision?.decision;
            const tone = !dec
              ? "pending"
              : dec === "ACCEPTED"
              ? "kept"
              : dec === "EDITED"
              ? "edited"
              : "rejected";
            const decisionName = !dec
              ? t.filterPending
              : dec === "ACCEPTED"
              ? t.filterKept
              : dec === "EDITED"
              ? t.filterEdited
              : t.filterRejected;

            return (
              <button
                key={item.id}
                type="button"
                className={`tai-studio-nav-chip tone-${tone}`}
                aria-current={activeItemId === item.id ? "true" : undefined}
                aria-label={`Mục ${index + 1}: ${decisionName}`}
                onClick={() => scrollToItem(item.id)}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Danh sách thẻ từng mục dùng lại AiReviewItem */}
      {displayedItems.length === 0 ? (
        <p className="tiny muted tai-studio-empty-filter">{t.noFilteredItems}</p>
      ) : (
        <div className="tai-studio-item-list">
          {displayedItems.map((item) => {
            const dec = item.decision?.decision;
            const decidedClass = dec ? `decided-${dec.toLowerCase()}` : "";
            return (
              <div
                key={item.id}
                id={`tai-item-${item.id}`}
                className={`tai-studio-item-card ${decidedClass}`}
              >
                <AiReviewItem
                  classId={classId}
                  job={job}
                  item={item}
                  locked={locked}
                  decideItem={decideItem}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Hộp thoại xác nhận tạo bản nháp */}
      {dialog && (
        <MaterializeDialog
          classId={classId}
          job={job}
          kept={kept}
          materialize={materialize}
          defaultTitle={`${t.targetKinds[job.targetKind]} ·${lessonTitle} (AI, ${formatDateTime(new Date().toISOString())})`}
          onClose={() => setDialog(false)}
          onDone={(resource) => {
            setDialog(false);
            setCreated(resource);
          }}
        />
      )}
    </div>
  );
}
