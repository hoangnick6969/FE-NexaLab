import { useRef, useState } from "react";
import { idempotencyKey } from "../../lib/api";
import { Badge, ErrorBox, Modal } from "../../components/ui";
import { dateTime } from "../../lib/test-status";
import { assessmentLabel, formatClock, score10Text, type AssessmentType } from "../assignments/assessment-timer";
import { Confirm, useMutate } from "./class-ui";

/** TAI-07 (TAI7-T1): assessment block returned on every teacher assignment view. */
export type TeacherAssessment = { type: AssessmentType; graded: boolean; coefficient: number | null; durationMinutes: number | null; scoresPublishedAt: string | null };
export type StudentAttempts = {
  used: number;
  allowed: number;
  retakePending: boolean;
  sessions: Array<{ id: string; attemptNo: number; status: string; startedAt: string; expiresAt: string; submissionId: string | null; autoSubmitted: boolean; durationUsedSeconds: number | null }>;
} | null;

/** Card badge: "Kiểm tra thường xuyên 15′ · Hệ số 1". Nothing for practice work. */
export function AssessmentBadge({ assessment }: { assessment?: TeacherAssessment | null }) {
  if (!assessment?.graded) return null;
  return (
    <Badge tone={assessment.scoresPublishedAt ? "passed" : "gold"}>
      {assessmentLabel[assessment.type]} {assessment.durationMinutes}′ · Hệ số {assessment.coefficient}
      {assessment.scoresPublishedAt ? " · đã công bố điểm" : ""}
    </Badge>
  );
}

/** Header of the tracking modal for graded work: rules and the "Công bố điểm" action (append-once). */
export function AssessmentBanner({ classId, assignmentId, assessment }: { classId: string; assignmentId: string; assessment?: TeacherAssessment | null }) {
  const act = useMutate<{ scoresPublishedAt: string }>();
  const key = useRef(idempotencyKey());
  const [confirming, setConfirming] = useState(false);
  if (!assessment?.graded) return null;
  return (
    <div className="notice" role="status">
      <p>
        <b>{assessmentLabel[assessment.type]}</b> · {assessment.durationMinutes} phút · hệ số {assessment.coefficient} · mỗi học sinh làm 1 lần, tự nộp khi hết giờ.
        {" "}
        {assessment.scoresPublishedAt
          ? `Điểm đã công bố lúc ${dateTime(assessment.scoresPublishedAt)}.`
          : "Học sinh và phụ huynh chưa thấy điểm cho đến khi thầy/cô công bố."}
      </p>
      {!assessment.scoresPublishedAt && (
        <button type="button" className="primary button-compact" onClick={() => setConfirming(true)} disabled={act.isPending}>
          {act.isPending ? "Đang công bố…" : "Công bố điểm"}
        </button>
      )}
      <ErrorBox error={act.error} />
      {confirming && (
        <Confirm
          action="công bố điểm của"
          item="bài kiểm tra này"
          detail="Học sinh và phụ huynh sẽ thấy điểm và kết quả chi tiết. Không thể thu hồi việc công bố."
          pending={act.isPending}
          error={act.error}
          onClose={() => setConfirming(false)}
          onConfirm={() => act.mutate({ path: `/classes/${classId}/assignments/${assignmentId}/publish-scores`, key: key.current, body: {} }, { onSuccess: () => setConfirming(false) })}
        />
      )}
    </div>
  );
}

/** Per-student attempt facts and the "Cho phép làm lại" action. */
export function AttemptCell({ classId, assignmentId, student, attempts }: { classId: string; assignmentId: string; student: { id: string; fullName: string }; attempts: StudentAttempts }) {
  const [granting, setGranting] = useState(false);
  if (!attempts) return null;
  const last = attempts.sessions.at(-1);
  return (
    <div>
      <small>
        Lượt {attempts.used}/{attempts.allowed}
        {last?.durationUsedSeconds != null ? ` · làm ${formatClock(last.durationUsedSeconds * 1000)}` : last?.status === "OPEN" ? " · đang làm" : ""}
        {last?.autoSubmitted ? " · tự nộp khi hết giờ" : ""}
        {attempts.retakePending ? " · đã cho làm lại" : ""}
      </small>
      {!attempts.retakePending && attempts.used >= attempts.allowed && (
        <button type="button" className="text-button" onClick={() => setGranting(true)}>Cho phép làm lại</button>
      )}
      {granting && <RetakeModal classId={classId} assignmentId={assignmentId} student={student} onClose={() => setGranting(false)} />}
    </div>
  );
}

export function RetakeModal({ classId, assignmentId, student, onClose }: { classId: string; assignmentId: string; student: { id: string; fullName: string }; onClose: () => void }) {
  const act = useMutate();
  const key = useRef(idempotencyKey());
  const [reason, setReason] = useState("");
  return (
    <Modal title={`Cho ${student.fullName} làm lại`} onClose={onClose}>
      <p className="tiny muted">Học sinh được thêm đúng 1 lượt làm bài có tính giờ. Lần làm cũ vẫn được lưu.</p>
      <label className="field">
        <span>Lý do (bắt buộc)</span>
        <textarea maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ví dụ: mất kết nối mạng khi đang làm bài" />
      </label>
      <ErrorBox error={act.error} />
      <div className="button-row">
        <button type="button" className="secondary" onClick={onClose}>Hủy</button>
        <button
          type="button"
          className="primary"
          disabled={act.isPending || !reason.trim()}
          onClick={() => act.mutate({ path: `/classes/${classId}/assignments/${assignmentId}/retake-grants`, key: key.current, body: { studentId: student.id, reason: reason.trim() } }, { onSuccess: onClose })}
        >
          {act.isPending ? "Đang lưu…" : "Cho phép làm lại"}
        </button>
      </div>
    </Modal>
  );
}

/** "8,8/10" when the server sent a 10-point score, otherwise the legacy 0–100 points text. */
export const scoreCell = (current: { score10?: number | null; score?: number | null } | null | undefined, legacy: (n: number) => string) =>
  current?.score10 != null ? `${score10Text(current.score10)}/10` : current?.score != null ? legacy(current.score) : "—";
