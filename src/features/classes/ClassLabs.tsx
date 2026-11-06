import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, FlaskConical, Eye, Edit3, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { Badge, CardSkeleton, Empty, ErrorBox } from "../../components/ui";
import { PageHeading } from "../../components/PageHeading";
import { defineText } from "../../i18n";
import { dueLabel, LoadError } from "./class-ui";
import { type ClassSummary, type TeacherAssignment } from "./class-types";
import "./teacher-operations.css";
import { TeacherClassResources } from "./ClassSpaceResources";
import { labInfo } from "../labs/lab-info";
import { resourceInput } from "./ResourceEditor";
import { TeacherClassLabAdditionalResponses } from "./ClassLabAdditionalResponses";

const text = defineText({
  vi: {
    title: "Class Lab",
    description: "Mở phòng thí nghiệm, chỉnh đề bài trong giới hạn đã duyệt rồi giao cho lớp.",
    manageClasses: "Quản lý lớp",
    active: "Đang giao",
    archived: "Đã lưu trữ",
    classCount: (count: number) => `${count} lớp`,
    grade: (grade: number) => `Khối ${grade}`,
    students: (count: number) => `${count} học sinh đã duyệt`,
    assign: "Giao lab",
    privateActivities: "Đề bài Lab đã lưu: xem trước và sửa bản nháp",
    none: "Chưa có bài lab nào được giao.",
    noneHelp: "Bấm Giao lab, chọn Lab nguồn rồi thiết kế đề bài ngay trong phòng thí nghiệm.",
    noClasses: "Chưa có lớp phù hợp.",
    noActiveClasses: "Tạo lớp trước khi giao bài thực hành.",
    noArchived: "Chưa có bài lab lưu trữ.",
    createClass: "Tạo lớp",
    loadClasses: "các lớp",
    loadAssignments: "bài lab đã giao",
    due: "Hạn nộp",
    recipients: (count: number) => `${count} học sinh`,
    openAssignment: (title: string) => `Mở lớp để xem bài ${title}`,
    wholeClass: "Cả lớp",
    subset: "Nhóm học sinh",
    overdue: "Đã quá hạn",
    noDue: "Không đặt hạn nộp",
  },
  en: {
    title: "Class Lab",
    description: "Customize approved labs for a class, share unscored practice and assign class work.",
    manageClasses: "Manage classes",
    active: "Assigned",
    archived: "Archived",
    classCount: (count: number) => `${count} ${count === 1 ? "class" : "classes"}`,
    grade: (grade: number) => `Grade ${grade}`,
    students: (count: number) => `${count} approved ${count === 1 ? "student" : "students"}`,
    assign: "Assign a lab",
    privateActivities: "Private class labs: create, preview and revise",
    none: "No labs have been assigned yet.",
    noneHelp: "Choose a released foundational lab from a class's assignment area. Assigned work is limited to its recipient list.",
    noClasses: "No matching classes.",
    noActiveClasses: "Create a class before assigning practical work.",
    noArchived: "No archived lab work yet.",
    createClass: "Create a class",
    loadClasses: "classes",
    loadAssignments: "assigned labs",
    due: "Due",
    recipients: (count: number) => `${count} students`,
    openAssignment: (title: string) => `Open class work: ${title}`,
    wholeClass: "Whole class",
    subset: "Selected students",
    overdue: "Past due",
    noDue: "No due date",
  },
});

export function ClassLabs() {
  const t = text();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "archived" ? "archived" : "active";
  const classList = useQuery<ClassSummary[]>({
    queryKey: ["class-labs", "classes", view],
    queryFn: async () => {
      const active = await api<ClassSummary[]>("/classes?status=ACTIVE");
      if (view === "active") return active;
      const archived = await api<ClassSummary[]>("/classes?status=ARCHIVED");
      return [...active, ...archived];
    },
  });
  const classAssignments = useQueries({
    queries: (classList.data ?? []).map((classroom) => ({
      queryKey: ["class-labs", classroom.id, view],
      queryFn: () => api<TeacherAssignment[]>(`/classes/${encodeURIComponent(classroom.id)}/assignments`),
    })),
  });
  const relevantClasses = (classList.data ?? []).filter((classroom) =>
    view === "archived" || classroom.status === "ACTIVE",
  );
  const hasVisibleLab = relevantClasses.some((classroom, index) => classAssignments[index]?.data?.some((assignment) =>
    assignment.contentType === "lab" && (view === "active"
      ? classroom.status === "ACTIVE" && assignment.status === "ACTIVE"
      : classroom.status === "ARCHIVED" || assignment.status === "ARCHIVED"),
  ));
  const allAssignmentsLoaded = classAssignments.every((query) => !query.isLoading && !query.isError);
  const visibleClasses = relevantClasses.filter((classroom, index) => view === "active"
    || classAssignments[index]?.isLoading
    || classAssignments[index]?.isError
    || classAssignments[index]?.data?.some((assignment) => assignment.contentType === "lab" && (classroom.status === "ARCHIVED" || assignment.status === "ARCHIVED")),
  );

  const selectView = (nextView: "active" | "archived") => {
    const next = new URLSearchParams(searchParams);
    if (nextView === "active") next.delete("view");
    else next.set("view", nextView);
    setSearchParams(next);
  };

  return (
    <div className="teacher-workspace teacher-class-labs">
      <PageHeading
        title={t.title}
        description={t.description}
        action={<Link className="primary" to="/classes">{t.manageClasses}</Link>}
      />

      <div className="teacher-workspace-toolbar">
        <div className="teacher-workspace-tabs" role="tablist" aria-label={t.title}>
          <button type="button" role="tab" aria-selected={view === "active"} onClick={() => selectView("active")}>
            {t.active}
          </button>
          <button type="button" role="tab" aria-selected={view === "archived"} onClick={() => selectView("archived")}>
            {t.archived}
          </button>
        </div>
        {!classList.isLoading && !classList.isError && <span className="teacher-workspace-count">{t.classCount(relevantClasses.length)}</span>}
      </div>

      <LoadError query={classList} what={t.loadClasses} />
      {classList.isLoading && <div className="teacher-class-labs-loading"><CardSkeleton count={2} /></div>}
      {classList.data?.length === 0 && (
        <Empty>{view === "active" ? t.noActiveClasses : t.noClasses}</Empty>
      )}
      {view === "active" && classList.data?.length === 0 && (
        <Link className="primary teacher-inline-action" to="/classes">{t.createClass}</Link>
      )}

      {visibleClasses.map((classroom) => {
        const index = classList.data?.findIndex((item) => item.id === classroom.id) ?? -1;
        const assignmentsQuery = classAssignments[index];
        const labs = (assignmentsQuery?.data ?? []).filter((assignment) =>
          assignment.contentType === "lab" && (view === "active"
            ? classroom.status === "ACTIVE" && assignment.status === "ACTIVE"
            : classroom.status === "ARCHIVED" || assignment.status === "ARCHIVED"),
        );
        const classQuery = new URLSearchParams({ tab: "work" });
        if (classroom.status === "ARCHIVED") classQuery.set("status", "ARCHIVED");
        const classHref = `/classes/${encodeURIComponent(classroom.id)}?${classQuery.toString()}`;
        const assignHref = `/classes/${encodeURIComponent(classroom.id)}?tab=work&assign=lab`;

        return (
          <section className="teacher-class-labs-group" key={classroom.id} aria-labelledby={`class-labs-${classroom.id}`}>
            <header className="teacher-class-labs-header">
              <div>
                <h2 id={`class-labs-${classroom.id}`}>{classroom.name}</h2>
                <p>{t.grade(classroom.grade)} · {t.students(classroom.members.approved)}</p>
              </div>
              {classroom.status === "ACTIVE" && view === "active" && (
                <Link className="secondary teacher-class-labs-link" to={assignHref}>
                  {t.assign}<ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
            </header>
            {view === "active" && <details><summary>{t.privateActivities}</summary><TeacherClassResources classId={classroom.id} disabled={classroom.status !== "ACTIVE"} labOnly /></details>}

            {assignmentsQuery?.isLoading && <div className="teacher-class-labs-loading"><CardSkeleton count={1} /></div>}
            {assignmentsQuery?.isError && <LoadError query={assignmentsQuery} what={t.loadAssignments} />}
            {assignmentsQuery?.data && labs.length === 0 && (
              <div className="teacher-class-labs-empty">
                <FlaskConical size={20} aria-hidden="true" />
                <div><b>{t.none}</b><p>{t.noneHelp}</p></div>
              </div>
            )}
            {labs.length > 0 && (
              <div className="teacher-class-labs-list">
                {labs.map((assignment) => (
                  <article className="teacher-class-lab-row" key={assignment.id}>
                    <div className="teacher-class-lab-icon" aria-hidden="true">{labInfo.find((lab) => lab.id === assignment.contentId)?.thumbnail ? <img src={labInfo.find((lab) => lab.id === assignment.contentId)!.thumbnail} alt="" /> : <FlaskConical size={18} />}</div>
                    <div className="teacher-class-lab-main">
                      <h3>{assignment.title}</h3>
                      <p>{t.recipients(assignment.recipientCount)} · {assignment.audience === "CLASS" ? t.wholeClass : t.subset}</p>
                    </div>
                    <div className="teacher-class-lab-due">
                      <span>{t.due}</span>
                      <b>{dueLabel(assignment.dueDate) || t.noDue}</b>
                    </div>
                    {view === "active" && assignment.overdue && assignment.status === "ACTIVE" && <Badge tone="outline">{t.overdue}</Badge>}
                    <div className="teacher-class-lab-actions">
                      <Link className="secondary button-compact" to={`/labs/${encodeURIComponent(assignment.contentId)}${assignment.classLabSnapshot ? `?classId=${encodeURIComponent(classroom.id)}&resourceId=${encodeURIComponent(assignment.classLabSnapshot.resourceId)}` : ""}`}>
                        <Eye size={13} aria-hidden="true" />
                        <span>{assignment.classLabSnapshot ? "Xem Lab Space" : "Xem Lab nguồn"}</span>
                      </Link>
                      {assignment.classLabSnapshot && view === "active" && <EditAssignedLab classId={classroom.id} assignment={assignment} />}
                      {!assignment.classLabSnapshot && view === "active" && (
                        <Link className="secondary button-compact" to={`/classes/${encodeURIComponent(classroom.id)}?tab=work&assign=lab&labId=${encodeURIComponent(assignment.contentId)}`}>
                          <Sparkles size={13} aria-hidden="true" />
                          <span>Tạo đề bài riêng</span>
                        </Link>
                      )}
                      <Link className="teacher-class-lab-open" to={classHref} aria-label={t.openAssignment(assignment.title)}><ArrowRight size={18} aria-hidden="true" /></Link>
                    </div>
                    {assignment.classLabSnapshot && view === "active" && <TeacherClassLabAdditionalResponses classId={classroom.id} resourceId={assignment.classLabSnapshot.resourceId} assignmentId={assignment.id} />}
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {view === "archived" && relevantClasses.length > 0 && !hasVisibleLab && allAssignmentsLoaded && (
        <Empty>{t.noArchived}</Empty>
      )}
    </div>
  );
}

function EditAssignedLab({ classId, assignment }: { classId: string; assignment: TeacherAssignment }) {
  const navigate = useNavigate();
  const revise = useMutation({ mutationFn: () => {
    if (assignment.audience === "SUBSET" && !assignment.targetStudentIds?.length) throw new Error("Không tải được danh sách học sinh của bài cũ. Hãy tải lại trang trước khi giao bản mới.");
    return api<any>(`/classes/${encodeURIComponent(classId)}/resources/${encodeURIComponent(assignment.classLabSnapshot!.resourceId)}/revise`, "POST", {});
  }, onSuccess: (draft) => {
    navigate(`/labs/${encodeURIComponent(assignment.contentId)}?classId=${encodeURIComponent(classId)}&customize=1`, { state: { labDraft: { kind: "LAB", title: draft.title, lessonId: draft.lessonId, resourceId: draft.id, content: resourceInput("LAB", draft.content), assignment: { studentIds: assignment.targetStudentIds ?? [], dueDate: assignment.dueDate } } } });
  } });
  return (
    <>
      <button type="button" className="secondary button-compact" disabled={revise.isPending} onClick={() => revise.mutate()}>
        <Edit3 size={13} aria-hidden="true" />
        <span>{revise.isPending ? "Đang mở…" : "Sửa câu hỏi và giao bản mới"}</span>
      </button>
      <ErrorBox error={revise.error} />
    </>
  );
}
