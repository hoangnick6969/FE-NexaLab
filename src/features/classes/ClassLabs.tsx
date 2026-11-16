import { useEffect, useState } from "react";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, BarChart2, ChevronDown, Edit3, Eye, FlaskConical, Plus, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { Empty, ErrorBox } from "../../components/ui";
import { PageHeading } from "../../components/PageHeading";
import { ClassLabsSkeleton, LabRowSkeleton } from "./TeacherSkeletons";
import { defineText, formatDate } from "../../i18n";
import { LoadError } from "./class-ui";
import { type ClassSummary, type TeacherAssignment } from "./class-types";
import "./teacher-operations.css";
import "./teacher-overview.css";
import { TeacherClassResources } from "./ClassSpaceResources";
import { labInfo } from "../labs/lab-info";
import { KitComponents } from "../labs/kit-catalog/KitComponents";
import { resourceInput } from "./ResourceEditor";
import { TeacherClassLabAdditionalResponses } from "./ClassLabAdditionalResponses";
import { AssignLabChooser } from "./AssignLabChooser";
import { AssignmentRowActions } from "./AssignmentManage";
import { AssignModal } from "./Assignments";
import { ExploreAssignModal } from "./explore/ExploreAssignModal";
import { ExploreBoard } from "./explore/ExploreBoard";
import { showsInView, type ClassLabsView } from "./class-labs-view";

const text = defineText({
  vi: {
    title: "Class Lab",
    description: "Mở phòng thí nghiệm, chỉnh đề bài trong giới hạn đã duyệt rồi giao cho lớp.",
    manageClasses: "Quản lý lớp",
    active: "Đang giao",
    archived: "Đã lưu trữ",
    kitCatalog: "Dụng cụ theo Kit",
    classCount: (count: number) => `${count} lớp`,
    grade: (grade: number) => `Khối ${grade}`,
    students: (count: number) => `${count} học sinh đã duyệt`,
    assign: "Giao lab",
    privateActivities: "Đề bài Lab đã lưu: xem trước và sửa bản nháp",
    none: "Chưa có bài lab nào được giao.",
    noneHelp: "Bấm Giao lab, chọn kiểu bài rồi thiết kế đề ngay trong phòng thí nghiệm.",
    exploreKind: "Thí nghiệm tự do",
    guidedKind: "Lab có hướng dẫn",
    daysLeft: (n: number) => (n <= 0 ? "Hết hạn hôm nay" : n === 1 ? "Còn 1 ngày" : `Còn ${n} ngày`),
    dueOn: (date: string) => `Hạn ${date}`,
    viewLabSpace: "Xem Lab Space",
    viewSource: "Xem Lab nguồn",
    ownTask: "Tạo đề bài riêng",
    submissions: "Xem bài nộp",
    noClasses: "Chưa có lớp phù hợp.",
    noActiveClasses: "Tạo lớp trước khi giao bài thực hành.",
    noArchived: "Chưa có bài lab lưu trữ.",
    createClass: "Tạo lớp",
    loadClasses: "các lớp",
    loadAssignments: "bài lab đã giao",
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
    kitCatalog: "Apparatus by Kit",
    classCount: (count: number) => `${count} ${count === 1 ? "class" : "classes"}`,
    grade: (grade: number) => `Grade ${grade}`,
    students: (count: number) => `${count} approved ${count === 1 ? "student" : "students"}`,
    assign: "Assign a lab",
    privateActivities: "Private class labs: create, preview and revise",
    none: "No labs have been assigned yet.",
    noneHelp: "Press Assign a lab, choose the kind of work and design it in the lab. Assigned work is limited to its recipient list.",
    exploreKind: "Free experiment",
    guidedKind: "Guided lab",
    daysLeft: (n: number) => (n <= 0 ? "Due today" : n === 1 ? "1 day left" : `${n} days left`),
    dueOn: (date: string) => `Due ${date}`,
    viewLabSpace: "View Lab Space",
    viewSource: "View source lab",
    ownTask: "Create your own task",
    submissions: "View submissions",
    noClasses: "No matching classes.",
    noActiveClasses: "Create a class before assigning practical work.",
    noArchived: "No archived lab work yet.",
    createClass: "Create a class",
    loadClasses: "classes",
    loadAssignments: "assigned labs",
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
  const [notice, setNotice] = useState<string | null>(null);
  const [chooserFor, setChooserFor] = useState<ClassSummary | null>(null);
  const [exploreFor, setExploreFor] = useState<ClassSummary | null>(null);
  const [guidedFor, setGuidedFor] = useState<{ classroom: ClassSummary; labId?: string } | null>(null);
  const [board, setBoard] = useState<{ classroom: ClassSummary; assignment: TeacherAssignment } | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  // Keyed under "classes" so anything that changes a class's counters refreshes this page too.
  const classList = useQuery<ClassSummary[]>({
    queryKey: ["classes", "class-labs", view],
    queryFn: async () => {
      const active = await api<ClassSummary[]>("/classes?status=ACTIVE");
      if (view === "active") return active;
      const archived = await api<ClassSummary[]>("/classes?status=ARCHIVED");
      return [...active, ...archived];
    },
  });
  // Same key and request as the class's Assign tab, so work assigned or changed in one place shows in the other at once.
  const classAssignments = useQueries({
    queries: (classList.data ?? []).map((classroom) => ({
      queryKey: ["class-assignments", classroom.id],
      queryFn: () => api<TeacherAssignment[]>(`/classes/${encodeURIComponent(classroom.id)}/assignments`),
    })),
  });
  const entries = (classList.data ?? []).map((classroom, index) => ({ classroom, query: classAssignments[index] }));
  const relevant = entries.filter(({ classroom }) => view === "archived" || classroom.status === "ACTIVE");
  const hasVisibleLab = relevant.some(({ classroom, query }) => query?.data?.some((assignment) => showsInView(view, classroom, assignment)));
  const allAssignmentsLoaded = classAssignments.every((query) => !query.isLoading && !query.isError);
  const visible = relevant.filter(({ classroom, query }) => view === "active"
    || query?.isLoading
    || query?.isError
    || query?.data?.some((assignment) => showsInView(view, classroom, assignment)),
  );

  // Deep link: /class-labs?classId=...&assign=explore opens the Explore flow, assign=guided[&labId=...] the Guided flow, anything else the chooser.
  const requestedClassId = searchParams.get("classId");
  const requestedAssign = searchParams.get("assign");
  useEffect(() => {
    if (!requestedClassId || !requestedAssign || !classList.data) return;
    const target = classList.data.find((classroom) => classroom.id === requestedClassId && classroom.status === "ACTIVE");
    if (target) {
      if (requestedAssign === "explore") setExploreFor(target);
      else if (requestedAssign === "guided") setGuidedFor({ classroom: target, labId: searchParams.get("labId") ?? undefined });
      else setChooserFor(target);
    }
    const next = new URLSearchParams(searchParams);
    next.delete("classId");
    next.delete("assign");
    next.delete("labId");
    setSearchParams(next, { replace: true });
  }, [requestedClassId, requestedAssign, classList.data]);

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
        {!classList.isLoading && !classList.isError && <span className="teacher-workspace-count">{t.classCount(relevant.length)}</span>}
      </div>

      <details className="class-labs-kit" onToggle={(event) => setCatalogOpen(event.currentTarget.open)}>
        <summary><FlaskConical size={18} aria-hidden="true" />{t.kitCatalog}<ChevronDown size={16} aria-hidden="true" /></summary>
        {catalogOpen && <KitComponents standalone />}
      </details>

      {notice && <p className="notice" role="status">{notice}</p>}
      <LoadError query={classList} what={t.loadClasses} />
      {classList.isLoading && <ClassLabsSkeleton label={t.loadClasses} />}
      {classList.data?.length === 0 && (
        <Empty>{view === "active" ? t.noActiveClasses : t.noClasses}</Empty>
      )}
      {view === "active" && classList.data?.length === 0 && (
        <Link className="primary teacher-inline-action" to="/classes">{t.createClass}</Link>
      )}

      {visible.map(({ classroom, query: assignmentsQuery }) => {
        const labs = (assignmentsQuery?.data ?? []).filter((assignment) => showsInView(view, classroom, assignment));
        const classQuery = new URLSearchParams({ tab: "work" });
        if (classroom.status === "ARCHIVED") classQuery.set("status", "ARCHIVED");
        const classHref = `/classes/${encodeURIComponent(classroom.id)}?${classQuery.toString()}`;

        return (
          <section className="tcl-group" key={classroom.id} aria-labelledby={`class-labs-${classroom.id}`}>
            <header className="tcl-head">
              <div>
                <h2 id={`class-labs-${classroom.id}`}>{classroom.name}</h2>
                <p>
                  <span>{t.grade(classroom.grade)}</span>
                  <span>{t.students(classroom.members.approved)}</span>
                </p>
              </div>
              {classroom.status === "ACTIVE" && view === "active" && (
                <button type="button" className="primary tov-btn tcl-assign" onClick={() => { setNotice(null); setChooserFor(classroom); }}>
                  <Plus size={16} aria-hidden="true" />{t.assign}
                </button>
              )}
            </header>
            {view === "active" && (
              <details className="tcl-saved">
                <summary>{t.privateActivities}<ChevronDown size={15} aria-hidden="true" /></summary>
                <TeacherClassResources classId={classroom.id} disabled={classroom.status !== "ACTIVE"} labOnly />
              </details>
            )}

            {assignmentsQuery?.isLoading && <div className="tcl-list"><LabRowSkeleton /></div>}
            {assignmentsQuery?.isError && <LoadError query={assignmentsQuery} what={t.loadAssignments} />}
            {assignmentsQuery?.data && labs.length === 0 && (
              <div className="tcl-empty">
                <FlaskConical size={22} aria-hidden="true" />
                <div><b>{t.none}</b><p>{t.noneHelp}</p></div>
              </div>
            )}
            {labs.length > 0 && (
              <div className="tcl-list">
                {labs.map((assignment) => (
                  <LabWorkRow key={assignment.id} classroom={classroom} assignment={assignment} view={view} classHref={classHref} onBoard={() => setBoard({ classroom, assignment })} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {view === "archived" && relevant.length > 0 && !hasVisibleLab && allAssignmentsLoaded && (
        <Empty>{t.noArchived}</Empty>
      )}

      {chooserFor && <AssignLabChooser classroom={chooserFor} onClose={() => setChooserFor(null)} onExplore={() => { setExploreFor(chooserFor); setChooserFor(null); }} onGuided={() => { setGuidedFor({ classroom: chooserFor }); setChooserFor(null); }} />}
      {guidedFor && <AssignModal labOnly classroom={guidedFor.classroom} initialContentType="lab" initialLabId={guidedFor.labId} onClose={() => setGuidedFor(null)} onAssigned={(message) => { setNotice(message); setGuidedFor(null); }} />}
      {exploreFor && <ExploreAssignModal classroom={exploreFor} onClose={() => setExploreFor(null)} onAssigned={(message) => { setNotice(message); setExploreFor(null); }} />}
      {board && <ExploreBoard classroom={board.classroom} assignment={board.assignment} onClose={() => setBoard(null)} />}
    </div>
  );
}

/** Days from today to a due date, counted in calendar days so "due this evening" is 0 and tomorrow is 1. */
function daysUntil(due: string) {
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  return Math.round((startOfDay(new Date(due)) - startOfDay(new Date())) / 86400000);
}

/** One lab assigned to a class: a Guided lab (with its class draft) or an Explore lab, with what the teacher can do next. */
function LabWorkRow({ classroom, assignment, view, classHref, onBoard }: { classroom: ClassSummary; assignment: TeacherAssignment; view: ClassLabsView; classHref: string; onBoard: () => void }) {
  const t = text();
  const explore = assignment.contentType === "explore_lab";
  const thumbnail = labInfo.find((lab) => lab.id === assignment.contentId)?.thumbnail;
  const manageable = view === "active" && classroom.status === "ACTIVE" && assignment.status === "ACTIVE";
  const days = assignment.dueDate ? daysUntil(assignment.dueDate) : null;
  const late = manageable && assignment.overdue;
  const labHref = `/labs/${encodeURIComponent(assignment.contentId)}${assignment.classLabSnapshot ? `?classId=${encodeURIComponent(classroom.id)}&resourceId=${encodeURIComponent(assignment.classLabSnapshot.resourceId)}` : ""}`;
  return (
    <article className="teacher-class-lab-row">
      <div className="tcl-thumb" aria-hidden="true">{thumbnail ? <img src={thumbnail} alt="" loading="lazy" /> : <FlaskConical size={22} />}</div>
      <div className="tcl-main">
        <h3>{assignment.title}</h3>
        <p className="tcl-meta">
          <span className="tcl-kind">{explore ? t.exploreKind : t.guidedKind}</span>
          <span>{t.recipients(assignment.recipientCount)}</span>
          <span>{assignment.audience === "CLASS" ? t.wholeClass : t.subset}</span>
        </p>
      </div>
      <div className={`tcl-due${late ? " is-late" : ""}`}>
        {assignment.dueDate ? (
          <>
            <span className="tcl-due-when">{late ? t.overdue : t.daysLeft(days ?? 0)}</span>
            <span className="tcl-due-date">{t.dueOn(formatDate(assignment.dueDate))}</span>
          </>
        ) : (
          <span className="tcl-due-when">{t.noDue}</span>
        )}
      </div>
      <div className="tcl-actions">
        {explore ? (
          <button type="button" className="secondary button-compact" onClick={onBoard}>
            <BarChart2 size={14} aria-hidden="true" />
            <span>{t.submissions}</span>
          </button>
        ) : (
          <Link className="secondary button-compact" to={labHref}>
            <Eye size={14} aria-hidden="true" />
            <span>{assignment.classLabSnapshot ? t.viewLabSpace : t.viewSource}</span>
          </Link>
        )}
        {!explore && assignment.classLabSnapshot && view === "active" && <EditAssignedLab classId={classroom.id} assignment={assignment} />}
        {!explore && !assignment.classLabSnapshot && view === "active" && (
          <Link className="secondary button-compact" to={`/class-labs?classId=${encodeURIComponent(classroom.id)}&assign=guided&labId=${encodeURIComponent(assignment.contentId)}`}>
            <Sparkles size={14} aria-hidden="true" />
            <span>{t.ownTask}</span>
          </Link>
        )}
        {manageable && <AssignmentRowActions classroom={classroom} assignment={assignment} />}
        <Link className="tcl-open" to={classHref} aria-label={t.openAssignment(assignment.title)}><ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
      {!explore && assignment.classLabSnapshot && view === "active" && <TeacherClassLabAdditionalResponses classId={classroom.id} resourceId={assignment.classLabSnapshot.resourceId} assignmentId={assignment.id} />}
    </article>
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
