import { useRef, useState } from "react";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, idempotencyKey, isApiError } from "../../lib/api";
import { Badge, CardSkeleton, Empty, ErrorBox, Field, Modal } from "../../components/ui";
import { PageHeading } from "../../components/PageHeading";
import { StudentClassResources } from "./ClassSpaceResources";
import { type StudentClass } from "./class-types";
import { LoadError, dueLabel, useMutate } from "./class-ui";
import { SubjectGradeChapterBrowser, type HierarchyItem } from "../../components/SubjectGradeChapterBrowser";
import { testStatusLabel, testStatusTone } from "../../lib/test-status";
import { defineText } from "../../i18n";
import { commonText } from "../../i18n/common";

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
    classListBack: "← Danh sách lớp",
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
    openClassSpace: "Mở Class Space",
    joinTitle: "Tham gia lớp",
    joinCode: "Mã tham gia lớp",
    sending: "Đang gửi…",
    join: "Tham gia",
    joinResult: (r: { message: string; pending: boolean }) => r.message,
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
    classListBack: "← Class list",
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
  },
});
const t = text();

type ClassWork = HierarchyItem & {
  classId: string;
  classroom: { id: string; name: string };
  dueDate: string | null;
  overdue: boolean;
};

async function readStudentClassWork() {
  const assignments = await api<any[]>("/assignments");
  const eligible = assignments.filter((assignment) => assignment.canOpen !== false);
  return {
    items: eligible.flatMap((assignment) => {
      const subject = assignment.subject;
      if (assignment.contentType === "test" || !subject || !assignment.grade) return [];
      return [{
        id: assignment.id,
        title: assignment.title,
        classId: assignment.classroom.id,
        classroom: assignment.classroom,
        subjectId: subject.id,
        subjectName: subject.name,
        grade: Number(assignment.grade),
        chapter: assignment.chapter || commonText().noChapter,
        chapterOrder: assignment.chapterOrder,
        itemOrder: assignment.curriculumOrder ?? assignment.topicOrder,
        dueDate: assignment.dueDate,
        overdue: assignment.overdue,
      }];
    }) as ClassWork[],
    tests: eligible.filter((assignment) => assignment.contentType === "test"),
  };
}

type SpaceTab = "lessons" | "tests" | "resources";

export function StudentClasses() {
  const { classId } = useParams();
  const [joining, setJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<SpaceTab>("lessons");
  const [result, setResult] = useState<{ message: string; pending: boolean } | null>(null);
  const key = useRef(idempotencyKey());
  const list = useQuery<StudentClass[]>({ queryKey: ["classes"], queryFn: () => api("/classes") });
  const classWork = useQuery({ queryKey: ["student-class-space-content"], queryFn: readStudentClassWork, enabled: Boolean(classId) });
  const join = useMutate<{ enrollmentStatus: string; message: string; class: { name: string } }>();
  const joinError = join.error
    ? isApiError(join.error, "JOIN_RATE_LIMITED")
      ? t.tooMany
      : isApiError(join.error, "JOIN_CODE_INVALID")
        ? t.invalidCode
        : join.error
    : null;
  const selectedClass = classId ? list.data?.find((item) => item.id === classId) : undefined;
  if (classId && list.isLoading) return <PageHeading eyebrow="CLASS SPACE" title={t.opening} description={t.loadingClass} />;
  if (classId && list.isError) return <><PageHeading eyebrow="CLASS SPACE" title={t.loadFailed} description={t.reloadList} /><LoadError query={list} what="Class Space" /><Link to="/classes">{t.backToList}</Link></>;
  if (classId && !selectedClass) return <><PageHeading eyebrow="CLASS SPACE" title={t.notFound} description={t.notMember} /><Link className="student-lesson-open" to="/classes">{t.backToSpace}</Link></>;
  if (classId && selectedClass) return <>
    <PageHeading eyebrow={t.eyebrowGrade(selectedClass.grade)} title={selectedClass.name} description={t.classIntro} />
    <Link className="hierarchy-back-link" to="/classes">{t.classListBack}</Link>
    <section className="panel class-space-detail-panel">
      <Badge tone={selectedClass.enrollmentStatus === "approved" ? "" : "outline"}>{selectedClass.status === "ARCHIVED" ? t.archived : selectedClass.enrollmentStatus === "approved" ? t.joined : t.waiting}</Badge>
      {selectedClass.enrollmentStatus !== "approved" ? <p className="muted">{t.pendingLong}</p> : <>
        <div className="tabs class-space-tabs" role="tablist" aria-label={t.tabsLabel}>
          {([["lessons", t.tabLessons], ["tests", t.tabTests], ["resources", t.tabResources]] as const).map(([tab, label]) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{label}</button>)}
        </div>
        {activeTab === "lessons" && <section role="tabpanel" aria-label={t.tabLessons}>
          <h2>{t.bySubject}</h2><LoadError query={classWork} what={t.classSpaceContent} />
          {classWork.isLoading ? <CardSkeleton count={2} /> : <SubjectGradeChapterBrowser items={(classWork.data?.items ?? []).filter((item) => item.classId === selectedClass.id)} basePath={`/classes/${encodeURIComponent(selectedClass.id)}/catalog`} rootPath={`/classes/${encodeURIComponent(selectedClass.id)}/catalog`} emptyCopy={t.noClassWork} renderItem={(item) => <Link className="student-assignment-row" to={`/assignments/${encodeURIComponent(item.id)}`}><BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.classroom.name} · {dueLabel(item.dueDate)}</small>{item.overdue && <small className="student-overdue">{t.overdue}</small>}</span><ArrowUpRight size={17} /></Link>} />}
        </section>}
        {activeTab === "tests" && <section role="tabpanel" aria-label={t.tabTests}><h2>{t.assignedTests}</h2><LoadError query={classWork} what={t.tests} />
          {classWork.data?.tests.filter((item) => item.classroom.id === selectedClass.id).map((item: any) => <Link key={item.id} className="student-assignment-row" to={`/assignments/${encodeURIComponent(item.id)}`}><BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{dueLabel(item.dueDate)}</small>{item.testStatus && <Badge tone={testStatusTone[item.testStatus.status as keyof typeof testStatusTone]}>{testStatusLabel[item.testStatus.status as keyof typeof testStatusLabel]}</Badge>}</span><ArrowUpRight size={17} /></Link>)}
          {classWork.data && classWork.data.tests.filter((item) => item.classroom.id === selectedClass.id).length === 0 && <Empty>{t.noTests}</Empty>}
        </section>}
        {activeTab === "resources" && <section role="tabpanel" aria-label={t.tabResources}><StudentClassResources classId={selectedClass.id} /></section>}
      </>}
    </section>
  </>;
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
      {list.isLoading && <CardSkeleton count={2} />}
      {list.data && list.data.length === 0 && <Empty>{t.noClasses}</Empty>}
      {list.data?.map((c) => (
          <section className="panel student-class-card" key={c.id}>
          <div className="section-heading">
            <h2><Link to={`/classes/${encodeURIComponent(c.id)}/catalog`}>{c.name}</Link></h2>
            <Badge tone={c.enrollmentStatus === "approved" ? "" : "outline"}>
              {c.status === "ARCHIVED" ? t.archived : c.enrollmentStatus === "approved" ? t.joined : t.waiting}
            </Badge>
          </div>
          {c.enrollmentStatus === "pending" && <p className="muted">{t.pendingShort}</p>}
          {c.enrollmentStatus === "approved" && <p className="muted">{t.assignedCount(c.assignments.length)} · <Link to={`/classes/${encodeURIComponent(c.id)}/catalog`}>{t.openClassSpace} <ArrowUpRight size={14} /></Link></p>}
        </section>
      ))}
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
