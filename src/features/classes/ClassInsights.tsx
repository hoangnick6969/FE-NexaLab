import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, idempotencyKey, mutate } from "../../lib/api";
import { Badge, Empty, ErrorBox, verdictLabel } from "../../components/ui";
import { formatDateTime } from "../../i18n";
import { LoadError } from "./class-ui";
import { insightText } from "./insights-copy";
import {
  ackBody, ackErrorKind, ackLabel, evidencePath, insightCopy, isHandled, noteLength, noteTooLong, NOTE_MAX, partitionStudents, similarityAssignmentId, statusTone, withSimilarityTarget,
  type ClassInsightsResponse, type InsightAckAction, type InsightEvidenceRef, type InsightItem, type StudentInsightsResponse,
} from "./insights-view";

type Status = "open" | "all";

function Notice({ message }: { message: string }) {
  return message ? <p className="notice" role="status">{message}</p> : null;
}

function StatusFilter({ status, onChange }: { status: Status; onChange: (next: Status) => void }) {
  const t = insightText();
  const name = useId();
  return (
    <fieldset className="segmented insights-filter">
      <legend className="tiny muted">{t.filterLabel}</legend>
      {([["open", t.filterOpen], ["all", t.filterAll]] as const).map(([value, label]) => (
        <label key={value} className="check">
          <input type="radio" name={name} checked={status === value} onChange={() => onChange(value)} /> {label}
        </label>
      ))}
    </fieldset>
  );
}

/** One evidence item. Quiz and practical open the existing B2 detail routes; a test has no detail route yet. */
function EvidenceRow({ classId, studentId, item }: { classId: string; studentId: string; item: InsightEvidenceRef }) {
  const t = insightText();
  const [open, setOpen] = useState(false);
  const path = evidencePath(classId, studentId, item);
  const detail = useQuery<any>({ queryKey: ["insight-evidence", item.kind, item.id], queryFn: () => api(path!), enabled: open && path !== null });
  return (
    <li>
      {t.evidenceKind[item.kind] ?? item.kind} · {formatDateTime(item.at)}
      {path ? (
        <button type="button" className="text-button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? t.evidenceClose : t.evidenceOpen}</button>
      ) : (
        <small className="muted"> · {t.testNoDetail}</small>
      )}
      {open && path && (
        <div className="insight-evidence-detail">
          {detail.isLoading && <small>{t.evidenceLoading}</small>}
          <LoadError query={detail} what={t.evidenceFailed} />
          {detail.data && (
            <small>{item.kind === "QUIZ" ? t.quizLine(Math.round(Number(detail.data.score)), Boolean(detail.data.passed)) : verdictLabel(String(detail.data.verdict))} · {formatDateTime(detail.data.createdAt)}</small>
          )}
        </div>
      )}
    </li>
  );
}

/** The insight as it stood when it was first acknowledged (replay route). */
function InsightReplay({ classId, studentId, fingerprint }: { classId: string; studentId: string; fingerprint: string }) {
  const t = insightText();
  const replay = useQuery<InsightItem>({
    queryKey: ["insight-replay", classId, studentId, fingerprint],
    queryFn: () => api(`/classes/${classId}/students/${studentId}/insights/${fingerprint}/replay`),
  });
  if (replay.isLoading) return <p className="tiny muted">{t.replayLoading}</p>;
  if (!replay.data) return <LoadError query={replay} what={t.replayFailed} />;
  const copy = insightCopy(replay.data);
  return (
    <section className="insight-replay" aria-label={t.replayTitle}>
      <p className="tiny"><b>{t.replayTitle}</b> · {formatDateTime(replay.data.computedAt)}</p>
      <p>{copy.summary}</p>
      <p className="tiny muted"><b>{t.thresholdsLabel}:</b> {copy.threshold}</p>
      <ul className="tiny">
        {replay.data.evidence.map((item) => <li key={item.id}>{t.evidenceKind[item.kind] ?? item.kind} · {formatDateTime(item.at)}</li>)}
      </ul>
    </section>
  );
}

function InsightCard({ classId, studentId, insight, onNotice }: { classId: string; studentId: string; insight: InsightItem; onNotice: (message: string) => void }) {
  const t = insightText();
  const queryClient = useQueryClient();
  const copy = insightCopy(insight);
  const similarityId = similarityAssignmentId(insight);
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState<InsightAckAction | null>(null);
  const [note, setNote] = useState("");
  const [replayOpen, setReplayOpen] = useState(false);
  // One Idempotency-Key per opened note form, reused by retries of the same attempt.
  const key = useRef<string | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["class-insights", classId] });
    void queryClient.invalidateQueries({ queryKey: ["student-insights", classId, studentId] });
  };
  const save = useMutation({
    mutationFn: () => {
      key.current ??= idempotencyKey();
      return mutate(`/classes/${classId}/students/${studentId}/insights/${insight.fingerprint}/acknowledgements`, "POST", ackBody(form!, note), key.current);
    },
    onSuccess: () => {
      key.current = null;
      setForm(null);
      setNote("");
      onNotice("");
      refresh();
    },
    onError: (error) => {
      const kind = ackErrorKind(error);
      if (kind === "stale") { onNotice(t.stale); refresh(); }
      else if (kind === "archived") { onNotice(t.archived); refresh(); }
    },
  });
  const open = (action: InsightAckAction) => {
    key.current = null;
    save.reset();
    setNote("");
    setForm(action);
  };
  const canAct = insight.status !== "NEEDS_MORE_EVIDENCE" && !isHandled(insight);
  const tooLong = noteTooLong(note);
  return (
    <article className="insight-card" aria-label={copy.title}>
      <div className="section-heading">
        <div><h4>{copy.title}</h4><p>{copy.summary}</p></div>
        <Badge tone={statusTone(insight.status)}>{t.status[insight.status] ?? insight.status}</Badge>
      </div>
      {insight.pattern && <p className="tiny muted">{t.patternNote(insight.message)}</p>}
      <p className="tiny muted"><b>{t.thresholdsLabel}:</b> {copy.threshold}</p>
      {insight.evidence.length > 0 && (
        <div className="insight-evidence">
          <b className="tiny">{t.evidenceLabel}</b>
          <ul className="tiny">{insight.evidence.map((item) => <EvidenceRow key={item.id} classId={classId} studentId={studentId} item={item} />)}</ul>
        </div>
      )}
      {insight.latestAcknowledgement && (
        <div className="insight-handled">
          <p className="tiny muted">{t.acknowledgedAt(ackLabel(insight.latestAcknowledgement.action), formatDateTime(insight.latestAcknowledgement.createdAt))}</p>
          <button type="button" className="text-button" aria-expanded={replayOpen} onClick={() => setReplayOpen(!replayOpen)}>{replayOpen ? t.replayHide : t.replay}</button>
          {replayOpen && <InsightReplay classId={classId} studentId={studentId} fingerprint={insight.fingerprint} />}
        </div>
      )}
      {similarityId && (
        <div className="button-row">
          <button type="button" className="secondary" onClick={() => setSearchParams(withSimilarityTarget(searchParams, similarityId))}>{t.openSimilarity}</button>
        </div>
      )}
      {canAct && !form && (
        <div className="button-row">
          <button type="button" className="secondary" onClick={() => open("ACKNOWLEDGED")}>{t.acknowledge}</button>
          <button type="button" className="secondary" onClick={() => open("DISMISSED")}>{t.dismiss}</button>
        </div>
      )}
      {canAct && form && (
        <form className="insight-note" onSubmit={(event) => { event.preventDefault(); if (!tooLong) save.mutate(); }}>
          <label className="field">
            <span>{t.noteLabel}</span>
            <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} aria-invalid={tooLong} />
          </label>
          <p className={"tiny " + (tooLong ? "error" : "muted")} aria-live="polite">{tooLong ? t.noteTooLong + " " : ""}{t.noteCounter(noteLength(note), NOTE_MAX)}</p>
          <ErrorBox error={ackErrorKind(save.error) === "other" ? save.error : null} />
          <div className="button-row">
            <button type="submit" className="primary" disabled={save.isPending || tooLong}>{save.isPending ? t.saving : form === "DISMISSED" ? t.confirmDismiss : t.confirmAcknowledge}</button>
            <button type="button" className="secondary" disabled={save.isPending} onClick={() => setForm(null)}>{t.cancel}</button>
          </div>
        </form>
      )}
    </article>
  );
}

/** Class-wide insights tab (TAI4-T4): the owning teacher only; the list keeps the order the API returns. */
export function ClassInsights({ classId }: { classId: string }) {
  const t = insightText();
  const [status, setStatus] = useState<Status>("open");
  const [notice, setNotice] = useState("");
  const query = useQuery<ClassInsightsResponse>({
    queryKey: ["class-insights", classId, status],
    queryFn: () => api(`/classes/${classId}/insights?status=${status}`),
  });
  const { main, insufficient } = partitionStudents(query.data?.students ?? []);
  return (
    <section className="panel insights-panel">
      <div className="section-heading"><div><p className="eyebrow">{t.eyebrow}</p><h2>{t.title}</h2></div></div>
      <p className="tiny muted">{t.notice}</p>
      <StatusFilter status={status} onChange={(next) => { setStatus(next); setNotice(""); }} />
      <Notice message={notice} />
      <LoadError query={query} what={t.loadFailed} />
      {query.isLoading && <p>{t.loading}</p>}
      {query.data && main.length === 0 && insufficient.length === 0 && <Empty>{status === "open" ? t.empty : t.emptyAll}</Empty>}
      {main.map((student) => (
        <section key={student.studentId} className="insight-student" aria-label={student.displayName}>
          <h3>{student.displayName}</h3>
          {student.insights.map((insight) => <InsightCard key={insight.fingerprint} classId={classId} studentId={student.studentId} insight={insight} onNotice={setNotice} />)}
        </section>
      ))}
      {insufficient.length > 0 && (
        <details className="insight-insufficient">
          <summary>{t.insufficientSummary(insufficient.length)}</summary>
          <p className="tiny muted">{t.insufficientHint}</p>
          <ul>{insufficient.map((student) => <li key={student.studentId}>{student.displayName}</li>)}</ul>
        </details>
      )}
    </section>
  );
}

/** The same insights for one student, loaded only when the evidence block of that student is open. */
export function StudentInsightsSection({ classId, studentId }: { classId: string; studentId: string }) {
  const t = insightText();
  const [status, setStatus] = useState<Status>("open");
  const [notice, setNotice] = useState("");
  const query = useQuery<StudentInsightsResponse>({
    queryKey: ["student-insights", classId, studentId, status],
    queryFn: () => api(`/classes/${classId}/students/${studentId}/insights?status=${status}`),
  });
  return (
    <section className="insight-student-section" aria-label={t.studentSection}>
      <h4>{t.studentSection}</h4>
      <StatusFilter status={status} onChange={(next) => { setStatus(next); setNotice(""); }} />
      <Notice message={notice} />
      <LoadError query={query} what={t.loadFailed} />
      {query.isLoading && <p className="tiny muted">{t.loading}</p>}
      {query.data && query.data.insights.length === 0 && <Empty>{t.studentEmpty}</Empty>}
      {query.data?.insights.map((insight) => <InsightCard key={insight.fingerprint} classId={classId} studentId={studentId} insight={insight} onNotice={setNotice} />)}
    </section>
  );
}
