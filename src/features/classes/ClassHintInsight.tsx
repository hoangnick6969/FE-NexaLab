import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { ErrorBox, InlineLoader } from "../../components/ui";
import { defineText } from "../../i18n";
import "./ClassHintInsight.css";

/** SAI-02A: where the class is stuck on a Lab assignment (BE hint-insights@1). Counts only; no names, no ranking. */
type Levels = { 1: number; 2: number; 3: number; 4: number };
type Misconception = { id: string; label: string; students: number; evidence: string[]; disagreement: { note: string | null; at: string } | null };
type Step = {
  criterion: string; label: string; studentsUnmet: number; evidence: string[];
  hints: { total: number; students: number; byLevel: Levels; reflections: number };
  misconceptions: Misconception[];
};
type Insight = {
  ruleVersion: string; hintRules: string; misconceptionRules: string;
  totals: { targeted: number; submitted: number; passed: number; notPassed: number; notStarted: number };
  rubrics: Array<{ rubricRef: string; submitted: number; steps: Step[] }>;
};

const text = defineText({
  vi: {
    title: "Lớp đang vướng ở đâu",
    loading: "Đang tổng hợp lần nộp gần nhất của lớp…",
    totals: (t: Insight["totals"]) => `${t.submitted}/${t.targeted} học sinh đã nộp · ${t.passed} đạt · ${t.notPassed} chưa đạt · ${t.notStarted} chưa nộp`,
    none: "Chưa có lần nộp hay gợi ý nào để tổng hợp.",
    unmet: (n: number, of: number) => `${n}/${of} học sinh chưa đạt bước này`,
    hints: (total: number, students: number) => `${total} lần xin gợi ý · ${students} học sinh`,
    levels: (l: Levels, r: number) => `Mức 1: ${l[1]} · Mức 2: ${l[2]} · Mức 3: ${l[3]} · Mức 4: ${l[4]} · Suy ngẫm: ${r}`,
    evidence: (n: number) => `${n} bằng chứng`,
    hypothesis: "Giả thuyết lỗi hiểu sai",
    students: (n: number) => `${n} học sinh`,
    disagree: "Không đồng ý",
    disagreed: "Bạn đã đánh dấu không đồng ý",
    withdraw: "Rút lại",
    note: "Lý do (không bắt buộc)",
    save: "Ghi nhận",
    cancel: "Huỷ",
    footer: "Giả thuyết được suy ra từ câu trả lời sai theo luật cố định, không phải chẩn đoán. Học sinh và phụ huynh không thấy phần này. Đánh dấu không đồng ý chỉ là phản hồi cho luật, không đổi kết quả của học sinh.",
    versions: (i: Insight) => `${i.ruleVersion} · ${i.hintRules} · ${i.misconceptionRules}`,
  },
  en: {
    title: "Where the class is stuck",
    loading: "Summarising the class's latest submissions…",
    totals: (t: Insight["totals"]) => `${t.submitted}/${t.targeted} students submitted · ${t.passed} passed · ${t.notPassed} not passed · ${t.notStarted} not submitted`,
    none: "No submissions or hints to summarise yet.",
    unmet: (n: number, of: number) => `${n}/${of} students have not met this step`,
    hints: (total: number, students: number) => `${total} hints asked · ${students} students`,
    levels: (l: Levels, r: number) => `Level 1: ${l[1]} · Level 2: ${l[2]} · Level 3: ${l[3]} · Level 4: ${l[4]} · Reflections: ${r}`,
    evidence: (n: number) => `${n} evidence ${n === 1 ? "item" : "items"}`,
    hypothesis: "Misconception hypothesis",
    students: (n: number) => `${n} ${n === 1 ? "student" : "students"}`,
    disagree: "Disagree",
    disagreed: "You marked this as disagreed",
    withdraw: "Withdraw",
    note: "Reason (optional)",
    save: "Save",
    cancel: "Cancel",
    footer: "Hypotheses come from wrong answers by fixed rules; they are not a diagnosis. Students and parents never see this. Disagreeing is feedback on the rule and never changes a student's result.",
    versions: (i: Insight) => `${i.ruleVersion} · ${i.hintRules} · ${i.misconceptionRules}`,
  },
});

export function ClassHintInsight({ classId, assignmentId }: { classId: string; assignmentId: string }) {
  const t = text();
  const queryKey = ["hint-insight", classId, assignmentId];
  const base = `/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/hint-insight`;
  const q = useQuery<Insight>({ queryKey, queryFn: () => api(base) });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const mark = useMutation({
    mutationFn: (input: { rubricRef: string; criterion: string; misconception: string; note?: string; withdraw?: boolean }) => input.withdraw
      ? api(`${base}/disagreements?${new URLSearchParams({ rubricRef: input.rubricRef, criterion: input.criterion, misconception: input.misconception })}`, "DELETE")
      : api(`${base}/disagreements`, "PUT", { rubricRef: input.rubricRef, criterion: input.criterion, misconception: input.misconception, ...(input.note ? { note: input.note } : {}) }),
    onSuccess: () => { setEditing(null); setNote(""); void qc.invalidateQueries({ queryKey }); },
  });
  const steps = q.data?.rubrics.flatMap((rubric) => rubric.steps.map((step) => ({ rubric, step }))) ?? [];
  const active = steps.filter(({ step }) => step.studentsUnmet || step.hints.total);
  return (
    <section className="class-hint-insight" aria-labelledby="class-hint-insight-title" data-testid="class-hint-insight">
      <h3 id="class-hint-insight-title">{t.title}</h3>
      {q.isLoading && <InlineLoader message={t.loading} />}
      <ErrorBox error={q.error} />
      {q.data && <p className="muted">{t.totals(q.data.totals)}</p>}
      {q.data && !active.length && <p className="muted">{t.none}</p>}
      <ol className="class-hint-insight-steps">
        {active.map(({ rubric, step }) => (
          <li key={rubric.rubricRef + step.criterion} data-criterion={step.criterion}>
            <div className="class-hint-insight-head">
              <b>{step.label}</b>
              {step.evidence.length > 0 && <small className="muted">{t.evidence(step.evidence.length)}</small>}
            </div>
            <div className="class-hint-insight-bar" role="img" aria-label={t.unmet(step.studentsUnmet, rubric.submitted)}>
              <i style={{ width: rubric.submitted ? `${(100 * step.studentsUnmet) / rubric.submitted}%` : "0%" }} />
            </div>
            <p className="class-hint-insight-unmet">{t.unmet(step.studentsUnmet, rubric.submitted)}</p>
            {step.hints.total > 0 && <p className="tiny muted">{t.hints(step.hints.total, step.hints.students)} — {t.levels(step.hints.byLevel, step.hints.reflections)}</p>}
            {step.misconceptions.map((item) => {
              const key = rubric.rubricRef + step.criterion + item.id;
              const target = { rubricRef: rubric.rubricRef, criterion: step.criterion, misconception: item.id };
              return (
                <div className="class-hint-insight-misconception" key={item.id} data-misconception={item.id} data-disagreed={Boolean(item.disagreement)}>
                  <div>
                    <small className="muted">{t.hypothesis}</small>
                    <p>{item.label} · <b>{t.students(item.students)}</b></p>
                    {item.disagreement && <p className="tiny muted">{t.disagreed}{item.disagreement.note ? `: “${item.disagreement.note}”` : ""}</p>}
                  </div>
                  {item.disagreement ? (
                    <button type="button" className="text-button" disabled={mark.isPending} onClick={() => mark.mutate({ ...target, withdraw: true })}>{t.withdraw}</button>
                  ) : editing === key ? (
                    <form className="class-hint-insight-form" onSubmit={(event) => { event.preventDefault(); mark.mutate({ ...target, note: note.trim() || undefined }); }}>
                      <label className="field"><span>{t.note}</span><textarea value={note} maxLength={500} rows={2} onChange={(event) => setNote(event.target.value)} /></label>
                      <div className="button-row">
                        <button type="submit" className="secondary" disabled={mark.isPending}>{t.save}</button>
                        <button type="button" className="text-button" onClick={() => { setEditing(null); setNote(""); }}>{t.cancel}</button>
                      </div>
                    </form>
                  ) : (
                    <button type="button" className="text-button" onClick={() => { setEditing(key); setNote(""); }}>{t.disagree}</button>
                  )}
                </div>
              );
            })}
          </li>
        ))}
      </ol>
      <ErrorBox error={mark.error} />
      <p className="tiny muted">{t.footer}</p>
      {q.data && <p className="tiny muted">{t.versions(q.data)}</p>}
    </section>
  );
}
