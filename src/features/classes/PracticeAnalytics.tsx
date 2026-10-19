import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Empty, verdictLabel } from "../../components/ui";
import { type TeacherAssignment } from "./class-types";
import { LoadError } from "./class-ui";

export function PracticeAnalytics({ classId }: { classId: string }) {
  const assignments = useQuery<TeacherAssignment[]>({ queryKey: ["class-assignments", classId], queryFn: () => api(`/classes/${classId}/assignments`) });
  const [assignmentId, setAssignmentId] = useState("");
  const selectedId = assignmentId || assignments.data?.find((item) => item.status === "ACTIVE")?.id || "";
  const board = useQuery<any[]>({
    queryKey: ["assignment-progress", classId, selectedId],
    queryFn: () => api(`/classes/${classId}/assignments/${selectedId}/progress`),
    enabled: Boolean(selectedId),
  });
  const support = useQuery<any[]>({
    queryKey: ["assignment-support", classId, selectedId],
    queryFn: () => api(`/classes/${classId}/assignments/${selectedId}/support`),
    enabled: Boolean(selectedId),
  });
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const evidence = useQuery<any>({
    queryKey: ["student-evidence", classId, selectedId, openStudent],
    queryFn: () => api(`/classes/${classId}/students/${openStudent}/evidence?assignmentId=${encodeURIComponent(selectedId)}`),
    enabled: Boolean(selectedId && openStudent),
  });
  const flags = new Map((support.data ?? []).map((row: any) => [row.student.id, row.flags]));
  return (
    <section className="panel">
      <div className="section-heading"><div><p className="eyebrow">BẰNG CHỨNG THEO BÀI GIAO</p><h2>Theo dõi và hỗ trợ học sinh</h2></div></div>
      <label className="field"><span>Bài đã giao</span><select value={selectedId} onChange={(event) => { setAssignmentId(event.target.value); setOpenStudent(null); }}>
        <option value="">Chọn bài</option>
        {assignments.data?.map((item) => <option key={item.id} value={item.id}>{item.title}{item.status === "ARCHIVED" ? " (đã lưu trữ)" : ""}</option>)}
      </select></label>
      <LoadError query={assignments} what="danh sách bài giao" />
      <LoadError query={board} what="bảng tiến độ" />
      {selectedId && board.data?.length === 0 && <Empty>Chưa có học sinh trong phạm vi bài giao.</Empty>}
      {board.data?.map((row: any) => (
        <div className="analytics-student" key={row.student.id}>
          <div className="section-heading"><div><h3>{row.student.fullName}</h3><p>{typeof row.percent === "number" ? `${row.completedRequired}/${row.totalRequired} bước · ${row.percent}%` : `${row.attempts} lượt thực hành · ${row.passed ? "Đã đạt" : verdictLabel(row.latestVerdict)}`}</p></div>
          <button className="secondary" onClick={() => setOpenStudent(openStudent === row.student.id ? null : row.student.id)}>Xem bằng chứng</button></div>
          {(flags.get(row.student.id) as any[] | undefined)?.map((flag: any) => <div className="notice" key={flag.code}><b>Cần hỗ trợ:</b> {flag.message}<small>{flag.evidenceIds?.length ? ` · ${flag.evidenceIds.length} bằng chứng` : ""}</small></div>)}
          {openStudent === row.student.id && <div className="attempt-evidence"><LoadError query={evidence} what="bằng chứng học tập" />{evidence.data && <>
            <p>{evidence.data.stepProgress.length} tiến trình bước · {evidence.data.quizAttempts.length} lần kiểm tra · {evidence.data.practicalAttempts.length} lần thực hành</p>
            {evidence.data.quizAttempts.map((item: any) => <p key={item.id}>Kiểm tra {item.score}% · {item.passed ? "Đạt" : "Chưa đạt"} · {new Date(item.createdAt).toLocaleString("vi-VN")}</p>)}
            {evidence.data.practicalAttempts.map((item: any) => <p key={item.id}>Thực hành · {verdictLabel(item.verdict)} · {new Date(item.createdAt).toLocaleString("vi-VN")}</p>)}
          </>}</div>}
        </div>
      ))}
    </section>
  );
}
