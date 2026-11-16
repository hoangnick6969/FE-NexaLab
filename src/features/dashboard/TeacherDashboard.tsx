import { useQueries, useQuery } from "@tanstack/react-query";
import { CalendarClock, Check, Clock, FlaskConical, UserPlus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Empty } from "../../components/ui";
import { Bar } from "../../components/skeletons";
import { PageHeading } from "../../components/PageHeading";
import { type ClassSummary, type TeacherAssignment } from "../classes/class-types";
import { LoadError } from "../classes/class-ui";
import { TeacherOverviewSkeleton } from "../classes/TeacherSkeletons";
import "../classes/teacher-operations.css";
import "../classes/teacher-overview.css";

type ClassWorkSummary = { late: number; overdue: number; soon: number; labs: number };

/** One thing the teacher has to deal with: a big count, what it is, and the classes it sits in. Zero reads as done. */
function TaskTile({ tone, icon: Icon, label, count, to, note, chips }: {
  tone: "join" | "late" | "lab"; icon: LucideIcon; label: string; count: ReactNode; to: string; note?: string; chips?: Array<{ id: string; name: string; value: number; to: string }>;
}) {
  const clear = count === 0;
  return (
    <article className={`tov-task is-${tone}${clear ? " is-clear" : ""}`}>
      <span className="tov-task-icon" aria-hidden="true">{clear ? <Check size={20} /> : <Icon size={20} />}</span>
      <div className="tov-task-body">
        <Link className="tov-task-main" to={to}>{label}</Link>
        {note && <span className="tov-task-note">{note}</span>}
        {!!chips?.length && (
          <span className="tov-chips">
            {chips.map((chip) => <Link key={chip.id} to={chip.to} className="tov-chip">{chip.name} <b>{chip.value}</b></Link>)}
          </span>
        )}
      </div>
      <strong className="tov-task-count">{count}</strong>
    </article>
  );
}

const gradeTone = (grade: number) => (grade === 8 ? "g8" : grade === 9 ? "g9" : "gx");

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
  const pendingClasses = (classes.data ?? []).filter((classroom) => classroom.members.pending > 0);

  const lateClasses = (classes.data ?? []).map((classroom, index) => ({
    classroom,
    late: summaries[index]?.data?.late ?? 0,
  })).filter((item) => item.late > 0);

  const totalLate = summaries.reduce((count, summary) => count + (summary.data?.late ?? 0), 0);
  const totalLabs = summaries.reduce((count, summary) => count + (summary.data?.labs ?? 0), 0);
  const summariesLoading = summaries.some((summary) => summary.isPending);
  const summariesError = summaries.some((summary) => summary.isError);
  const summaryValue = (value: number) => summariesLoading ? "…" : summariesError ? "—" : value;
  const classHref = (id?: string, tab = "students") => id
    ? `/classes/${encodeURIComponent(id)}?tab=${tab}`
    : "/classes";

  // One sentence that says what today needs, from the same numbers as the tiles.
  const lede = (() => {
    if (summariesLoading) return null;
    const parts = [
      totalPending > 0 && <><b>{totalPending}</b> yêu cầu tham gia chờ duyệt</>,
      !summariesError && totalLate > 0 && <><b>{totalLate}</b> bài nộp trễ chờ xem xét</>,
    ].filter(Boolean) as ReactNode[];
    if (!parts.length) return "Không có việc nào đang chờ. Chọn một lớp để xem tiến độ của học sinh.";
    return <>Đang có {parts.map((part, i) => <span key={i}>{i > 0 && " và "}{part}</span>)}.</>;
  })();

  return (
    <div className="teacher-workspace teacher-dashboard">
      <PageHeading
        title="Tổng quan lớp học"
        description="Xử lý yêu cầu tham gia, xem bài cần duyệt và theo dõi hạn của từng lớp."
        action={<Link className="primary" to="/classes">Quản lý lớp</Link>}
      />

      {classes.isLoading && <TeacherOverviewSkeleton label="Đang tải các lớp…" />}
      <LoadError query={classes} what="các lớp" />

      {classes.data?.length === 0 && (
        <Empty>Chưa có lớp đang hoạt động. Mở quản lý lớp để tạo lớp đầu tiên.</Empty>
      )}

      {!!classes.data?.length && (
        <>
          {lede ? <p className="tov-lede">{lede}</p> : <Bar w="min(420px, 80%)" h={20} />}

          <section className="tov-section" aria-labelledby="teacher-actions-title">
            <h2 id="teacher-actions-title">Cần xử lý</h2>
            <div className="tov-tasks">
              <TaskTile
                tone="join"
                icon={UserPlus}
                label="Yêu cầu tham gia chờ duyệt"
                count={totalPending}
                to={pendingClasses.length === 1 ? classHref(pendingClasses[0].id, "students") : "/classes"}
                note={pendingClasses.length === 0 ? "Tất cả học sinh đã được duyệt" : undefined}
                chips={pendingClasses.length ? pendingClasses.map((c) => ({ id: c.id, name: c.name, value: c.members.pending, to: classHref(c.id, "students") })) : undefined}
              />
              <TaskTile
                tone="late"
                icon={Clock}
                label="Bài nộp trễ chờ xem xét"
                count={summaryValue(totalLate)}
                to={lateClasses.length === 1 ? classHref(lateClasses[0].classroom.id, "work") : "/classes"}
                note={summariesLoading ? "Đang tổng hợp bài trễ…" : lateClasses.length === 0 ? "Không có bài trễ cần duyệt" : undefined}
                chips={lateClasses.length ? lateClasses.map((item) => ({ id: item.classroom.id, name: item.classroom.name, value: item.late, to: classHref(item.classroom.id, "work") })) : undefined}
              />
              <TaskTile
                tone="lab"
                icon={FlaskConical}
                label="Lab đang giao trong các lớp"
                count={summaryValue(totalLabs)}
                to="/class-labs"
                note="Quản lý bài thực hành phòng lab ảo"
              />
            </div>
          </section>

          <section className="tov-section" aria-labelledby="teacher-classes-title">
            <div className="tov-section-head">
              <h2 id="teacher-classes-title">Lớp đang quản lý</h2>
              <span>{classes.data.length} lớp</span>
            </div>
            <div className="tov-classes">
              {classes.data.map((classroom, index) => {
                const summary = summaries[index];
                const overdue = summary?.data?.overdue ?? 0;
                return (
                  <article key={classroom.id} className="tov-class">
                    <header className="tov-class-head">
                      <span className={`tov-grade ${gradeTone(classroom.grade)}`} aria-hidden="true">{classroom.grade}</span>
                      <div>
                        <h3>{classroom.name}</h3>
                        <p>Khối {classroom.grade}</p>
                      </div>
                      {classroom.members.pending > 0 && (
                        <Link className="tov-flag" to={classHref(classroom.id, "students")}>{classroom.members.pending} chờ duyệt</Link>
                      )}
                    </header>
                    <dl className="tov-stats">
                      <div><dt>Học sinh</dt><dd>{classroom.members.approved}</dd></div>
                      <div><dt>Đang giao</dt><dd>{classroom.assignments.active}</dd></div>
                      <div>
                        <dt>Sắp đến hạn</dt>
                        <dd>
                          {summary?.isPending ? <Bar w="28px" h={22} /> : summary?.isError ? "—" : summary?.data?.soon ?? 0}
                        </dd>
                      </div>
                    </dl>
                    {summary?.isError ? (
                      <p className="tov-class-alert is-muted" role="status">
                        Chưa tải được hạn nộp
                        <button type="button" className="text-button" onClick={() => summary.refetch()}>Thử lại</button>
                      </p>
                    ) : overdue > 0 ? (
                      <p className="tov-class-alert"><CalendarClock size={15} aria-hidden="true" />{overdue} bài đã quá hạn</p>
                    ) : null}
                    <div className="tov-class-actions">
                      <Link className="primary tov-btn" to={classHref(classroom.id, classroom.members.pending ? "students" : "work")}>Mở lớp</Link>
                      <Link className="secondary tov-btn" to={`/class-labs?classId=${encodeURIComponent(classroom.id)}&assign=1`}>Giao lab</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
