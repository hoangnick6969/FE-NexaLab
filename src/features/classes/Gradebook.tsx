import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { api, downloadFile, idempotencyKey, isApiError } from "../../lib/api";
import { Badge, ErrorBox, Modal } from "../../components/ui";
import { dateTime } from "../../lib/test-status";
import { assessmentLabel, type AssessmentType } from "../assignments/assessment-timer";
import { RetakeModal } from "./AssessmentControls";
import type { ClassSummary, TeacherAssignment } from "./class-types";
import { Confirm, LoadError, useMutate } from "./class-ui";
import { durationText, score10Text, STATUS_LABEL, STATUS_TONE, visibleRows, type GradebookData, type GradebookRow, type SortKey, type StatusFilter } from "./gradebook-view";
import { WrittenGradeSheet } from "./WrittenGrading";
import { WrittenSimilarity } from "./WrittenSimilarity";
import "./gradebook.css";

const AI_LABEL: Record<string, string> = { VALID: "Gợi ý hợp lệ", PARTIAL: "Gợi ý một phần", SUPPRESSED: "Không dùng được" };
const SKIP_LABEL: Record<string, string> = {
  ALREADY_GRADED: "đã có điểm",
  NO_SUGGESTION: "chưa có gợi ý",
  SUGGESTION_NOT_VALID: "gợi ý chưa hợp lệ",
  NOT_CURRENT_SUBMISSION: "không phải bài nộp hiện tại",
  SUBMISSION_NOT_GRADEABLE: "bài chưa chấm được",
  GRADE_POINTS_INVALID: "điểm gợi ý không khớp biểu điểm",
  SUGGESTION_MISMATCH: "gợi ý không khớp bài nộp",
};

/**
 * TAI-07 (TAI7-T3): "Bảng điểm lớp" of one test or written assignment. Summary chips, filters and sort for a class of
 * 30–45, per-row grading sheet / AI quick-approve / retake, similarity flags, "Chốt sổ điểm" and the Excel-ready CSV.
 * AI never grades: quick-approve records the teacher's ACCEPTED_AI decision through the server's grade checks.
 */
export function Gradebook({ classroom, assignment, onClose }: { classroom: ClassSummary; assignment: TeacherAssignment; onClose: () => void }) {
  const qc = useQueryClient();
  const key = ["gradebook", classroom.id, assignment.id];
  const book = useQuery<GradebookData>({ queryKey: key, refetchOnMount: "always", queryFn: () => api(`/classes/${classroom.id}/assignments/${assignment.id}/gradebook`) });
  const refresh = () => void qc.invalidateQueries({ queryKey: key });
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<SortKey>("CLASS");
  const [search, setSearch] = useState("");
  const [sheet, setSheet] = useState<string | null>(null);
  const [similarityOpen, setSimilarityOpen] = useState(false);
  const [retake, setRetake] = useState<GradebookRow["student"] | null>(null);
  const [confirm, setConfirm] = useState<null | "approveAll" | "lock">(null);
  const [unlocking, setUnlocking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [format, setFormat] = useState<"vn" | "standard">("vn");
  const [downloadError, setDownloadError] = useState<unknown>(null);
  const act = useMutate<any>();
  const approveKey = useRef(idempotencyKey());
  const lockKey = useRef(idempotencyKey());
  const data = book.data;
  const rows = useMemo(() => (data ? visibleRows(data.rows, filter, sort, search) : []), [data, filter, sort, search]);
  const names = useMemo(() => new Map((data?.rows ?? []).map((r) => [r.student.id, r.student.fullName])), [data]);
  const locked = !!data?.assignment.gradebook.lockedAt;
  const isExam = data?.assignment.contentType === "exam";
  const isWritten = data?.assignment.contentType === "written" || (isExam && data?.assignment.hasWritten);
  const base = `/classes/${classroom.id}/assignments/${assignment.id}/gradebook`;

  const quickApprove = (submissionIds?: string[]) =>
    act.mutate(
      { path: `${base}/quick-approve`, key: submissionIds ? idempotencyKey() : approveKey.current, body: submissionIds ? { submissionIds } : {} },
      {
        onSuccess: (r: any) => {
          approveKey.current = idempotencyKey();
          const skipped = (r.skipped ?? []).map((s: any) => `${SKIP_LABEL[s.reason] ?? s.reason}`);
          setMessage(`Đã duyệt ${r.approved.length} bài theo gợi ý AI.${skipped.length ? ` Bỏ qua ${skipped.length}: ${[...new Set(skipped)].join(", ")}.` : ""}`);
          setConfirm(null);
          refresh();
        },
        onError: () => setConfirm(null),
      },
    );

  const download = async () => {
    setDownloadError(null);
    try {
      await downloadFile(`${base}/export.csv?format=${format}`, `So-diem-${assignment.id}.csv`);
    } catch (error) {
      setDownloadError(error);
    }
  };

  const title = `Bảng điểm · ${assignment.title}`;
  if (sheet)
    return (
      <Modal title={title} onClose={onClose}>
        <button type="button" className="text-button" onClick={() => { setSheet(null); refresh(); }}>← Quay lại bảng điểm</button>
        <WrittenGradeSheet classId={classroom.id} assignmentId={assignment.id} submissionId={sheet} onSaved={() => { setSheet(null); refresh(); }} />
      </Modal>
    );
  if (similarityOpen)
    return (
      <Modal title={title} onClose={onClose}>
        <WrittenSimilarity classId={classroom.id} assignmentId={assignment.id} onBack={() => { setSimilarityOpen(false); refresh(); }} />
      </Modal>
    );

  const notReady = isApiError(act.error, "GRADEBOOK_NOT_READY") ? ((act.error as any).details as Array<{ fullName: string; status: keyof typeof STATUS_LABEL }>) : null;
  return (
    <Modal title={title} onClose={onClose}>
      <div className="gradebook">
        <LoadError query={book} what="bảng điểm" />
        {book.isLoading && <p className="tiny muted">Đang tải bảng điểm…</p>}
        {data && (
          <>
            <div className="gradebook-head">
              <Badge tone={data.assignment.assessment.graded ? "gold" : "outline"}>
                {assessmentLabel[data.assignment.assessment.type as AssessmentType] ?? data.assignment.assessment.type}
                {data.assignment.assessment.coefficient ? ` · hệ số ${data.assignment.assessment.coefficient}` : ""}
              </Badge>
              {data.assignment.dueAt && <span className="tiny muted">Hạn {dateTime(data.assignment.dueAt)}</span>}
              {locked
                ? <Badge tone="passed">Đã chốt sổ (lần {data.assignment.gradebook.lockVersion}) · {dateTime(data.assignment.gradebook.lockedAt!)}</Badge>
                : <Badge tone="outline">Chưa chốt sổ</Badge>}
            </div>

            <dl className="gradebook-stats" aria-label="Thống kê nhanh">
              <div><dt>Đã nộp</dt><dd>{data.summary.submitted}/{data.summary.students}</dd></div>
              <div><dt>Vắng</dt><dd>{data.summary.absent}</dd></div>
              <div><dt>Đang làm / chưa làm</dt><dd>{data.summary.inProgress} / {data.summary.notStarted}</dd></div>
              <div><dt>Điểm TB lớp</dt><dd>{score10Text(data.summary.average10)}<small>/10</small></dd></div>
              <div><dt>Chờ chấm</dt><dd>{data.summary.awaitingGrade}</dd></div>
              {isWritten && data.aiAssist && <div><dt>Gợi ý AI sẵn sàng</dt><dd>{data.summary.aiReady}</dd></div>}
              {isWritten && <div className={data.summary.similarityUnreviewed ? "is-alert" : ""}><dt>Cờ trùng lặp</dt><dd>{data.summary.similarityFlags}{data.summary.similarityUnreviewed ? <small> ({data.summary.similarityUnreviewed} chưa xem)</small> : null}</dd></div>}
            </dl>

            <div className="gradebook-toolbar">
              <label className="field compact">
                <span>Lọc</span>
                <select value={filter} onChange={(e) => setFilter(e.target.value as StatusFilter)}>
                  <option value="ALL">Tất cả ({data.rows.length})</option>
                  <option value="TO_GRADE">Chờ chấm / chờ duyệt</option>
                  {isWritten && data.aiAssist && <option value="AI_READY">Có gợi ý AI hợp lệ</option>}
                  {isWritten && <option value="FLAGGED">Có cờ trùng lặp</option>}
                  <option value="GRADED">Đã chấm</option>
                  <option value="ABSENT">Vắng</option>
                  <option value="IN_PROGRESS">Đang làm</option>
                  <option value="NOT_STARTED">Chưa làm</option>
                </select>
              </label>
              <label className="field compact">
                <span>Sắp xếp</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  <option value="CLASS">Theo danh sách lớp</option>
                  <option value="SCORE_DESC">Điểm cao → thấp</option>
                  <option value="SCORE_ASC">Điểm thấp → cao</option>
                  <option value="STATUS">Theo trạng thái</option>
                </select>
              </label>
              <label className="field compact grow">
                <span>Tìm học sinh</span>
                <input type="search" value={search} placeholder="Tên hoặc tên đăng nhập" onChange={(e) => setSearch(e.target.value)} />
              </label>
            </div>

            <div className="button-row gradebook-actions">
              {isWritten && data.aiAssist && !locked && (
                <button type="button" className="secondary" disabled={!data.summary.aiReady || act.isPending} onClick={() => setConfirm("approveAll")}>
                  Duyệt nhanh gợi ý AI ({data.summary.aiReady})
                </button>
              )}
              {isWritten && data.summary.similarityFlags > 0 && (
                <button type="button" className="secondary" onClick={() => setSimilarityOpen(true)}>Xem cặp bài trùng lặp</button>
              )}
              {!locked && <button type="button" className="primary" disabled={act.isPending} onClick={() => { act.reset(); setConfirm("lock"); }}>Chốt sổ điểm</button>}
              {locked && <button type="button" className="secondary" onClick={() => setUnlocking(true)}>Mở khóa sổ</button>}
              {locked && (
                <span className="gradebook-export">
                  <select aria-label="Định dạng CSV" value={format} onChange={(e) => setFormat(e.target.value as "vn" | "standard")}>
                    <option value="vn">Excel tiếng Việt (dấu ; · thập phân ,)</option>
                    <option value="standard">CSV chuẩn (dấu , · thập phân .)</option>
                  </select>
                  <button type="button" className="primary" onClick={download}>Xuất bảng điểm CSV</button>
                </span>
              )}
            </div>
            {message && <p className="notice" role="status">{message}</p>}
            <ErrorBox error={notReady ? null : act.error} />
            <ErrorBox error={downloadError} />
            {notReady && (
              <div className="error" role="alert">
                <p>Chưa chốt được sổ: còn {notReady.length} học sinh đang làm, chưa đến hạn hoặc chưa chấm.</p>
                <ul className="tiny">{notReady.slice(0, 10).map((b) => <li key={b.fullName}>{b.fullName}: {STATUS_LABEL[b.status]}</li>)}</ul>
              </div>
            )}

            <div className="table-wrap gradebook-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Học sinh</th>
                    <th>Trạng thái</th>
                    <th>Thời gian làm</th>
                    {(!isWritten || isExam) && <th>Trắc nghiệm</th>}
                    {isExam && <th>Lab</th>}
                    {isWritten && <th>Tự luận</th>}
                    {isWritten && <th>Gợi ý AI</th>}
                    {isWritten && <th>Trùng lặp</th>}
                    <th>Tổng (thang 10)</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.student.id} className={r.status === "ABSENT" ? "is-absent" : undefined}>
                      <td>{r.index}</td>
                      <td>{r.student.fullName}<br /><small className="muted">{r.student.username}</small></td>
                      <td>
                        <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                        {r.autoSubmitted && <small className="muted"> · tự nộp</small>}
                        {r.attempts && r.attempts.used > 1 && <small className="muted"> · lần {r.attempts.used}</small>}
                      </td>
                      <td>{durationText(r.timeUsedSeconds)}</td>
                      {(!isWritten || isExam) && <td>{score10Text(r.mcq10)}</td>}
                      {isExam && <td>{score10Text(r.lab10 ?? null)}</td>}
                      {isWritten && <td>{score10Text(r.written10)}</td>}
                      {isWritten && (
                        <td>
                          {r.ai ? <>{AI_LABEL[r.ai.status]}{r.ai.suggested10 !== null && <small> · {score10Text(r.ai.suggested10)}</small>}</> : <span className="muted">—</span>}
                          {r.grade && r.grade.kind !== "MANUAL" && <small className="muted"> · GV đã {r.grade.kind === "ACCEPTED_AI" ? "duyệt" : r.grade.kind === "EDITED_AI" ? "sửa" : "từ chối"}</small>}
                        </td>
                      )}
                      {isWritten && (
                        <td>
                          {r.similarity
                            ? <Badge tone={r.similarity.level === "HIGH" ? "not_passed" : "partial"}>{r.similarity.level === "HIGH" ? "Trùng cao" : "Trùng đáng chú ý"} · {names.get(r.similarity.otherStudentId) ?? "?"}{r.similarity.reviewed ? " · đã xem" : ""}</Badge>
                            : <span className="muted">—</span>}
                        </td>
                      )}
                      <td className="gradebook-total">{r.status === "ABSENT" ? "Vắng" : score10Text(r.total10)}</td>
                      <td>
                        <div className="gradebook-row-actions">
                          {isWritten && r.submissionId && (r.status === "AWAITING_GRADE" || r.status === "GRADED") && !locked && (
                            <button type="button" className="text-button" onClick={() => setSheet(r.submissionId)}>{r.grade ? "Sửa điểm" : "Chấm"}</button>
                          )}
                          {r.ai?.canQuickApprove && !locked && (
                            <button type="button" className="text-button" disabled={act.isPending} onClick={() => quickApprove([r.submissionId!])}>Duyệt AI</button>
                          )}
                          {data.assignment.assessment.graded && !locked && (r.status === "ABSENT" || r.status === "GRADED" || r.status === "ZERO_REJECTED") && (
                            <button type="button" className="text-button" onClick={() => setRetake(r.student)}>Cho làm lại</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!rows.length && <tr><td colSpan={(isWritten ? 9 : 7) + (isExam ? (isWritten ? 2 : 1) : 0)} className="muted">Không có học sinh khớp bộ lọc.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="tiny muted">
              Điểm quy về thang 10 từ điểm thô, làm tròn 1 chữ số thập phân. Học sinh quá hạn chưa nộp ghi "Vắng", không tự động 0 điểm.
              Gợi ý AI chỉ là đề xuất: điểm chỉ được ghi khi thầy/cô duyệt.
            </p>
          </>
        )}
      </div>
      {confirm === "approveAll" && data && (
        <Confirm
          action={`ghi điểm theo gợi ý AI cho ${data.summary.aiReady} bài`}
          item="có gợi ý hợp lệ"
          detail="Mỗi bài được kiểm tra lại với biểu điểm và gợi ý đã lưu; bài không khớp sẽ bị bỏ qua. Thầy/cô vẫn có thể sửa điểm sau đó."
          pending={act.isPending}
          error={act.error}
          onClose={() => setConfirm(null)}
          onConfirm={() => quickApprove()}
        />
      )}
      {confirm === "lock" && (
        <Confirm
          action="chốt sổ điểm của"
          item={assignment.title}
          detail="Điểm được lưu cố định để xuất sổ; sau khi chốt không sửa điểm, không duyệt AI và không cho làm lại cho đến khi mở khóa."
          pending={act.isPending}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            act.mutate(
              { path: `${base}/lock`, key: lockKey.current, body: {} },
              { onSuccess: () => { lockKey.current = idempotencyKey(); setConfirm(null); setMessage("Đã chốt sổ điểm."); refresh(); }, onError: () => setConfirm(null) },
            )
          }
        />
      )}
      {unlocking && <UnlockModal path={`${base}/unlock`} onClose={() => setUnlocking(false)} onDone={() => { setUnlocking(false); setMessage("Đã mở khóa sổ điểm."); refresh(); }} />}
      {retake && <RetakeModal classId={classroom.id} assignmentId={assignment.id} student={retake} onClose={() => { setRetake(null); refresh(); }} />}
    </Modal>
  );
}

function UnlockModal({ path, onClose, onDone }: { path: string; onClose: () => void; onDone: () => void }) {
  const act = useMutate();
  const key = useRef(idempotencyKey());
  const [reason, setReason] = useState("");
  return (
    <Modal title="Mở khóa sổ điểm" onClose={onClose}>
      <p className="tiny muted">Bản chốt trước vẫn được lưu làm lịch sử; lần chốt sau sẽ là một phiên bản mới.</p>
      <label className="field">
        <span>Lý do (bắt buộc)</span>
        <textarea maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: phúc khảo bài của học sinh" />
      </label>
      <ErrorBox error={act.error} />
      <div className="button-row">
        <button type="button" className="secondary" onClick={onClose}>Hủy</button>
        <button type="button" className="primary" disabled={!reason.trim() || act.isPending} onClick={() => act.mutate({ path, key: key.current, body: { reason: reason.trim() } }, { onSuccess: onDone })}>
          {act.isPending ? "Đang lưu…" : "Mở khóa"}
        </button>
      </div>
    </Modal>
  );
}
