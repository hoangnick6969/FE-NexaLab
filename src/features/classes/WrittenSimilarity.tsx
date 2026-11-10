import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api, idempotencyKey, mutate } from "../../lib/api";
import { Badge, ErrorBox } from "../../components/ui";
import { dateTime } from "../../lib/test-status";
import { LoadError } from "./class-ui";
import { segmentsOf, type SimilaritySpan } from "./similarity-spans";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    title: "Kiểm tra nội dung tương đồng",
    notice: "Kết quả chỉ là bằng chứng để giáo viên tham khảo, không phải kết luận. Hệ thống không thay đổi điểm, trạng thái hay thông báo của học sinh, và học sinh, phụ huynh không nhìn thấy kết quả này.",
    howItWorks: "Chỉ so sánh bài nộp hiện tại của các học sinh khác nhau trong bài giao này, từng câu một. Đề bài, công thức và cụm từ chung giáo viên đã khai báo được bỏ qua.",
    run: "Chạy kiểm tra",
    rerun: "Chạy lại với bài nộp mới",
    running: "Đang kiểm tra…",
    created: (matches: number) => `Đã kiểm tra xong: ${matches} cặp bài có nội dung tương đồng.`,
    replayed: "Bộ bài nộp chưa thay đổi nên đang dùng lại kết quả đã có.",
    loading: "Đang tải…",
    noRun: "Chưa có lần kiểm tra nào cho bài giao này.",
    runInfo: (when: string, submissions: number, matches: number) => `Lần kiểm tra lúc ${when} · ${submissions} bài nộp · ${matches} cặp tương đồng`,
    stale: "Có bài nộp mới sau lần kiểm tra này, kết quả có thể đã cũ. Hãy chạy lại để cập nhật.",
    skipped: (n: number) => `${n} bài làm quá ngắn ở một số câu nên không được so sánh ở các câu đó.`,
    noMatches: "Không có cặp bài nào đạt ngưỡng tương đồng.",
    pair: "Cặp bài",
    level: { HIGH: "Mức cao", ELEVATED: "Mức đáng chú ý" } as Record<string, string>,
    maxContainment: (percent: number) => `Trùng tối đa ${percent}%`,
    show: "Xem so sánh",
    hide: "Ẩn so sánh",
    question: (n: number) => `Câu ${n}`,
    prompt: "Đề bài",
    sharedCount: (shared: number, percent: number) => `${shared} đoạn chung · ${percent}% đoạn của bài ngắn hơn`,
    answerOf: (name: string) => `Bài của ${name}`,
    unknownStudent: "Học sinh",
    matched: "Phần trùng được tô sáng",
    reviewTitle: "Ghi nhận của giáo viên",
    status: { NOTED: "Ghi nhận để theo dõi", DISMISSED: "Bỏ qua, không cần xem thêm" } as Record<string, string>,
    currentReview: (status: string, when: string, count: number) => `Hiện tại: ${status} · ${when}${count > 1 ? ` · ${count} lần ghi nhận` : ""}`,
    noReview: "Chưa có ghi nhận nào.",
    note: "Ghi chú (chỉ giáo viên thấy, tối đa 1000 ký tự)",
    save: "Lưu ghi nhận",
    saving: "Đang lưu…",
    back: "← Quay lại danh sách",
  },
  en: {
    title: "Similar content check",
    notice: "The result is evidence for the teacher to review, not a conclusion. The system never changes scores, statuses or notifications, and students and parents cannot see it.",
    howItWorks: "Only the current submissions of different students in this assignment are compared, prompt by prompt. The prompt text, formulas and the common phrases you declared are ignored.",
    run: "Run the check",
    rerun: "Run again with new submissions",
    running: "Checking…",
    created: (matches: number) => `Check finished: ${matches} ${matches === 1 ? "pair" : "pairs"} with similar content.`,
    replayed: "The set of submissions has not changed, so the existing result is shown.",
    loading: "Loading…",
    noRun: "No check has been run for this assignment yet.",
    runInfo: (when: string, submissions: number, matches: number) => `Checked ${when} · ${submissions} submissions · ${matches} similar ${matches === 1 ? "pair" : "pairs"}`,
    stale: "New submissions arrived after this check, so the result may be out of date. Run it again to update.",
    skipped: (n: number) => `${n} ${n === 1 ? "answer was" : "answers were"} too short on some questions and not compared there.`,
    noMatches: "No pair of submissions reached the similarity threshold.",
    pair: "Pair",
    level: { HIGH: "High", ELEVATED: "Notable" } as Record<string, string>,
    maxContainment: (percent: number) => `Up to ${percent}% shared`,
    show: "Compare side by side",
    hide: "Hide comparison",
    question: (n: number) => `Question ${n}`,
    prompt: "Prompt",
    sharedCount: (shared: number, percent: number) => `${shared} shared passages · ${percent}% of the shorter answer`,
    answerOf: (name: string) => `${name}'s answer`,
    unknownStudent: "Student",
    matched: "Shared parts are highlighted",
    reviewTitle: "Teacher review",
    status: { NOTED: "Noted for follow-up", DISMISSED: "Dismissed, no further look needed" } as Record<string, string>,
    currentReview: (status: string, when: string, count: number) => `Current: ${status} · ${when}${count > 1 ? ` · ${count} reviews` : ""}`,
    noReview: "No review yet.",
    note: "Note (teacher only, up to 1000 characters)",
    save: "Save review",
    saving: "Saving…",
    back: "← Back to the list",
  },
});

type Student = { id: string; fullName: string; username: string } | null;
type RunSummary = { id: string; submissionCount: number; matchCount: number; skipped: Array<{ submissionId: string; promptId: string }>; createdAt: string; stale: boolean };
type PromptMatch = { promptId: string; promptText: string; containment: number; shared: number; level: string; spansA: SimilaritySpan[]; spansB: SimilaritySpan[]; textA: string; textB: string };
type Match = {
  id: string;
  level: string;
  maxContainment: number;
  submissionA: { id: string; student: Student };
  submissionB: { id: string; student: Student };
  review: { status: string; note: string | null; createdAt: string } | null;
  reviewCount: number;
  perPrompt: PromptMatch[];
};
type Detail = { run: RunSummary; matches: Match[] };

const levelTone: Record<string, string> = { HIGH: "gold", ELEVATED: "partial" };
const percent = (value: number) => Math.round(value * 100);

/** A response with its shared parts highlighted. Each segment is a React text node; nothing is rendered as HTML. */
function SpanText({ value, spans }: { value: string; spans: SimilaritySpan[] }) {
  return (
    <p className="similarity-text">
      {segmentsOf(value, spans).map((segment, index) => (segment.marked ? <mark key={index} className="similarity-mark">{segment.text}</mark> : <span key={index}>{segment.text}</span>))}
    </p>
  );
}

function ReviewForm({ classId, assignmentId, runId, match }: { classId: string; assignmentId: string; runId: string; match: Match }) {
  const t = text();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"NOTED" | "DISMISSED">("NOTED");
  const [note, setNote] = useState("");
  const key = useRef<string | null>(null);
  const save = useMutation({
    mutationFn: () => {
      key.current ??= idempotencyKey();
      return mutate(`/classes/${classId}/assignments/${assignmentId}/similarity-runs/${runId}/matches/${match.id}/reviews`, "POST", { status, ...(note.trim() ? { note: note.trim() } : {}) }, key.current);
    },
    onSuccess: () => {
      key.current = null;
      setNote("");
      void queryClient.invalidateQueries({ queryKey: ["similarity-run", classId, runId] });
    },
  });
  return (
    <section className="similarity-review" aria-label={t.reviewTitle}>
      <h4>{t.reviewTitle}</h4>
      <p className="tiny muted">
        {match.review ? t.currentReview(t.status[match.review.status] ?? match.review.status, dateTime(match.review.createdAt), match.reviewCount) : t.noReview}
        {match.review?.note ? ` · ${match.review.note}` : ""}
      </p>
      <fieldset className="segmented">
        {(["NOTED", "DISMISSED"] as const).map((value) => (
          <label key={value} className="check">
            <input type="radio" name={`review-${match.id}`} checked={status === value} onChange={() => setStatus(value)} />
            {t.status[value]}
          </label>
        ))}
      </fieldset>
      <label className="field">
        <span>{t.note}</span>
        <textarea rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <ErrorBox error={save.error} />
      <button type="button" className="primary" disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? t.saving : t.save}
      </button>
    </section>
  );
}

function MatchCard({ classId, assignmentId, runId, match }: { classId: string; assignmentId: string; runId: string; match: Match }) {
  const t = text();
  const [open, setOpen] = useState(false);
  const nameA = match.submissionA.student?.fullName ?? t.unknownStudent;
  const nameB = match.submissionB.student?.fullName ?? t.unknownStudent;
  return (
    <article className="similarity-card" aria-label={`${t.pair}: ${nameA} / ${nameB}`}>
      <div className="section-heading">
        <h3>{nameA} · {nameB}</h3>
        <Badge tone={levelTone[match.level] ?? "outline"}>{t.level[match.level] ?? match.level}</Badge>
      </div>
      <p className="tiny muted">
        {t.maxContainment(percent(match.maxContainment))}
        {match.review ? ` · ${t.status[match.review.status] ?? match.review.status}` : ""}
      </p>
      <button type="button" className="text-button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? t.hide : t.show}</button>
      {open && (
        <div className="similarity-detail">
          <p className="tiny muted">{t.matched}</p>
          {match.perPrompt.map((prompt, index) => (
            <section key={prompt.promptId} className="similarity-prompt">
              <h4>{t.question(index + 1)} · {t.sharedCount(prompt.shared, percent(prompt.containment))}</h4>
              {prompt.promptText && <p className="tiny muted"><b>{t.prompt}:</b> {prompt.promptText}</p>}
              <div className="similarity-columns">
                <div><b>{t.answerOf(nameA)}</b><SpanText value={prompt.textA} spans={prompt.spansA} /></div>
                <div><b>{t.answerOf(nameB)}</b><SpanText value={prompt.textB} spans={prompt.spansB} /></div>
              </div>
            </section>
          ))}
          <ReviewForm classId={classId} assignmentId={assignmentId} runId={runId} match={match} />
        </div>
      )}
    </article>
  );
}

/**
 * Teacher similarity run view for one written assignment (TAI3-T5): run or rerun the check, show the stale banner,
 * list the pairs with level badges, compare two answers side by side and record a review. Teacher only.
 */
export function WrittenSimilarity({ classId, assignmentId, onBack }: { classId: string; assignmentId: string; onBack: () => void }) {
  const t = text();
  const queryClient = useQueryClient();
  const base = `/classes/${classId}/assignments/${assignmentId}/similarity-runs`;
  const [notice, setNotice] = useState<string | null>(null);
  const key = useRef<string | null>(null);
  const runs = useQuery<{ items: RunSummary[] }>({ queryKey: ["similarity-runs", classId, assignmentId], queryFn: () => api(base) });
  const latest = runs.data?.items[0] ?? null;
  const detail = useQuery<Detail>({
    queryKey: ["similarity-run", classId, latest?.id],
    queryFn: () => api(`${base}/${latest!.id}`),
    enabled: !!latest,
  });
  const run = useMutation({
    mutationFn: () => {
      key.current ??= idempotencyKey();
      return mutate<{ replayed: boolean; run: RunSummary }>(base, "POST", {}, key.current);
    },
    onSuccess: (data) => {
      key.current = null;
      setNotice(data.replayed ? t.replayed : t.created(data.run.matchCount));
      void queryClient.invalidateQueries({ queryKey: ["similarity-runs", classId, assignmentId] });
      void queryClient.invalidateQueries({ queryKey: ["similarity-run", classId] });
    },
    onError: () => {
      key.current = null;
    },
  });
  const shortAnswers = new Set((latest?.skipped ?? []).map((s) => s.submissionId)).size;
  return (
    <div className="similarity-view">
      <button type="button" className="text-button" onClick={onBack}>{t.back}</button>
      <h3>{t.title}</h3>
      <p className="notice" role="note">{t.notice}</p>
      <p className="tiny muted">{t.howItWorks}</p>
      <LoadError query={runs} what={t.title} />
      <div className="button-row">
        <button type="button" className="primary" disabled={run.isPending} onClick={() => { setNotice(null); run.mutate(); }}>
          {run.isPending ? t.running : latest ? t.rerun : t.run}
        </button>
      </div>
      <ErrorBox error={run.error} />
      {notice && <p className="notice" role="status">{notice}</p>}
      {runs.isLoading && <p>{t.loading}</p>}
      {runs.data && !latest && <p>{t.noRun}</p>}
      {latest && (
        <>
          <p className="tiny muted">{t.runInfo(dateTime(latest.createdAt), latest.submissionCount, latest.matchCount)}</p>
          {latest.stale && <p className="notice" role="alert">{t.stale}</p>}
          {shortAnswers > 0 && <p className="tiny muted">{t.skipped(shortAnswers)}</p>}
          <LoadError query={detail} what={t.title} />
          {detail.data && detail.data.matches.length === 0 && <p>{t.noMatches}</p>}
          {detail.data?.matches.map((match) => <MatchCard key={match.id} classId={classId} assignmentId={assignmentId} runId={latest.id} match={match} />)}
        </>
      )}
    </div>
  );
}
