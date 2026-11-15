import { defineText } from "../../i18n/index.ts";

/** At most one decimal, in the page language's number format (33.3333 -> "33,3" in Vietnamese). */
const num = (locale: string) => (value: number | string) => Number(value).toLocaleString(locale, { maximumFractionDigits: 1 });
const vi = num("vi-VN");
const en = num("en-US");
const signed = (format: (v: number | string) => string, value: number | string) => `${Number(value) > 0 ? "+" : Number(value) < 0 ? "−" : ""}${format(Math.abs(Number(value)))}`;
/** TAI7-T2: 10-point scores always show one decimal, like the school gradebook ("6,7/10", "8,0/10"). */
const scale10 = (locale: string) => (value: number | string) => `${Number(value).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/10`;
/** Averages keep two decimals so a value just under a bound never reads as the bound (4,95 not 5,0). */
const avg = (locale: string) => (value: number | string) => Number(value).toLocaleString(locale, { maximumFractionDigits: 2 });
const vi10 = scale10("vi-VN");
const en10 = scale10("en-US");
const viAvg = avg("vi-VN");
const enAvg = avg("en-US");
const viDate = (iso: number | string) => new Date(String(iso)).toLocaleDateString("vi-VN");
const enDate = (iso: number | string) => new Date(String(iso)).toLocaleDateString("en-US");
const TYPE_VI: Record<string, string> = { PRACTICE: "Luyện tập", REGULAR_15M: "Kiểm tra 15 phút", MIDTERM_45M: "Kiểm tra giữa kỳ" };
const TYPE_EN: Record<string, string> = { PRACTICE: "Practice", REGULAR_15M: "15-minute test", MIDTERM_45M: "Midterm test" };

/**
 * Teacher insight copy (TAI4-T4). Neutral wording only: nothing here names cheating, ability or ranking, and no raw
 * rule code is shown. Rule texts are keyed by `ruleCode`; an unknown code falls back to the message from the API.
 * `insightMessages` is exported so a test can scan both languages.
 */
export const insightMessages = {
  vi: {
    tab: "Gợi ý hỗ trợ",
    eyebrow: "GỢI Ý TỪ BẰNG CHỨNG HỌC TẬP",
    title: "Gợi ý hỗ trợ học sinh",
    notice: "Các gợi ý chỉ là lý do để giáo viên xem lại bằng chứng, không phải kết luận về học sinh. Chỉ giáo viên của lớp nhìn thấy; điểm, tiến độ và thông báo của học sinh không thay đổi.",
    filterLabel: "Hiển thị gợi ý",
    filterOpen: "Chưa xử lý",
    filterAll: "Tất cả",
    loading: "Đang tải…",
    loadFailed: "gợi ý hỗ trợ",
    empty: "Hiện chưa có gợi ý nào cần xem.",
    emptyAll: "Chưa có gợi ý nào cho lớp này.",
    studentSection: "Gợi ý cho học sinh này",
    studentEmpty: "Chưa có gợi ý nào cho học sinh này.",
    insufficientSummary: (n: number) => `${n} học sinh chưa đủ bài có điểm`,
    insufficientHint: "Các học sinh này có ít hơn 3 bài có điểm nên chưa so sánh được kết quả.",
    status: { INFORMATIONAL: "Thông tin", NEEDS_MORE_EVIDENCE: "Cần thêm bằng chứng", TEACHER_REVIEW_RECOMMENDED: "Nên xem lại" } as Record<string, string>,
    thresholdsLabel: "Ngưỡng áp dụng",
    evidenceLabel: "Bằng chứng",
    evidenceKind: { QUIZ: "Bài trắc nghiệm", TEST: "Bài kiểm tra được giao", PRACTICAL: "Lượt thực hành", WRITTEN: "Bài tự luận đã nộp", SIMILARITY_MATCH: "Cặp bài có nội dung tương đồng", WRITTEN_GRADE: "Điểm chấm tự luận của giáo viên", ASSIGNMENT: "Bài được giao" } as Record<string, string>,
    /** TAI7-T2 evidence details: assessment type, 10-point score and status of an assignment entry. */
    assessmentType: TYPE_VI,
    score10: vi10,
    evidenceStatus: { UPCOMING: "sắp đến hạn", NOT_DONE: "chưa làm" } as Record<string, string>,
    openSimilarity: "Xem xét nội dung tương đồng",
    evidenceOpen: "Xem",
    evidenceClose: "Ẩn",
    evidenceLoading: "Đang tải bằng chứng…",
    evidenceFailed: "chi tiết bằng chứng",
    quizLine: (score: number, passed: boolean) => `${score}% · ${passed ? "Đạt" : "Chưa đạt"}`,
    testNoDetail: "Chưa có trang chi tiết cho loại bài này.",
    acknowledge: "Ghi nhận",
    dismiss: "Ẩn",
    noteLabel: "Ghi chú (không bắt buộc, chỉ giáo viên thấy)",
    noteCounter: (used: number, max: number) => `${used}/${max} ký tự`,
    noteTooLong: "Ghi chú quá dài.",
    confirmAcknowledge: "Lưu ghi nhận",
    confirmDismiss: "Lưu và ẩn",
    cancel: "Hủy",
    saving: "Đang lưu…",
    acknowledged: "Đã ghi nhận",
    dismissed: "Đã ẩn",
    acknowledgedAt: (label: string, when: string) => `${label} · ${when}`,
    replay: "Xem lại lúc ghi nhận",
    replayHide: "Ẩn bản xem lại",
    replayTitle: "Tại thời điểm ghi nhận",
    replayFailed: "bản xem lại",
    replayLoading: "Đang tải bản xem lại…",
    stale: "Dữ liệu đã đổi do có bài mới nên gợi ý này không còn. Danh sách đã được tải lại.",
    archived: "Lớp đã lưu trữ nên không thể ghi nhận gợi ý.",
    patternNote: (message: string) => message,
    unknownTitle: "Gợi ý",
    badge: {
      up: (d: number | string) => `Tăng đột biến ${signed(vi, d)}đ`,
      down: (d: number | string) => `Giảm đột biến ${signed(vi, d)}đ`,
      retake: (d: number | string) => `Làm lại cùng bài ${signed(vi, d)}đ`,
      trendUp: (d: number | string) => `Kết quả kiểm tra tăng ${signed(vi, d)}đ`,
      trendDown: (d: number | string) => `Kết quả kiểm tra giảm ${signed(vi, d)}đ`,
      readiness: (days: number | string) => `Giữa kỳ còn ${days} ngày · cần ôn`,
    },
    rules: {
      SCORE_CHANGE_UNUSUAL: {
        title: "Kết quả gần nhất khác đáng kể so với các lần trước",
        summary: (v: Record<string, number | string>) => `Lần gần nhất ${vi(v.latest)} điểm, trung bình các lần trước ${vi(v.mean)} điểm (chênh ${signed(vi, v.delta)} điểm).`,
        threshold: (t: Record<string, number>) => `Chênh lệch từ ${t.minDelta} điểm trở lên và từ ${t.sigmaMultiplier} lần độ lệch chuẩn trở lên (lấy giá trị lớn hơn); so với tối đa ${t.baselineMax} lần trước đó, cần ít nhất ${t.baselineMin} lần.`,
      },
      /** SCORE_CHANGE_UNUSUAL whose compared results are resubmissions of one assigned test (values.context). */
      SCORE_CHANGE_RETAKE: {
        title: "Điểm thay đổi lớn giữa các lần làm lại cùng một bài",
        summary: (v: Record<string, number | string>) => `Lần làm lại gần nhất ${vi(v.latest)} điểm, trung bình các lần làm trước của cùng bài ${vi(v.mean)} điểm (chênh ${signed(vi, v.delta)} điểm). Nên xem học sinh đã nắm vững kiến thức hay chỉ nhớ đáp án của đề đã làm; khác với tiến bộ qua các bài kiểm tra khác nhau.`,
        threshold: (t: Record<string, number>) => `Chênh lệch từ ${t.minDelta} điểm trở lên và từ ${t.sigmaMultiplier} lần độ lệch chuẩn trở lên (lấy giá trị lớn hơn); các lần nộp cùng một bài giao trong vòng 24 giờ.`,
      },
      INSUFFICIENT_EVIDENCE: {
        title: "Chưa đủ bài có điểm để so sánh",
        summary: (v: Record<string, number | string>) => `Hiện có ${v.scoredCount} bài có điểm.`,
        threshold: (t: Record<string, number>) => `Cần ít nhất ${t.minScoredItems} bài có điểm.`,
      },
      HIGH_HINT_DEPENDENCE: {
        title: "Nhiều lần thực hành cần gợi ý ở mức cao",
        summary: (v: Record<string, number | string>) => `${v.highHintCount}/${v.practicalCount} lượt thực hành cần gợi ý ở mức cao.`,
        threshold: (t: Record<string, number>) => `Từ ${t.minPracticals} lượt thực hành, ít nhất ${t.shareNumerator}/${t.shareDenominator} lượt cần gợi ý từ mức ${t.highHintLevel}.`,
      },
      OBJECTIVE_MASTERY_INCONSISTENT: {
        title: "Kết quả giữa các loại bài chưa thống nhất",
        summary: (v: Record<string, number | string>, kinds: Record<string, string>) => `Mục tiêu ${v.outcomeCode}: ${kinds[String(v.passingKind)] ?? v.passingKind} đã đạt nhưng ${kinds[String(v.nonPassingKind)] ?? v.nonPassingKind} chưa đạt.`,
        threshold: (t: Record<string, number>) => `Ít nhất ${t.minItems} bài cho cùng mục tiêu, có ít nhất ${t.minPassing} bài đạt và ${t.minNonPassing} bài chưa đạt ở loại bài khác.`,
      },
      SUBMISSION_SIMILARITY_HIGH: {
        title: "Bài làm có nội dung trùng khá nhiều với bài khác",
        summary: (v: Record<string, number | string>) => `${v.assignmentTitle}: ${v.pairCount} cặp bài có nội dung tương đồng cao đang chờ giáo viên xem xét. Đây là bằng chứng để đối chiếu, không phải kết luận.`,
        threshold: (t: Record<string, number>) => `Mức cao: trùng từ ${t.highContainmentPercent}% trở lên trên ít nhất ${t.minSharedShingles} đoạn chung, so từng câu một.`,
      },
      ASSESSMENT_TREND: {
        title: "Kết quả bài kiểm tra gần nhất khác đáng kể so với các bài trước",
        summary: (v: Record<string, number | string>) =>
          `${v.latestTitle}: ${vi10(v.latest10)}, trung bình ${v.family === "GRADED" ? "các cột kiểm tra" : "các bài"} trước ${viAvg(v.mean10)}/10 (${Number(v.delta10) < 0 ? "giảm" : "tăng"} ${signed(vi, v.delta10)} điểm). Mỗi bài giao chỉ tính một điểm đại diện, không tính các lần làm lại.`,
        threshold: (t: Record<string, number>) =>
          `Chênh từ ${vi(t.minDelta10)} điểm (thang 10) trở lên và từ ${t.sigmaMultiplier} lần độ lệch chuẩn trở lên (lấy giá trị lớn hơn); so với ${t.baselineMin}–${t.baselineMax} bài trước; ưu tiên các cột kiểm tra khi có từ ${t.minGradedSeries} cột.`,
      },
      READINESS_BEFORE_MIDTERM: {
        title: "Sắp kiểm tra giữa kỳ nhưng bài ôn tập chưa xong",
        summary: (v: Record<string, number | string>) =>
          `${v.midtermTitle} (hạn ${viDate(v.midtermDueAt)}, còn ${v.daysLeft} ngày): ${Number(v.notDoneCount) > 0 ? `chưa làm ${v.notDoneCount}/${v.prepCount} bài ôn tập` : `đã làm đủ ${v.prepCount} bài ôn tập`}${v.average10 === "" ? "" : `, điểm trung bình luyện tập ${viAvg(v.average10)}/10`}. Nên nhắc học sinh ôn lại trước khi kiểm tra.`,
        threshold: (t: Record<string, number>) =>
          `Bài giữa kỳ đến hạn trong ${t.readinessWindowDays} ngày; có bài luyện tập hoặc kiểm tra 15 phút cùng bài học chưa làm, hoặc điểm trung bình dưới ${vi(t.lowAverage10)}/10.`,
      },
      MCQ_EXPLANATION_MISMATCH: {
        title: "Điểm trắc nghiệm và phần giải thích chưa tương xứng",
        summary: (v: Record<string, number | string>) => `${v.assignmentTitle}: điểm trắc nghiệm gần nhất ${v.mcqScore} điểm, phần giải thích do giáo viên chấm đạt ${v.explanationPercent}% (${v.direction === "ANSWER_LOW_EXPLANATION_HIGH" ? "trắc nghiệm thấp, giải thích cao" : "trắc nghiệm cao, giải thích thấp"}). Đây là bằng chứng để đối chiếu, không phải kết luận.`,
        threshold: (t: Record<string, number>) => `Trắc nghiệm từ ${t.answerHighMin} điểm trở lên và giải thích không quá ${t.explanationLowMax}%, hoặc trắc nghiệm không quá ${t.answerLowMax} điểm và giải thích từ ${t.explanationHighMin}% trở lên, trong cùng một bài học.`,
      },
      SIMULATION_EXPLANATION_MISMATCH: {
        title: "Kết quả thực hành và phần giải thích chưa tương xứng",
        summary: (v: Record<string, number | string>) => `${v.assignmentTitle}: lượt thực hành gần nhất ${v.verdict === "passed" ? "đạt" : "cần luyện thêm"}, phần giải thích do giáo viên chấm đạt ${v.explanationPercent}%. Đây là bằng chứng để đối chiếu, không phải kết luận.`,
        threshold: (t: Record<string, number>) => `Thực hành đạt và giải thích không quá ${t.explanationLowMax}%, hoặc thực hành cần luyện thêm và giải thích từ ${t.explanationHighMin}% trở lên, trong cùng một bài học.`,
      },
    },
  },
  en: {
    tab: "Support insights",
    eyebrow: "INSIGHTS FROM LEARNING EVIDENCE",
    title: "Student support insights",
    notice: "Insights are only a reason for the teacher to look at the evidence again, not a conclusion about a student. Only the class teacher sees them; student scores, progress and notifications do not change.",
    filterLabel: "Show insights",
    filterOpen: "Not handled yet",
    filterAll: "All",
    loading: "Loading…",
    loadFailed: "support insights",
    empty: "There are no insights to review right now.",
    emptyAll: "There are no insights for this class yet.",
    studentSection: "Insights for this student",
    studentEmpty: "There are no insights for this student yet.",
    insufficientSummary: (n: number) => `${n} ${n === 1 ? "student has" : "students have"} too few scored items`,
    insufficientHint: "These students have fewer than 3 scored items, so their results cannot be compared yet.",
    status: { INFORMATIONAL: "Information", NEEDS_MORE_EVIDENCE: "Needs more evidence", TEACHER_REVIEW_RECOMMENDED: "Worth a look" } as Record<string, string>,
    thresholdsLabel: "Thresholds used",
    evidenceLabel: "Evidence",
    evidenceKind: { QUIZ: "Quiz attempt", TEST: "Assigned test", PRACTICAL: "Practice attempt", WRITTEN: "Submitted written answer", SIMILARITY_MATCH: "Pair of similar answers", WRITTEN_GRADE: "Teacher grade of the written answer", ASSIGNMENT: "Assigned work" } as Record<string, string>,
    assessmentType: TYPE_EN,
    score10: en10,
    evidenceStatus: { UPCOMING: "due soon", NOT_DONE: "not done" } as Record<string, string>,
    openSimilarity: "Review similar content",
    evidenceOpen: "View",
    evidenceClose: "Hide",
    evidenceLoading: "Loading evidence…",
    evidenceFailed: "evidence details",
    quizLine: (score: number, passed: boolean) => `${score}% · ${passed ? "Passed" : "Not passed"}`,
    testNoDetail: "There is no detail page for this kind of item yet.",
    acknowledge: "Acknowledge",
    dismiss: "Dismiss",
    noteLabel: "Note (optional, visible to teachers only)",
    noteCounter: (used: number, max: number) => `${used}/${max} characters`,
    noteTooLong: "The note is too long.",
    confirmAcknowledge: "Save acknowledgement",
    confirmDismiss: "Save and dismiss",
    cancel: "Cancel",
    saving: "Saving…",
    acknowledged: "Acknowledged",
    dismissed: "Dismissed",
    acknowledgedAt: (label: string, when: string) => `${label} · ${when}`,
    replay: "View as acknowledged",
    replayHide: "Hide the earlier view",
    replayTitle: "At the time it was acknowledged",
    replayFailed: "the earlier view",
    replayLoading: "Loading the earlier view…",
    stale: "New work changed the data, so this insight no longer applies. The list has been reloaded.",
    archived: "The class is archived, so insights cannot be acknowledged.",
    patternNote: (message: string) => message,
    unknownTitle: "Insight",
    badge: {
      up: (d: number | string) => `Sharp rise ${signed(en, d)} pts`,
      down: (d: number | string) => `Sharp drop ${signed(en, d)} pts`,
      retake: (d: number | string) => `Retake of same work ${signed(en, d)} pts`,
      trendUp: (d: number | string) => `Test results up ${signed(en, d)} pts`,
      trendDown: (d: number | string) => `Test results down ${signed(en, d)} pts`,
      readiness: (days: number | string) => `Midterm in ${days} days · review needed`,
    },
    rules: {
      SCORE_CHANGE_UNUSUAL: {
        title: "The latest result differs noticeably from earlier ones",
        summary: (v: Record<string, number | string>) => `Latest ${en(v.latest)} points, average of earlier results ${en(v.mean)} points (difference ${signed(en, v.delta)}).`,
        threshold: (t: Record<string, number>) => `A difference of at least ${t.minDelta} points and at least ${t.sigmaMultiplier} standard deviations (the larger applies); compared with up to ${t.baselineMax} earlier results, at least ${t.baselineMin} needed.`,
      },
      SCORE_CHANGE_RETAKE: {
        title: "Large score change between retakes of the same work",
        summary: (v: Record<string, number | string>) => `Latest retake ${en(v.latest)} points, average of earlier attempts at the same work ${en(v.mean)} points (difference ${signed(en, v.delta)}). Check whether the student has mastered the content or remembers the answers of the test already taken; this differs from progress across different tests.`,
        threshold: (t: Record<string, number>) => `A difference of at least ${t.minDelta} points and at least ${t.sigmaMultiplier} standard deviations (the larger applies); submissions of one assigned work within 24 hours.`,
      },
      INSUFFICIENT_EVIDENCE: {
        title: "Too few scored items to compare",
        summary: (v: Record<string, number | string>) => `${v.scoredCount} scored items so far.`,
        threshold: (t: Record<string, number>) => `At least ${t.minScoredItems} scored items needed.`,
      },
      HIGH_HINT_DEPENDENCE: {
        title: "Many practice attempts needed high-level hints",
        summary: (v: Record<string, number | string>) => `${v.highHintCount} of ${v.practicalCount} practice attempts needed high-level hints.`,
        threshold: (t: Record<string, number>) => `From ${t.minPracticals} practice attempts, at least ${t.shareNumerator} of every ${t.shareDenominator} needed hints from level ${t.highHintLevel}.`,
      },
      OBJECTIVE_MASTERY_INCONSISTENT: {
        title: "Results differ between kinds of work",
        summary: (v: Record<string, number | string>, kinds: Record<string, string>) => `Objective ${v.outcomeCode}: ${kinds[String(v.passingKind)] ?? v.passingKind} passed but ${kinds[String(v.nonPassingKind)] ?? v.nonPassingKind} did not.`,
        threshold: (t: Record<string, number>) => `At least ${t.minItems} items for the same objective, with at least ${t.minPassing} passed and ${t.minNonPassing} not passed in another kind of work.`,
      },
      SUBMISSION_SIMILARITY_HIGH: {
        title: "An answer overlaps noticeably with another answer",
        summary: (v: Record<string, number | string>) => `${v.assignmentTitle}: ${v.pairCount} ${Number(v.pairCount) === 1 ? "pair" : "pairs"} of answers with high overlap are waiting for the teacher to look at them. This is evidence to compare, not a conclusion.`,
        threshold: (t: Record<string, number>) => `High level: an overlap of at least ${t.highContainmentPercent}% over at least ${t.minSharedShingles} shared passages, compared one question at a time.`,
      },
      ASSESSMENT_TREND: {
        title: "The latest test result differs noticeably from earlier tests",
        summary: (v: Record<string, number | string>) =>
          `${v.latestTitle}: ${en10(v.latest10)}, average of earlier ${v.family === "GRADED" ? "test columns" : "work"} ${enAvg(v.mean10)}/10 (${Number(v.delta10) < 0 ? "down" : "up"} ${signed(en, v.delta10)} points). Each assignment counts one representative score; retakes never count.`,
        threshold: (t: Record<string, number>) =>
          `A change of at least ${en(t.minDelta10)} points (10-point scale) and at least ${t.sigmaMultiplier} standard deviations (the larger applies); compared with ${t.baselineMin}–${t.baselineMax} earlier assignments; test columns are preferred once there are ${t.minGradedSeries}.`,
      },
      READINESS_BEFORE_MIDTERM: {
        title: "Midterm coming up while review work is unfinished",
        summary: (v: Record<string, number | string>) =>
          `${v.midtermTitle} (due ${enDate(v.midtermDueAt)}, ${v.daysLeft} days left): ${Number(v.notDoneCount) > 0 ? `${v.notDoneCount} of ${v.prepCount} review assignments not done` : `all ${v.prepCount} review assignments done`}${v.average10 === "" ? "" : `, practice average ${enAvg(v.average10)}/10`}. Consider reminding the student to review before the test.`,
        threshold: (t: Record<string, number>) =>
          `The midterm is due within ${t.readinessWindowDays} days; practice or 15-minute work of the same lesson is not done, or its average is below ${en(t.lowAverage10)}/10.`,
      },
      MCQ_EXPLANATION_MISMATCH: {
        title: "Multiple-choice score and written explanation do not match",
        summary: (v: Record<string, number | string>) => `${v.assignmentTitle}: latest multiple-choice score ${v.mcqScore}, teacher-graded explanation ${v.explanationPercent}% (${v.direction === "ANSWER_LOW_EXPLANATION_HIGH" ? "low multiple-choice score, high explanation" : "high multiple-choice score, low explanation"}). This is evidence to compare, not a conclusion.`,
        threshold: (t: Record<string, number>) => `A score of at least ${t.answerHighMin} with an explanation of at most ${t.explanationLowMax}%, or a score of at most ${t.answerLowMax} with an explanation of at least ${t.explanationHighMin}%, within the same lesson.`,
      },
      SIMULATION_EXPLANATION_MISMATCH: {
        title: "Practice result and written explanation do not match",
        summary: (v: Record<string, number | string>) => `${v.assignmentTitle}: latest practice attempt ${v.verdict === "passed" ? "passed" : "needs more practice"}, teacher-graded explanation ${v.explanationPercent}%. This is evidence to compare, not a conclusion.`,
        threshold: (t: Record<string, number>) => `A passed practice with an explanation of at most ${t.explanationLowMax}%, or a practice that needs more work with an explanation of at least ${t.explanationHighMin}%, within the same lesson.`,
      },
    },
  },
};

export const insightText = defineText(insightMessages);
