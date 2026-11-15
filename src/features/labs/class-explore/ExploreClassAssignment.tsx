/**
 * A student opens a Class Explore assignment (P0 C3.4): the bench with the config the teacher's selection derived, pinned in
 * the assignment snapshot, and the task panel to hand in measured values and an explanation. Never a run, verdict or progress.
 */
import { Suspense, lazy, useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, idempotencyKey, isApiError, mutate } from "../../../lib/api";
import { defineText, formatDateTime } from "../../../i18n";
import { exploreBench } from "../runtime/explore-registry";
import { LabSpace } from "../shared/LabSpace";
import {
  assignmentStorageKey, EXPLANATION_MAX, formatTenthsPh, parsePhInput,
  type ExploreAssignmentView, type ExploreRequirement, type ExploreSubmission,
} from "./class-explore";

const text = defineText({
  vi: {
    space: "Bài thực hành", loading: "Đang tải bài…", loadFailed: "Không tải được bài giao.", retry: "Thử lại", back: "Về bài giao",
    notExplore: "Bài giao này không phải bài Explore của lớp.",
    invalid: "Cấu hình của bài này không hợp lệ nên bàn thí nghiệm không được mở.", code: "Mã lỗi:",
    heading: "Bài làm của em", teacherNote: "Lời dặn của giáo viên", due: "Hạn nộp",
    measureHelp: "Đo bằng bút đo pH trên bàn rồi ghi số em đọc được (ví dụ 7,0).",
    phOf: (name: string) => `pH của ${name}`, explanation: "Lời giải thích của em", explanationHelp: "Em dựa vào số đo nào để kết luận?",
    counter: (n: number, max: number) => `${n} / ${max} ký tự`,
    submit: "Nộp bài", submitting: "Đang nộp…",
    phInvalid: "Nhập số từ 0 đến 14, tối đa một chữ số thập phân (ví dụ 7,0).", explainRequired: "Hãy viết lời giải thích.",
    submitted: "Em đã nộp bài", reviewed: "Giáo viên đã nhận xét", sentAt: (when: string) => `Nộp lúc ${when}`,
    yourValues: "Số đo em đã nộp", teacherFeedback: "Nhận xét của giáo viên", noScore: "Bài này không chấm điểm.",
    already: "Em đã nộp bài này rồi; bài đã nộp không sửa được.",
    saveFailed: "Chưa nộp được bài.",
  },
  en: {
    space: "Practical", loading: "Loading…", loadFailed: "Could not load the assignment.", retry: "Retry", back: "Back to assignment",
    notExplore: "This assignment is not a class Explore lab.",
    invalid: "This lab's configuration is not valid, so the bench was not opened.", code: "Error code:",
    heading: "Your work", teacherNote: "Teacher's note", due: "Due",
    measureHelp: "Measure with the pH pen on the bench and write the number you read (for example 7.0).",
    phOf: (name: string) => `pH of ${name}`, explanation: "Your explanation", explanationHelp: "Which measurement do you rely on?",
    counter: (n: number, max: number) => `${n} / ${max} characters`,
    submit: "Submit", submitting: "Submitting…",
    phInvalid: "Enter a number from 0 to 14 with at most one decimal (for example 7.0).", explainRequired: "Write your explanation.",
    submitted: "You have submitted", reviewed: "Your teacher has commented", sentAt: (when: string) => `Submitted ${when}`,
    yourValues: "Your submitted values", teacherFeedback: "Teacher's comment", noScore: "This work is not graded.",
    already: "You have already submitted this; a submitted answer cannot be changed.",
    saveFailed: "Could not submit.",
  },
});

export default function ExploreClassAssignment({ assignmentId }: { assignmentId: string }) {
  const t = text();
  const navigate = useNavigate();
  const query = useQuery<ExploreAssignmentView>({ queryKey: ["assignment", assignmentId], queryFn: () => api(`/assignments/${assignmentId}`) });
  const snapshot = query.data?.explore?.snapshot;
  const kit = snapshot?.effectiveConfig?.kit as string | undefined;
  const bench = kit ? exploreBench(kit) : undefined;
  const ClassPage = useMemo(() => (bench?.loadClassPage ? lazy(bench.loadClassPage) : null), [bench]);
  const exit = `/assignments/${encodeURIComponent(assignmentId)}`;
  const shell = (children: React.ReactNode, title = t.space) => <LabSpace title={title} exitTo={exit}>{children}</LabSpace>;

  if (query.isPending) return shell(<p role="status" className="panel">{t.loading}</p>);
  if (query.isError) return shell(<section className="panel" role="alert"><p>{t.loadFailed}</p><button type="button" className="primary" onClick={() => void query.refetch()}>{t.retry}</button></section>);
  const data = query.data;
  if (data.contentType !== "explore_lab" || !snapshot) return shell(<section className="panel" role="alert"><p>{t.notExplore}</p></section>);

  const validated = bench?.validate(snapshot.effectiveConfig);
  if (!bench || !ClassPage || !validated?.ok || validated.config.labId !== snapshot.labId)
    return shell(<section className="panel" role="alert" data-testid="explore-error"><h1>{t.invalid}</h1><p>{t.code} <code>EXPLORE_CONFIG_INVALID</code></p></section>, snapshot.title);

  const labels = Object.fromEntries(bench.listKitItems(snapshot.effectiveConfig).filter((item) => item.category === "material").map((item) => [item.id, item.labelVi]));
  return <Suspense fallback={<p role="status" className="panel">{t.loading}</p>}>
    <ClassPage
      key={`class-explore:${assignmentId}`}
      title={snapshot.title}
      config={snapshot.effectiveConfig}
      storageKey={assignmentStorageKey(snapshot.labId, assignmentId)}
      onExit={() => navigate(exit)}
      classSection={<ExploreTaskPanel assignment={data} labels={labels} />}
    />
  </Suspense>;
}

/** The task panel in the question drawer: the teacher's note, the form, or what was handed in. */
function ExploreTaskPanel({ assignment, labels }: { assignment: ExploreAssignmentView; labels: Record<string, string> }) {
  const t = text();
  const { snapshot, submission } = assignment.explore;
  return <section className="class-lab-instructions explore-task" aria-label={t.heading} data-testid="explore-task">
    <h3>{t.heading}</h3>
    {assignment.dueDate && <p className="tiny muted">{t.due}: {formatDateTime(assignment.dueDate)}</p>}
    {snapshot.instructions && <><h4>{t.teacherNote}</h4><p className="explore-task-note">{snapshot.instructions}</p></>}
    {submission
      ? <SubmittedWork submission={submission} requirements={snapshot.requirements} labels={labels} />
      : <SubmitForm assignmentId={assignment.id} requirements={snapshot.requirements} labels={labels} />}
  </section>;
}

function SubmittedWork({ submission, requirements, labels }: { submission: ExploreSubmission; requirements: ExploreRequirement[]; labels: Record<string, string> }) {
  const t = text();
  const order = requirements.flatMap((item) => (item.kind === "measure" ? [item.itemId] : []));
  const measures = [...submission.answers.measures].sort((a, b) => order.indexOf(a.itemId) - order.indexOf(b.itemId));
  return <div role="status" data-testid="explore-submitted">
    <p><strong>{submission.status === "REVIEWED" ? t.reviewed : t.submitted}</strong> · <span className="tiny muted">{t.sentAt(formatDateTime(submission.submittedAt))}</span></p>
    <h4>{t.yourValues}</h4>
    <ul>{measures.map((item) => <li key={item.itemId}>{t.phOf(labels[item.itemId] ?? item.itemId)}: <b>{formatTenthsPh(item.tenthsPh)}</b></li>)}</ul>
    {submission.answers.explanation && <p className="explore-task-note">{submission.answers.explanation}</p>}
    {submission.feedback && <><h4>{t.teacherFeedback}</h4><p className="explore-task-note" data-testid="explore-feedback">{submission.feedback}</p></>}
    <p className="tiny muted">{t.noScore}</p>
  </div>;
}

function SubmitForm({ assignmentId, requirements, labels }: { assignmentId: string; requirements: ExploreRequirement[]; labels: Record<string, string> }) {
  const t = text();
  const queryClient = useQueryClient();
  const measures = requirements.flatMap((item) => (item.kind === "measure" ? [item] : []));
  const explain = requirements.some((item) => item.kind === "explain");
  const [values, setValues] = useState<Record<string, string>>({});
  const [explanation, setExplanation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const key = useRef(idempotencyKey());
  const send = useMutation({
    mutationFn: (body: unknown) => mutate(`/assignments/${assignmentId}/explore-submissions`, "POST", body, key.current),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["assignment", assignmentId] }),
    onError: (error) => { if (isApiError(error, "EXPLORE_ALREADY_SUBMITTED")) void queryClient.invalidateQueries({ queryKey: ["assignment", assignmentId] }); },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    const parsed = measures.map((item) => ({ item, value: parsePhInput(values[item.itemId] ?? "") }));
    for (const { item, value } of parsed) if (!value.ok) next[item.itemId] = t.phInvalid;
    if (explain && !explanation.trim()) next.explanation = t.explainRequired;
    setErrors(next);
    if (Object.keys(next).length) return;
    send.mutate({
      measures: parsed.map(({ item, value }) => ({ itemId: item.itemId, tenthsPh: value.ok ? value.tenths : 0 })),
      ...(explain ? { explanation: explanation.trim() } : {}),
    });
  };
  const failure = send.error;
  return <form onSubmit={onSubmit} noValidate data-testid="explore-form">
    {measures.length > 0 && <p className="tiny muted">{t.measureHelp}</p>}
    {measures.map((item) => {
      const id = `explore-ph-${item.itemId}`;
      const label = t.phOf(labels[item.itemId] ?? item.itemId);
      return <label className="field" key={item.itemId} htmlFor={id}>
        <span>{label}</span>
        <input id={id} inputMode="decimal" autoComplete="off" value={values[item.itemId] ?? ""} aria-invalid={Boolean(errors[item.itemId])} aria-describedby={errors[item.itemId] ? `${id}-error` : undefined}
          onChange={(event) => { setValues((current) => ({ ...current, [item.itemId]: event.target.value })); setErrors((current) => ({ ...current, [item.itemId]: "" })); }} />
        {errors[item.itemId] && <span id={`${id}-error`} className="error" role="alert">{errors[item.itemId]}</span>}
      </label>;
    })}
    {explain && <label className="field" htmlFor="explore-explanation">
      <span>{t.explanation}</span>
      <textarea id="explore-explanation" rows={4} maxLength={EXPLANATION_MAX} value={explanation} aria-invalid={Boolean(errors.explanation)}
        onChange={(event) => { setExplanation(event.target.value); setErrors((current) => ({ ...current, explanation: "" })); }} />
      <span className="tiny muted">{t.explanationHelp} · {t.counter(explanation.length, EXPLANATION_MAX)}</span>
      {errors.explanation && <span className="error" role="alert">{errors.explanation}</span>}
    </label>}
    {failure && <p className="error" role="alert">{isApiError(failure, "EXPLORE_ALREADY_SUBMITTED") ? t.already : failure instanceof Error && failure.message ? failure.message : t.saveFailed}</p>}
    <button type="submit" className="primary" disabled={send.isPending}>{send.isPending ? t.submitting : t.submit}</button>
  </form>;
}
