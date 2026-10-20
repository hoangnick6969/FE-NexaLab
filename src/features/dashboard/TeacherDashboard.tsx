import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Empty, ErrorBox, PageLoader } from "../../components/ui";
import { PageHeading } from "../../components/PageHeading";
import { type ClassSummary, type TeacherAssignment } from "../classes/class-types";

export function TeacherDashboard() {
  const classes = useQuery<ClassSummary[]>({ queryKey: ["classes", "ACTIVE"], queryFn: () => api("/classes?status=ACTIVE") });
  const summaries = useQueries({ queries: (classes.data ?? []).map((classroom) => ({
    queryKey: ["teacher-dashboard", classroom.id],
    queryFn: async () => {
      const [assignments, late] = await Promise.all([
        api<TeacherAssignment[]>(`/classes/${classroom.id}/assignments`),
        api<unknown[]>(`/classes/${classroom.id}/late-queue`),
      ]);
      const now = Date.now();
      const active = assignments.filter((assignment) => assignment.status === "ACTIVE");
      return { late: late.length, overdue: active.filter((a) => a.dueDate && Date.parse(a.dueDate) < now).length,
        soon: active.filter((a) => a.dueDate && Date.parse(a.dueDate) >= now && Date.parse(a.dueDate) <= now + 7 * 86400000).length };
    },
  })) });
  return <>
    <PageHeading eyebrow="KHÔNG GIAN GIÁO VIÊN" title="Công việc của lớp" description="Xem yêu cầu tham gia, bài nộp trễ và hạn nộp để hỗ trợ học sinh." action={<Link className="primary" to="/classes">Quản lý lớp</Link>} />
    {classes.isLoading && <PageLoader message="Đang tải các lớp…" />}
    <ErrorBox error={classes.error} />
    {classes.isError && <button className="secondary" onClick={() => classes.refetch()}>Thử lại</button>}
    {classes.data?.length === 0 && <Empty>Chưa có lớp đang hoạt động. Mở quản lý lớp để tạo lớp đầu tiên.</Empty>}
    <div className="class-grid">{classes.data?.map((classroom, index) => {
      const summary = summaries[index];
      return <section className="panel" key={classroom.id}>
        <h2><Link to={`/classes/${encodeURIComponent(classroom.id)}`}>{classroom.name}</Link></h2>
        <p>Khối {classroom.grade} · {classroom.members.approved} học sinh</p>
        <p>{classroom.members.pending} yêu cầu tham gia chờ duyệt</p>
        {summary.isPending ? <p role="status">Đang tải công việc…</p> : summary.isError ? <><ErrorBox error={summary.error} /><button className="secondary" onClick={() => summary.refetch()}>Thử lại</button></> : <>
          <p>{summary.data?.late} bài nộp trễ chờ duyệt</p>
          <p>{summary.data?.soon} bài đến hạn trong 7 ngày · {summary.data?.overdue} bài đã quá hạn</p>
        </>}
        <Link className="secondary" to={`/classes/${encodeURIComponent(classroom.id)}`}>Mở lớp và xử lý</Link>
      </section>;
    })}</div>
  </>;
}
