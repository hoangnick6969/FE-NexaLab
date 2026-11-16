import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FlaskConical,
  GraduationCap,
  Layers,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, idempotencyKey, isApiError } from "../../lib/api";
import { Badge, Empty, ErrorBox, Field, Modal } from "../../components/ui";
import { ClassCardsSkeleton, LessonRowsSkeleton } from "../../components/skeletons";
import { PageHeading } from "../../components/PageHeading";
import { ClassLessonCards } from "./ClassLessonCards";
import { StudentClassResources } from "./ClassSpaceResources";
import { labInfo } from "../labs/lab-info";
import { labCurriculumLabel, labCurriculumMetadata } from "../labs/lab-curriculum-label";
import { type StudentClass } from "./class-types";
import { LoadError, dueLabel, useMutate } from "./class-ui";
import { SubjectGradeChapterBrowser, type HierarchyItem } from "../../components/SubjectGradeChapterBrowser";
import { testStatusLabel, testStatusTone } from "../../lib/test-status";
import { defineText, formatDateTime } from "../../i18n";
import { commonText } from "../../i18n/common";
import "./class-resource-preview.css";

const text = defineText({
  vi: {
    tooMany: "Bạn đã thử quá nhiều lần. Hãy thử lại sau 15 phút.",
    invalidCode: "Mã lớp không hợp lệ. Hãy kiểm tra lại với giáo viên.",
    opening: "Đang mở lớp…",
    loadingClass: "Đang tải nội dung lớp.",
    loadFailed: "Không tải được lớp",
    reloadList: "Hãy thử tải lại danh sách lớp.",
    backToList: "Quay lại danh sách lớp",
    notFound: "Không tìm thấy lớp",
    notMember: "Lớp này không nằm trong danh sách lớp em tham gia.",
    backToSpace: "Quay lại Class Space",
    eyebrowGrade: (grade: number) => `CLASS SPACE · KHỐI ${grade}`,
    classIntro: "Không gian học tập riêng của lớp.",
    classListBack: "Danh sách lớp",
    archived: "Lớp đã lưu trữ",
    joined: "Đã vào lớp",
    waiting: "Chờ giáo viên duyệt",
    pendingLong: "Yêu cầu của em đang chờ giáo viên duyệt. Nội dung lớp sẽ mở sau khi được duyệt.",
    tabsLabel: "Nội dung Class Space",
    tabLessons: "Môn học và bài được giao",
    tabTests: "Bài kiểm tra",
    tabResources: "Tài nguyên lớp",
    bySubject: "Nội dung theo môn học",
    classSpaceContent: "nội dung Class Space",
    noClassWork: "Lớp này hiện chưa có nội dung được giao.",
    overdue: "Đã quá hạn · vẫn có thể học",
    assignedTests: "Bài kiểm tra được giao",
    tests: "bài kiểm tra",
    noTests: "Chưa có bài kiểm tra được giao trong lớp này.",
    title: "Class Space của em",
    description: "Xem các lớp em tham gia, trạng thái thành viên và bài được giao.",
    joinByCode: "Tham gia bằng mã",
    classList: "danh sách lớp",
    noClasses: "Em chưa tham gia lớp nào. Hãy nhập mã lớp thầy cô gửi.",
    pendingShort: "Yêu cầu của em đang chờ giáo viên duyệt.",
    assignedCount: (n: number) => `${n} bài được giao`,
    openClassSpace: "Vào Class Space",
    joinTitle: "Tham gia lớp",
    joinCode: "Mã tham gia lớp",
    sending: "Đang gửi…",
    join: "Tham gia",
    joinResult: (r: { message: string; pending: boolean }) => r.message,
    reviewCards: (title: string) => `Ôn thẻ · ${title}`,
    searchPlaceholder: "Tìm kiếm theo tên lớp, giáo viên, môn học…",
    allStatus: "Tất cả trạng thái",
    statusAll: "Tất cả",
    statusApproved: "Đã vào lớp",
    statusPending: "Chờ duyệt",
    statusArchived: "Đã lưu trữ",
    filterGradeAll: "Tất cả khối",
    gradeLabel: (g: number) => `Khối ${g}`,
    resultCount: (n: number) => `Hiển thị ${n} lớp học`,
    clearFilters: "Đặt lại bộ lọc",
    noMatchTitle: "Không tìm thấy lớp học phù hợp",
    noMatchDesc: "Không có lớp học nào khớp với từ khóa tìm kiếm hoặc bộ lọc đã chọn.",
    defaultTeacher: "Giáo viên phụ trách",
    subjectDefault: "Khoa học tự nhiên",
    overdueWarning: (n: number) => `${n} quá hạn`,
    tabLabs: "Thí nghiệm ảo",
    badgeLab: "Thí nghiệm ảo",
    badgeLesson: "Bài học lý thuyết",
    typeLab: "Thực hành Lab",
    typeLesson: "Lý thuyết",
    labsTitle: "Phòng thí nghiệm ảo của lớp",
    labsDesc: "Các bài thực hành thí nghiệm mô phỏng khoa học tương tác do giáo viên giao cho lớp.",
    noLabs: "Lớp chưa có bài thực hành thí nghiệm ảo nào.",
    noLabsDesc: "Khi thầy cô giao bài tập mô phỏng phòng lab khoa học, bài tập sẽ xuất hiện tại đây để em thực hành.",
    enterLab: "Vào phòng thí nghiệm",
    testsTitle: "Bài kiểm tra & Quiz đánh giá",
    testsDesc: "Các bài kiểm tra tính điểm và đánh giá năng lực do giáo viên giao cho lớp.",
    resourcesTitle: "Tài nguyên của lớp",
    resourcesDesc: "Tài liệu, mẫu báo cáo, Lab riêng và học liệu thầy cô chia sẻ.",
    lessonReviewTitle: "Bộ thẻ ôn tập kiến thức theo bài học",
    lessonReviewDesc: "Bộ thẻ ghi nhớ tóm tắt các khái niệm, công thức và trọng tâm kiến thức của bài học.",
    openReviewDeck: "Mở bộ thẻ ôn tập",
    closeReviewDeck: "Đóng bộ thẻ",
    teacherLabel: "Giáo viên phụ trách",
    classCodeLabel: "Mã lớp",
    classStatsLessons: (n: number) => `${n} bài học`,
    classStatsLabs: (n: number) => `${n} phòng Lab`,
    classStatsTests: (n: number) => `${n} bài kiểm tra`,
    classStatsResources: (n: number) => `${n} tài nguyên`,
    statLessons: "Bài học lý thuyết",
    statLabs: "Thí nghiệm ảo",
    statTests: "Bài kiểm tra",
    statResources: "Tài nguyên lớp",
  },
  en: {
    tooMany: "Too many attempts. Try again in 15 minutes.",
    invalidCode: "That class code is not valid. Check it with your teacher.",
    opening: "Opening the class…",
    loadingClass: "Loading the class content.",
    loadFailed: "The class could not be loaded",
    reloadList: "Try reloading the class list.",
    backToList: "Back to the class list",
    notFound: "Class not found",
    notMember: "This class is not one of your classes.",
    backToSpace: "Back to Class Space",
    eyebrowGrade: (grade: number) => `CLASS SPACE · GRADE ${grade}`,
    classIntro: "The class's own learning space.",
    classListBack: "Class list",
    archived: "Archived class",
    joined: "Joined",
    waiting: "Waiting for the teacher",
    pendingLong: "Your request is waiting for the teacher. Class content opens once approved.",
    tabsLabel: "Class Space content",
    tabLessons: "Subjects and assigned work",
    tabTests: "Tests",
    tabResources: "Class resources",
    bySubject: "Content by subject",
    classSpaceContent: "Class Space content",
    noClassWork: "Nothing is assigned in this class yet.",
    overdue: "Overdue · still open",
    assignedTests: "Assigned tests",
    tests: "tests",
    noTests: "No tests are assigned in this class yet.",
    title: "Your Class Space",
    description: "See your classes, membership status and assigned work.",
    joinByCode: "Join with a code",
    classList: "the class list",
    noClasses: "You are not in any class yet. Enter the code your teacher gave you.",
    pendingShort: "Your request is waiting for the teacher.",
    assignedCount: (n: number) => `${n} assigned`,
    openClassSpace: "Open Class Space",
    joinTitle: "Join a class",
    joinCode: "Class join code",
    sending: "Sending…",
    join: "Join",
    joinResult: (r: { message: string; pending: boolean }) => (r.pending ? "Request sent. The teacher will approve it." : "You have joined the class."),
    reviewCards: (title: string) => `Review cards · ${title}`,
    searchPlaceholder: "Search by class, teacher, subject…",
    allStatus: "All statuses",
    statusAll: "All",
    statusApproved: "Joined",
    statusPending: "Waiting",
    statusArchived: "Archived",
    filterGradeAll: "All grades",
    gradeLabel: (g: number) => `Grade ${g}`,
    resultCount: (n: number) => `Showing ${n} ${n === 1 ? "class" : "classes"}`,
    clearFilters: "Clear filters",
    noMatchTitle: "No matching classes found",
    noMatchDesc: "No classes match your current search and filter settings.",
    defaultTeacher: "Assigned teacher",
    subjectDefault: "Natural Sciences",
    overdueWarning: (n: number) => `${n} overdue`,
    tabLabs: "Virtual Labs",
    badgeLab: "Virtual Lab",
    badgeLesson: "Theory Lesson",
    typeLab: "Lab Experiment",
    typeLesson: "Theory",
    labsTitle: "Class Virtual Labs",
    labsDesc: "Interactive simulation science experiments assigned by your teacher.",
    noLabs: "No virtual labs are assigned in this class yet.",
    noLabsDesc: "When your teacher assigns virtual simulation experiments, they will appear here.",
    enterLab: "Launch Lab Simulation",
    testsTitle: "Assigned Tests & Quizzes",
    testsDesc: "Graded assessments and progress tests assigned to this class.",
    resourcesTitle: "Class resources",
    resourcesDesc: "Documents, report templates, custom labs and learning materials shared by your teacher.",
    lessonReviewTitle: "Lesson Review Flashcards",
    lessonReviewDesc: "Flashcard decks summarizing key concepts and core topics for each lesson.",
    openReviewDeck: "Open flashcard deck",
    closeReviewDeck: "Close deck",
    teacherLabel: "Teacher",
    classCodeLabel: "Class Code",
    classStatsLessons: (n: number) => `${n} ${n === 1 ? "lesson" : "lessons"}`,
    classStatsLabs: (n: number) => `${n} ${n === 1 ? "lab" : "labs"}`,
    classStatsTests: (n: number) => `${n} ${n === 1 ? "test" : "tests"}`,
    classStatsResources: (n: number) => `${n} ${n === 1 ? "resource" : "resources"}`,
    statLessons: "Theory lessons",
    statLabs: "Virtual labs",
    statTests: "Assessments",
    statResources: "Class resources",
  },
});
const t = text();

function extractSubject(c: StudentClass): string {
  if (c.subject) return c.subject;
  const name = c.name.toLowerCase();
  if (name.includes("khoa học tự nhiên") || name.includes("khtn")) return "Khoa học tự nhiên";
  if (name.includes("vật lí") || name.includes("vật lý")) return "Vật lí";
  if (name.includes("hóa học") || name.includes("hoá học")) return "Hóa học";
  if (name.includes("sinh học")) return "Sinh học";
  if (name.includes("toán")) return "Toán học";
  if (name.includes("tin học")) return "Tin học";
  if (name.includes("lịch sử") || name.includes("địa lí") || name.includes("địa lý")) return "Lịch sử & Địa lí";
  if (name.includes("công nghệ")) return "Công nghệ";
  return t.subjectDefault;
}

type ClassWork = HierarchyItem & {
  classId: string;
  contentType: string;
  classroom: { id: string; name: string };
  dueDate: string | null;
  overdue: boolean;
};

async function readStudentClassWork(classId: string) {
  const assignments = await api<any[]>(`/assignments?classId=${encodeURIComponent(classId)}`);
  const eligible = assignments.filter((assignment) => assignment.canOpen !== false);
  return {
    items: eligible.flatMap((assignment) => {
      const curriculum = assignment.contentType === "lab" ? labCurriculumMetadata(assignment) : null;
      const subject = assignment.subject;
      if (assignment.contentType === "test" || !(curriculum?.subjectId ?? subject?.id) || !(curriculum?.grade ?? assignment.grade)) return [];
      return [{
        id: assignment.id,
        title: assignment.title,
        classId: assignment.classroom.id,
        contentType: assignment.contentType,
        classroom: assignment.classroom,
        subjectId: curriculum?.subjectId ?? subject.id,
        subjectName: curriculum?.subjectName ?? subject.name,
        grade: Number(curriculum?.grade ?? assignment.grade),
        chapter: assignment.chapter || commonText().noChapter,
        chapterOrder: assignment.chapterOrder,
        itemOrder: assignment.curriculumOrder ?? assignment.topicOrder,
        dueDate: assignment.dueDate,
        overdue: assignment.overdue,
      }];
    }) as ClassWork[],
    tests: eligible.filter((assignment) => assignment.contentType === "test"),
    labs: eligible.filter((assignment) => assignment.contentType === "lab"),
    lessons: eligible.filter((assignment) => assignment.contentType === "lesson"),
  };
}

type SpaceTab = "lessons" | "labs" | "tests" | "resources";

export function StudentClasses() {
  const { classId } = useParams();
  const [joining, setJoining] = useState(false);
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const activeTab: SpaceTab =
    tabParam === "labs"
      ? "labs"
      : tabParam === "tests"
        ? "tests"
        : tabParam === "resources"
          ? "resources"
          : "lessons";
  const setActiveTab = (tab: SpaceTab) => setParams((previous) => { previous.set("tab", tab); return previous; });
  const reviewId = params.get("assignmentId");
  const [result, setResult] = useState<{ message: string; pending: boolean } | null>(null);
  const key = useRef(idempotencyKey());
  const list = useQuery<StudentClass[]>({ queryKey: ["classes"], queryFn: () => api("/classes") });
  const classWork = useQuery({ queryKey: ["student-class-space-content", classId], queryFn: () => readStudentClassWork(classId!), enabled: Boolean(classId) });
  const join = useMutate<{ enrollmentStatus: string; message: string; class: { name: string } }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "approved" | "pending" | "ARCHIVED">("ALL");
  const [gradeFilter, setGradeFilter] = useState<number | "ALL">("ALL");

  const availableGrades = useMemo(() => {
    if (!list.data) return [];
    return [...new Set(list.data.map((c) => c.grade))].sort((a, b) => a - b);
  }, [list.data]);

  const filteredClasses = useMemo(() => {
    if (!list.data) return [];
    return list.data.filter((c) => {
      if (statusFilter === "approved" && (c.enrollmentStatus !== "approved" || c.status === "ARCHIVED")) return false;
      if (statusFilter === "pending" && c.enrollmentStatus !== "pending") return false;
      if (statusFilter === "ARCHIVED" && c.status !== "ARCHIVED") return false;

      if (gradeFilter !== "ALL" && c.grade !== gradeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const subject = extractSubject(c).toLowerCase();
        const teacherName = (c.teacher?.fullName || "").toLowerCase();
        const teacherUser = (c.teacher?.username || "").toLowerCase();
        const className = c.name.toLowerCase();
        const gradeText = `khối ${c.grade} grade ${c.grade} ${c.grade}`;

        const match =
          className.includes(q) ||
          subject.includes(q) ||
          teacherName.includes(q) ||
          teacherUser.includes(q) ||
          gradeText.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [list.data, statusFilter, gradeFilter, searchQuery]);

  const joinError = join.error
    ? isApiError(join.error, "JOIN_RATE_LIMITED")
      ? t.tooMany
      : isApiError(join.error, "JOIN_CODE_INVALID")
        ? t.invalidCode
        : join.error
    : null;
  const selectedClass = classId ? list.data?.find((item) => item.id === classId) : undefined;
  const classResources = useQuery<any[]>({
    queryKey: ["class-resources", selectedClass?.id],
    queryFn: () => api(`/classes/${selectedClass!.id}/resources`),
    enabled: Boolean(selectedClass?.id),
  });
  if (classId && list.isLoading) return <PageHeading eyebrow="CLASS SPACE" title={t.opening} description={t.loadingClass} />;
  if (classId && list.isError) return <><PageHeading eyebrow="CLASS SPACE" title={t.loadFailed} description={t.reloadList} /><LoadError query={list} what="Class Space" /><Link to="/classes">{t.backToList}</Link></>;
  if (classId && !selectedClass) return <><PageHeading eyebrow="CLASS SPACE" title={t.notFound} description={t.notMember} /><Link className="student-lesson-open" to="/classes">{t.backToSpace}</Link></>;
  if (classId && selectedClass) {
    const isApproved = selectedClass.enrollmentStatus === "approved" && selectedClass.status !== "ARCHIVED";
    const isPending = selectedClass.enrollmentStatus === "pending";
    const isArchived = selectedClass.status === "ARCHIVED";
    const subject = extractSubject(selectedClass);
    const teacherName = selectedClass.teacher?.fullName || (selectedClass.teacher?.username ? `@${selectedClass.teacher.username}` : t.defaultTeacher);

    const classItems = (classWork.data?.items ?? []).filter((item) => item.classId === selectedClass.id);
    const classLessons = classItems.filter((item) => item.contentType === "lesson");
    const classLabs = (classWork.data?.labs ?? []).filter((item: any) => item.classroom?.id === selectedClass.id).length
      ? (classWork.data?.labs ?? []).filter((item: any) => item.classroom?.id === selectedClass.id)
      : classItems.filter((item) => item.contentType === "lab");
    const classTests = (classWork.data?.tests ?? []).filter((item: any) => item.classroom?.id === selectedClass.id);
    const reviewLessons = classItems.filter((item) => item.contentType === "lesson");
    return (
      <div className="class-space-detail-container">
        <nav className="class-detail-nav" aria-label="Điều hướng lớp học">
          <Link className="class-detail-back-btn" to="/classes">
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{t.classListBack}</span>
          </Link>
        </nav>

        <header className="panel class-detail-hero">
          <div className="class-detail-hero-main">
            <div className="class-detail-pills">
              <span className="student-class-pill subject">{subject}</span>
              <span className="student-class-pill grade">{t.gradeLabel(selectedClass.grade)}</span>
              <Badge tone={isApproved ? "passed" : isPending ? "gold" : "outline"}>
                {isArchived ? t.archived : isApproved ? t.joined : t.waiting}
              </Badge>
            </div>

            <h1 className="class-detail-title">{selectedClass.name}</h1>
            <p className="class-detail-description">{t.classIntro}</p>

            <div className="class-detail-meta-row">
              <div className="class-detail-meta-chip">
                <GraduationCap size={15} aria-hidden="true" className="class-detail-meta-icon" />
                <span><b>{t.teacherLabel}:</b> {teacherName}</span>
              </div>
              {selectedClass.id && (
                <div className="class-detail-meta-chip id-chip">
                  <span><b>{t.classCodeLabel}:</b> <code>{selectedClass.id}</code></span>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="panel class-space-detail-panel">
          {selectedClass.enrollmentStatus !== "approved" ? (
            <div className="class-detail-pending-state">
              <Clock size={32} className="class-detail-pending-icon" />
              <h3>{t.waiting}</h3>
              <p className="muted">{t.pendingLong}</p>
            </div>
          ) : (
            <>
              <div className="tabs class-space-tabs" role="tablist" aria-label={t.tabsLabel}>
                {(
                  [
                    ["lessons", t.tabLessons, classLessons.length, BookOpen],
                    ["labs", t.tabLabs, classLabs.length, FlaskConical],
                    ["tests", t.tabTests, classTests.length, ClipboardCheck],
                    ["resources", t.tabResources, classResources.data?.length ?? 0, Layers],
                  ] as const
                ).map(([tab, label, count, Icon]) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    className={activeTab === tab ? "active" : ""}
                    onClick={() => setActiveTab(tab)}
                  >
                    <Icon size={15} aria-hidden="true" className="tab-btn-icon" />
                    <span>{label}</span>
                    {count !== null && <span className="tab-btn-count">{count}</span>}
                  </button>
                ))}
              </div>

              {activeTab === "lessons" && (
                <section role="tabpanel" aria-label={t.tabLessons} className="class-tab-panel">
                  <div className="class-tab-section-header">
                    <div>
                      <h2>{t.bySubject}</h2>
                      <p className="muted">{t.classSpaceContent}</p>
                    </div>
                  </div>
                  <LoadError query={classWork} what={t.classSpaceContent} />
                  {classWork.isLoading ? (
                    <LessonRowsSkeleton label={commonText().loading} rows={3} />
                  ) : (
                    <SubjectGradeChapterBrowser
                      items={classItems}
                      basePath={`/classes/${encodeURIComponent(selectedClass.id)}/catalog`}
                      rootPath={`/classes/${encodeURIComponent(selectedClass.id)}/catalog`}
                      emptyCopy={t.noClassWork}
                      renderItem={(item) => (
                        <Link
                          className="student-assignment-row"
                          to={`/assignments/${encodeURIComponent(item.id)}`}
                        >
                          <span className="student-assignment-icon-wrap">
                            {item.contentType === "lab" ? (
                              <FlaskConical size={17} aria-hidden="true" />
                            ) : (
                              <BookOpen size={17} aria-hidden="true" />
                            )}
                          </span>
                          <span className="student-assignment-copy">
                            <span className="student-assignment-title-line">
                              <b>{item.title}</b>
                              <span className={`student-content-badge ${item.contentType === "lab" ? "lab" : "lesson"}`}>
                                {item.contentType === "lab" ? t.badgeLab : t.badgeLesson}
                              </span>
                            </span>
                            <div className="student-assignment-meta-row">
                              <span className="student-assignment-meta-text">
                                {item.classroom.name} · {dueLabel(item.dueDate)}
                              </span>
                              {item.overdue && (
                                <span className="student-assignment-overdue-pill">
                                  {t.overdue}
                                </span>
                              )}
                            </div>
                          </span>
                          <ArrowUpRight size={17} className="student-assignment-arrow" />
                        </Link>
                      )}
                    />
                  )}
                </section>
              )}

              {activeTab === "labs" && (
                <section role="tabpanel" aria-label={t.tabLabs} className="class-tab-panel">
                  <div className="class-tab-section-header">
                    <div>
                      <h2>{t.labsTitle}</h2>
                      <p className="muted">{t.labsDesc}</p>
                    </div>
                    <span className="class-tab-count-badge">{t.classStatsLabs(classLabs.length)}</span>
                  </div>
                  <LoadError query={classWork} what={t.tabLabs} />
                  {classLabs.length === 0 && (
                    <div className="class-detail-empty-box">
                      <FlaskConical size={40} className="empty-box-icon lab" aria-hidden="true" />
                      <h3>{t.noLabs}</h3>
                      <p className="muted">{t.noLabsDesc}</p>
                    </div>
                  )}
                  {classLabs.length > 0 && (
                    <div className="class-lab-cards-grid">
                      {classLabs.map((lab: any) => (
                        <Link
                          key={lab.id}
                          className="panel class-lab-card"
                          to={`/assignments/${encodeURIComponent(lab.id)}`}
                        >
                          <div className="class-lab-card-top">
                            <span className="student-class-pill grade">{labCurriculumLabel(lab, lab.subject?.name ?? "KHTN", t.gradeLabel(lab.grade || selectedClass.grade)).grade}</span>
                            <span className="student-class-pill subject">{labCurriculumLabel(lab, lab.subject?.name ?? "KHTN", t.gradeLabel(lab.grade || selectedClass.grade)).subject}</span>
                            {lab.overdue ? (
                              <span className="student-class-overdue-tag">{t.overdue}</span>
                            ) : (
                              <Badge tone="passed">{t.typeLab}</Badge>
                            )}
                          </div>
                          {(lab.thumbnailUrl || labInfo.find((entry) => entry.id === lab.contentId)?.thumbnail)
                            ? <img className="class-lab-source-thumbnail" src={lab.thumbnailUrl || labInfo.find((entry) => entry.id === lab.contentId)!.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling?.removeAttribute("hidden"); }} />
                            : null}
                          <span className="class-assignment-thumbnail-fallback" hidden={Boolean(lab.thumbnailUrl || labInfo.find((entry) => entry.id === lab.contentId)?.thumbnail)} aria-hidden="true"><FlaskConical size={34} /></span>
                          <div className="class-lab-card-main">
                            <div className="class-lab-icon-box">
                              <FlaskConical size={22} aria-hidden="true" />
                            </div>
                            <h3 className="class-lab-card-title">{lab.title}</h3>
                          </div>
                          <div className="class-lab-card-footer">
                            <span className="class-lab-card-meta">
                              <small className="muted">{teacherName}</small>
                              {lab.createdAt && <small className="muted">Giao lúc {formatDateTime(lab.createdAt)}</small>}
                              <small className="muted">{dueLabel(lab.dueDate)}</small>
                            </span>
                            <span className="class-lab-cta">
                              <span>{t.enterLab}</span>
                              <ArrowRight size={14} aria-hidden="true" />
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeTab === "tests" && (
                <section role="tabpanel" aria-label={t.tabTests} className="class-tab-panel">
                  <div className="class-tab-section-header">
                    <div>
                      <h2>{t.testsTitle}</h2>
                      <p className="muted">{t.testsDesc}</p>
                    </div>
                    <span className="class-tab-count-badge">{t.classStatsTests(classTests.length)}</span>
                  </div>
                  <LoadError query={classWork} what={t.tests} />
                  {classTests.map((item: any) => (
                    <Link
                      key={item.id}
                      className="student-assignment-row test-assignment-row"
                      to={`/assignments/${encodeURIComponent(item.id)}`}
                    >
                      <span className="student-assignment-icon-wrap">
                        <ClipboardCheck size={17} aria-hidden="true" />
                      </span>
                      {item.thumbnailUrl && <img className="class-test-thumbnail-img" src={item.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling?.removeAttribute("hidden"); }} />}
                      <span className="class-test-thumbnail" hidden={Boolean(item.thumbnailUrl)} aria-hidden="true"><ClipboardCheck size={30} /></span>
                      <span className="student-assignment-copy">
                        <span className="student-assignment-title-line">
                          <b>{item.title}</b>
                        </span>
                        <div className="student-assignment-meta-row">
                          {item.grade && item.subject?.name && <span className="student-assignment-meta-text">{item.subject.name} · {t.gradeLabel(item.grade)}</span>}
                          <span className="student-assignment-meta-text">{dueLabel(item.dueDate)}</span>
                          {item.testStatus && (
                            <Badge tone={testStatusTone[item.testStatus.status as keyof typeof testStatusTone]}>
                              {testStatusLabel[item.testStatus.status as keyof typeof testStatusLabel]}
                            </Badge>
                          )}
                        </div>
                      </span>
                      <ArrowUpRight size={17} className="student-assignment-arrow" />
                    </Link>
                  ))}
                  {classWork.data && classTests.length === 0 && <Empty>{t.noTests}</Empty>}
                </section>
              )}

              {activeTab === "resources" && (
                <section role="tabpanel" aria-label={t.tabResources} className="class-tab-panel">
                  <div className="class-tab-section-header">
                    <div>
                      <h2>{t.resourcesTitle}</h2>
                      <p className="muted">{t.resourcesDesc}</p>
                    </div>
                  </div>

                  <div className="class-resources-section">
                    <StudentClassResources classId={selectedClass.id} />
                  </div>

                  {reviewLessons.length > 0 && (
                    <div className="class-review-decks-section">
                      <div className="class-tab-section-header in-section">
                        <div>
                          <h3>{t.lessonReviewTitle}</h3>
                          <p className="muted">{t.lessonReviewDesc}</p>
                        </div>
                      </div>

                      <div className="class-review-decks-grid">
                        {reviewLessons.map((item) => (
                          <div key={item.id} className="panel class-review-deck-card">
                            <div className="class-review-deck-icon">
                              <Layers size={20} aria-hidden="true" />
                            </div>
                            <div className="class-review-deck-content">
                              <b>{item.title}</b>
                              <small className="muted">{item.subjectName} · {item.chapter}</small>
                            </div>
                            <Link
                              className={`secondary class-review-deck-btn${reviewId === item.id ? " active-review" : ""}`}
                              to={`?tab=resources&assignmentId=${encodeURIComponent(item.id)}`}
                            >
                              {t.openReviewDeck}
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {reviewId && (
                    <div className="class-active-review-container">
                      <div className="class-active-review-bar">
                        <span>{t.lessonReviewTitle}</span>
                        <Link className="class-close-review-btn" to="?tab=resources">
                          <X size={14} aria-hidden="true" />
                          <span>{t.closeReviewDeck}</span>
                        </Link>
                      </div>
                      <ClassLessonCards key={reviewId} assignmentId={reviewId} />
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </section>
      </div>
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="CLASS SPACE"
        title={t.title}
        description={t.description}
        action={
          <button
            className="primary"
            onClick={() => {
              key.current = idempotencyKey();
              join.reset();
              setResult(null);
              setJoining(true);
            }}
          >
            {t.joinByCode}
          </button>
        }
      />
      {result && (
        <p className="notice" role="status">
          {t.joinResult(result)}
        </p>
      )}
      <LoadError query={list} what={t.classList} />
      {list.isLoading && <ClassCardsSkeleton label={commonText().loading} />}
      {list.data && list.data.length === 0 && <Empty>{t.noClasses}</Empty>}

      {list.data && list.data.length > 0 && (
        <div className="student-class-toolbar">
          <div className="student-class-search-box">
            <Search size={16} aria-hidden="true" className="student-class-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="student-class-search-input"
              aria-label={t.searchPlaceholder}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="student-class-search-clear"
                aria-label="Xóa tìm kiếm"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="student-class-filter-row">
            <div className="student-class-status-chips" role="radiogroup" aria-label={t.allStatus}>
              {(
                [
                  ["ALL", `${t.statusAll} (${list.data.length})`],
                  ["approved", `${t.statusApproved} (${list.data.filter((c) => c.enrollmentStatus === "approved" && c.status !== "ARCHIVED").length})`],
                  ["pending", `${t.statusPending} (${list.data.filter((c) => c.enrollmentStatus === "pending").length})`],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  role="radio"
                  aria-checked={statusFilter === val}
                  className={`student-class-filter-chip${statusFilter === val ? " is-active" : ""}`}
                  onClick={() => setStatusFilter(val)}
                >
                  {label}
                </button>
              ))}
            </div>

            {availableGrades.length > 1 && (
              <div className="student-class-select-wrap">
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                  className="student-class-grade-select"
                  aria-label={t.filterGradeAll}
                >
                  <option value="ALL">{t.filterGradeAll}</option>
                  {availableGrades.map((g) => (
                    <option key={g} value={g}>{t.gradeLabel(g)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {list.data && list.data.length > 0 && (searchQuery || statusFilter !== "ALL" || gradeFilter !== "ALL") && (
        <div className="student-class-active-filters-bar">
          <span className="student-class-result-count">{t.resultCount(filteredClasses.length)}</span>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
              setGradeFilter("ALL");
            }}
            className="student-class-reset-btn"
          >
            <X size={12} aria-hidden="true" />
            <span>{t.clearFilters}</span>
          </button>
        </div>
      )}

      {list.data && list.data.length > 0 && filteredClasses.length === 0 && (
        <div className="student-class-empty-match panel">
          <SearchX size={32} aria-hidden="true" className="student-class-empty-icon" />
          <h3>{t.noMatchTitle}</h3>
          <p>{t.noMatchDesc}</p>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("ALL");
              setGradeFilter("ALL");
            }}
          >
            {t.clearFilters}
          </button>
        </div>
      )}

      <div className="student-class-grid">
        {filteredClasses.map((c) => {
          const isApproved = c.enrollmentStatus === "approved" && c.status !== "ARCHIVED";
          const isPending = c.enrollmentStatus === "pending";
          const isArchived = c.status === "ARCHIVED";
          const subject = extractSubject(c);
          const teacherName = c.teacher?.fullName || (c.teacher?.username ? `@${c.teacher.username}` : t.defaultTeacher);
          const overdueCount = c.assignments.filter((a) => a.overdue).length;

          return (
            <Link
              key={c.id}
              to={`/classes/${encodeURIComponent(c.id)}/catalog`}
              className={`panel student-class-card ${isApproved ? "is-approved" : isPending ? "is-pending" : "is-archived"}`}
            >
              <div className="student-class-card-header">
                <div className="student-class-pill-group">
                  <span className="student-class-pill subject">{subject}</span>
                  <span className="student-class-pill grade">{t.gradeLabel(c.grade)}</span>
                </div>
                <Badge tone={isApproved ? "passed" : isPending ? "gold" : "outline"}>
                  {isArchived ? t.archived : isApproved ? t.joined : t.waiting}
                </Badge>
              </div>

              <h2 className="student-class-card-name" title={c.name}>
                {c.name}
              </h2>

              <div className="student-class-card-meta">
                <div className="student-class-meta-item" title={teacherName}>
                  <GraduationCap size={15} aria-hidden="true" className="student-class-meta-icon" />
                  <span className="student-class-meta-text">{teacherName}</span>
                </div>

                <div className="student-class-meta-item">
                  <ClipboardList size={15} aria-hidden="true" className="student-class-meta-icon" />
                  <span className="student-class-meta-text">
                    {t.assignedCount(c.assignments.length)}
                    {overdueCount > 0 && (
                      <span className="student-class-overdue-tag">
                        {t.overdueWarning(overdueCount)}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div className="student-class-card-footer">
                {isApproved && (
                  <>
                    <span className="student-class-cta-text">{t.openClassSpace}</span>
                    <span className="student-class-cta-icon-box" aria-hidden="true">
                      <ArrowRight size={15} />
                    </span>
                  </>
                )}
                {isPending && (
                  <span className="student-class-pending-hint">
                    <Clock size={14} aria-hidden="true" />
                    <span>{t.pendingShort}</span>
                  </span>
                )}
                {isArchived && (
                  <span className="student-class-archived-hint">
                    {t.archived}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      {reviewId && <ClassLessonCards assignmentId={reviewId} />}
      {joining && (
        <Modal title={t.joinTitle} onClose={() => setJoining(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const code = String(new FormData(e.currentTarget).get("code") ?? "");
              join.mutate(
                { path: "/classes/join", key: key.current, body: { code } },
                {
                  onSuccess: (data) => {
                    setResult({ message: `${data.class.name}: ${data.message}`, pending: data.enrollmentStatus === "pending" });
                    setJoining(false);
                  },
                },
              );
            }}
          >
            <Field
              label={t.joinCode}
              name="code"
              required
              autoComplete="off"
              placeholder="NL-XXXXXX-XXXXXXXXXX"
              maxLength={40}
              onChange={() => {
                // A new code is a new request; retries of the same code keep the key.
                key.current = idempotencyKey();
              }}
            />
            <ErrorBox error={joinError} />
            <button className="primary wide" disabled={join.isPending}>
              {join.isPending ? t.sending : t.join}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
