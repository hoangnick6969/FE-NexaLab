import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Empty, PageLoader } from "../../components/ui";
import { PageHeading } from "../../components/PageHeading";
import { type ClassSummary, type TeacherAssignment } from "../classes/class-types";
import { LoadError } from "../classes/class-ui";
import "../classes/teacher-operations.css";

type ClassWorkSummary = { late: number; overdue: number; soon: number; labs: number };

export function TeacherDashboard() {
  const classes = useQuery<ClassSummary[]>({
    queryKey: ["classes", "ACTIVE"],
    queryFn: () => api("/classes?status=ACTIVE"),
  });
  const summaries = useQueries({
    queries: (classes.data ?? []).map((classroom) => ({
      queryKey: ["teacher-dashboard", classroom.id],
      queryFn: async (): Promise<ClassWorkSummary> => {
        const [assignments, late] = await Promise.all([
          api<TeacherAssignment[]>(`/classes/${encodeURIComponent(classroom.id)}/assignments`),
          api<unknown[]>(`/classes/${encodeURIComponent(classroom.id)}/late-queue`),
        ]);
        const now = Date.now();
        const week = now + 7 * 86400000;
        const active = assignments.filter((assignment) => assignment.status === "ACTIVE");
        return {
          late: late.length,
          overdue: active.filter((assignment) => assignment.overdue).length,
          labs: active.filter((assignment) => assignment.contentType === "lab").length,
          soon: active.filter((assignment) => {
            const due = assignment.dueDate ? Date.parse(assignment.dueDate) : Number.NaN;
            return Number.isFinite(due) && due >= now && due <= week;
          }).length,
        };
      },
    })),
  });

  const totalPending = (classes.data ?? []).reduce((count, classroom) => count + classroom.members.pending, 0);
  const totalLate = summaries.reduce((count, summary) => count + (summary.data?.late ?? 0), 0);
  const totalLabs = summaries.reduce((count, summary) => count + (summary.data?.labs ?? 0), 0);
  const summariesLoading = summaries.some((summary) => summary.isPending);
  const summariesError = summaries.some((summary) => summary.isError);
  const summaryValue = (value: number) => summariesLoading ? "…" : summariesError ? "—" : value;
  const pendingClass = classes.data?.find((classroom) => classroom.members.pending > 0);
  const lateClassIndex = summaries.findIndex((summary) => (summary.data?.late ?? 0) > 0);
  const classHref = (id?: string, tab = "students") => id
    ? `/classes/${encodeURIComponent(id)}?tab=${tab}`
    : "/classes";

  return (
    <div className="teacher-workspace teacher-dashboard">
      <PageHeading
        title="Tổng quan lớp học"
        description="Xử lý yêu cầu tham gia, xem bài cần duyệt và theo dõi hạn của từng lớp."
        action={<Link className="primary" to="/classes">Quản lý lớp</Link>}
      />

      {classes.isLoading && <PageLoader message="Đang tải các lớp…" />}
      <LoadError query={classes} what="các lớp" />

      {classes.data?.length === 0 && (
        <Empty>Chưa có lớp đang hoạt động. Mở quản lý lớp để tạo lớp đầu tiên.</Empty>
      )}

      {!!classes.data?.length && (
        <>
          <section className="teacher-dashboard-section" aria-labelledby="teacher-actions-title">
            <div className="teacher-dashboard-section-head">
              <h2 id="teacher-actions-title">Cần xử lý</h2>
              <p>Các mục cần sự chú ý của giáo viên.</p>
            </div>
            <div className="teacher-action-list">
              <Link className="teacher-action-item" to={classHref(pendingClass?.id, "students")}>
                <span>Yêu cầu tham gia chờ duyệt</span>
                <strong>{totalPending}</strong>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link className="teacher-action-item" to={classHref(lateClassIndex >= 0 ? classes.data[lateClassIndex]?.id : undefined, "work")}>
                <span>Bài nộp trễ chờ xem xét</span>
                <strong>{summaryValue(totalLate)}</strong>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link className="teacher-action-item" to="/class-labs">
                <span>Lab đang giao trong các lớp</span>
                <strong>{summaryValue(totalLabs)}</strong>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section className="teacher-dashboard-section" aria-labelledby="teacher-classes-title">
            <div className="teacher-dashboard-section-head">
              <h2 id="teacher-classes-title">Lớp đang quản lý</h2>
              <p>{classes.data.length} lớp</p>
            </div>
            <div className="teacher-class-table-wrap">
              <table className="teacher-class-table">
                <thead>
                  <tr>
                    <th scope="col">Lớp</th>
                    <th scope="col">Thành viên</th>
                    <th scope="col">Bài giao</th>
                    <th scope="col">Hạn nộp</th>
                    <th scope="col"><span className="sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {classes.data.map((classroom, index) => {
                    const summary = summaries[index];
                    return (
                      <tr key={classroom.id}>
                        <td>
                          <Link to={classHref(classroom.id, classroom.members.pending ? "students" : "work")}>
                            {classroom.name}
                          </Link>
                          <small>Khối {classroom.grade}</small>
                        </td>
                        <td>
                          {classroom.members.approved} đã duyệt
                          {classroom.members.pending > 0 && <small>{classroom.members.pending} chờ duyệt</small>}
                        </td>
                        <td>{classroom.assignments.active} đang giao</td>
                        <td>
                          {summary?.isPending ? "Đang tải…" : summary?.isError ? (
                            <>
                              <span role="status">Chưa tải được</span>
                              <button type="button" className="text-button" onClick={() => summary.refetch()}>Thử lại</button>
                            </>
                          ) : (
                            <>
                              {summary.data?.soon ?? 0} sắp đến hạn
                              <small>{summary.data?.overdue ?? 0} đã quá hạn</small>
                            </>
                          )}
                        </td>
                        <td><Link className="teacher-table-action" to={classHref(classroom.id, "work")}>Mở lớp <ArrowRight size={15} aria-hidden="true" /></Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
