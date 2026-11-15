/**
 * TAI7-T5: types and pure helpers of "AI Gợi ý đề & biểu điểm" (teacher only). The preview functions mirror the server's
 * blueprint (BE assessment-blueprint.ts): the server stays authoritative, the preview only tells the teacher what to expect.
 */
export type CognitiveLevel = "RECALL" | "UNDERSTAND" | "APPLY";
export type ExamAssessmentType = "REGULAR_15M" | "MIDTERM_45M";
export const LEVELS: CognitiveLevel[] = ["RECALL", "UNDERSTAND", "APPLY"];
export const LEVEL_LABEL: Record<CognitiveLevel, string> = { RECALL: "Nhận biết", UNDERSTAND: "Thông hiểu", APPLY: "Vận dụng" };
export const TYPE_LABEL: Record<ExamAssessmentType, string> = { REGULAR_15M: "Kiểm tra thường xuyên 15 phút (hệ số 1)", MIDTERM_45M: "Kiểm tra giữa kỳ 45 phút (hệ số 2)" };

export const MAX_MCQ = 20;
export const MAX_WRITTEN = 3;
/** Same defaults as the server (ASSESSMENT_DEFAULTS); the teacher can change every number. */
export const DEFAULTS: Record<ExamAssessmentType, { mcqCount: number; writtenCount: number; matrix: Record<CognitiveLevel, number> }> = {
  REGULAR_15M: { mcqCount: 6, writtenCount: 1, matrix: { RECALL: 40, UNDERSTAND: 40, APPLY: 20 } },
  MIDTERM_45M: { mcqCount: 10, writtenCount: 2, matrix: { RECALL: 30, UNDERSTAND: 40, APPLY: 30 } },
};

export type ExamAiForm = {
  assessmentType: ExamAssessmentType;
  mcqCount: number;
  writtenCount: number;
  lab: null | { labId: string; releaseId: string; challengeId: string };
  matrix: Record<CognitiveLevel, number>;
  instruction: string;
};

export const defaultForm = (type: ExamAssessmentType = "REGULAR_15M"): ExamAiForm => ({ assessmentType: type, ...DEFAULTS[type], lab: null, instruction: "" });

export const matrixTotal = (matrix: Record<CognitiveLevel, number>) => LEVELS.reduce((sum, level) => sum + (Number.isFinite(matrix[level]) ? matrix[level] : 0), 0);
export const slotTotal = (form: Pick<ExamAiForm, "mcqCount" | "writtenCount" | "lab">) => form.mcqCount + form.writtenCount + (form.lab ? 1 : 0);
const sectionCount = (form: Pick<ExamAiForm, "mcqCount" | "writtenCount" | "lab">) => [form.mcqCount > 0, form.writtenCount > 0, !!form.lab].filter(Boolean).length;

/** Teacher-facing problems with the form, in reading order; empty means the request will be accepted by the server. */
export function formProblems(form: ExamAiForm): string[] {
  const problems: string[] = [];
  if (matrixTotal(form.matrix) !== 100) problems.push(`Tỷ lệ ba mức nhận thức phải cộng đúng 100% (hiện ${matrixTotal(form.matrix)}%).`);
  if (!LEVELS.every((level) => Number.isInteger(form.matrix[level]) && form.matrix[level] >= 0 && form.matrix[level] <= 100)) problems.push("Tỷ lệ mỗi mức là số nguyên từ 0 đến 100.");
  if (sectionCount(form) < 2) problems.push("Đề cần ít nhất hai phần trong ba phần: trắc nghiệm, tự luận, Lab.");
  if (!Number.isInteger(form.mcqCount) || form.mcqCount < 0 || form.mcqCount > MAX_MCQ) problems.push(`Số câu trắc nghiệm từ 0 đến ${MAX_MCQ}.`);
  if (!Number.isInteger(form.writtenCount) || form.writtenCount < 0 || form.writtenCount > MAX_WRITTEN) problems.push(`Số câu tự luận từ 0 đến ${MAX_WRITTEN}.`);
  return problems;
}

/** Request body of the create and estimate routes (the estimate route parses the same body without `confirmedCredits`). */
export function requestBody(lessonId: string, form: ExamAiForm) {
  return {
    purpose: "GENERATE_ASSESSMENT" as const,
    lessonId,
    assessmentType: form.assessmentType,
    matrix: { ...form.matrix },
    sections: { mcqCount: form.mcqCount, writtenCount: form.writtenCount, lab: form.lab },
    ...(form.instruction.trim() ? { instruction: form.instruction.trim() } : {}),
  };
}

/** Items per level (largest remainder; a 0% level never gets one), as the server computes them. */
export function levelTargets(matrix: Record<CognitiveLevel, number>, total: number): Record<CognitiveLevel, number> {
  const raw = LEVELS.map((level, order) => ({ level, order, exact: (total * matrix[level]) / 100 }));
  const frac = (value: number) => value - Math.floor(value + 1e-9);
  const out = Object.fromEntries(raw.map((r) => [r.level, Math.floor(r.exact + 1e-9)])) as Record<CognitiveLevel, number>;
  let left = total - LEVELS.reduce((sum, level) => sum + out[level], 0);
  for (const r of [...raw].sort((a, b) => frac(b.exact) - frac(a.exact) || a.order - b.order)) {
    if (left <= 0) break;
    if (matrix[r.level] === 0) continue;
    out[r.level]++;
    left--;
  }
  return out;
}

/** Expected points per part: Lab 2,0; written 4,0 with multiple choice (else the rest after the Lab); multiple choice the rest. */
export function pointPreview(form: Pick<ExamAiForm, "mcqCount" | "writtenCount" | "lab">) {
  if (sectionCount(form) < 2) return null;
  const lab = form.lab ? 2 : 0;
  const written = form.writtenCount > 0 ? (form.mcqCount > 0 ? 4 : 10 - lab) : 0;
  return { mcq: form.mcqCount > 0 ? 10 - written - lab : 0, written, lab };
}

/** "4,0" or "0,67": at least one decimal, at most two (a question can be worth a fraction of a point). */
export const pointsText = (value: number) => value.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

// ---------- job and review shapes (GET classes/:id/ai-jobs/:jobId for GENERATE_ASSESSMENT) ----------
export type DraftWarning = "SLOTS_DROPPED" | "MATRIX_DRIFT" | "RUBRIC_RESCALED" | "LAB_PROMPT_FALLBACK" | "BATCH_DUPLICATE" | "NUMERIC_REVIEW" | "ANSWER_LENGTH_CUE" | "NEGATIVE_STEM";
export type DraftContent = {
  questions: Array<{ prompt: string; options: string[]; correctOption: number; explanation: string; points: number; cognitiveLevel: CognitiveLevel }>;
  prompts: Array<{ prompt: string; maxChars: number; referenceAnswer?: string; criteria: Array<{ code: string; description: string; maxPoints: number; anchors: Array<{ points: number; description: string }> }>; points: number; cognitiveLevel: CognitiveLevel }>;
  labs: Array<{ labId: string; releaseId: string; challengeId: string; prompt: string; points: number; cognitiveLevel: "APPLY" }>;
};
export type DraftReview = {
  matrix: { requested: Record<CognitiveLevel, number>; target: Record<CognitiveLevel, number>; actual: Record<CognitiveLevel, number> };
  totals: { points: number; mcq: number; written: number; lab: number };
  items: Array<{ section: "MCQ" | "WRITTEN" | "LAB"; index: number; cognitiveLevel: CognitiveLevel; points: number; sourceRefs: string[]; flags: DraftWarning[] }>;
};
export type ExamDraftJob = {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  failureCode: string | null;
  requestedCount: number;
  validCount: number | null;
  droppedCount: number | null;
  assessmentType: ExamAssessmentType | null;
  credits?: { estimated: number; state: "reserved" | "settled" | "refunded"; charged: number | null; refunded: number | null } | null;
  items?: Array<{ id: string; payload: { content: DraftContent; review: DraftReview }; flags: DraftWarning[] }>;
};

export const WARNING_TEXT: Record<DraftWarning, string> = {
  SLOTS_DROPPED: "AI bỏ một số câu không đạt kiểm tra (an toàn, đáp án, nguồn bài học…); điểm đã được chia lại để đề vẫn đủ 10,0 điểm.",
  MATRIX_DRIFT: "Sau khi bỏ câu, tỷ lệ các mức nhận thức lệch hơn một câu so với ma trận đã chọn.",
  RUBRIC_RESCALED: "Biểu điểm tự luận do AI trả về được điều chỉnh cho khớp điểm của câu; hãy xem lại từng tiêu chí.",
  LAB_PROMPT_FALLBACK: "AI không viết được yêu cầu thực hành hợp lệ; dùng mục tiêu của thử thách Lab. Hãy sửa lại cho rõ.",
  BATCH_DUPLICATE: "Có câu trắc nghiệm gần giống nhau trong đề.",
  NUMERIC_REVIEW: "Có câu chứa số liệu hoặc đơn vị; hãy kiểm tra lại phép tính.",
  ANSWER_LENGTH_CUE: "Có câu mà đáp án đúng dài hơn hẳn các phương án còn lại.",
  NEGATIVE_STEM: "Có câu hỏi dạng phủ định (\"không\", \"sai\"); hãy đọc kỹ.",
};

export const FAILURE_TEXT: Record<string, string> = {
  PROVIDER_UNAVAILABLE: "Dịch vụ AI tạm thời không phản hồi. Tín dụng đã được hoàn lại; thử lại sau ít phút.",
  PROVIDER_TIMEOUT: "AI trả lời quá lâu. Tín dụng đã được hoàn lại; thử lại hoặc giảm số câu.",
  OUTPUT_SCHEMA_INVALID: "AI trả về nội dung sai định dạng. Thử lại.",
  OUTPUT_VALIDATION_FAILED: "Không đủ câu hợp lệ để dựng đề (cần ít nhất hai phần có câu đạt kiểm tra). Thử lại hoặc giảm số câu.",
  LESSON_UNAVAILABLE: "Bài học nguồn không còn khả dụng.",
  INTERNAL_ERROR: "Có lỗi hệ thống khi soạn đề. Thử lại sau.",
};
export const failureText = (code: string | null) => (code && FAILURE_TEXT[code]) || "Không soạn được đề. Thử lại sau.";

export const isActive = (job: Pick<ExamDraftJob, "status"> | undefined) => job?.status === "PENDING" || job?.status === "RUNNING";

/** Draft content as the EXAM editor expects it (the editor ignores the review block). */
export const draftContent = (job: ExamDraftJob): DraftContent | null => job.items?.[0]?.payload.content ?? null;
export const draftReview = (job: ExamDraftJob): DraftReview | null => job.items?.[0]?.payload.review ?? null;
