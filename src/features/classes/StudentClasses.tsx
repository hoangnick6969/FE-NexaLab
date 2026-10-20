import { useRef, useState } from "react";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, idempotencyKey, isApiError } from "../../lib/api";
import { Badge, CardSkeleton, Empty, ErrorBox, Field, Modal } from "../../components/ui";
import { PageHeading } from "../../components/PageHeading";
import { ClassLessonCards } from "./ClassLessonCards";
import { StudentClassResources } from "./ClassSpaceResources";
import { type StudentClass } from "./class-types";
import { LoadError, dueLabel, useMutate } from "./class-ui";
import { SubjectGradeChapterBrowser, type HierarchyItem } from "../../components/SubjectGradeChapterBrowser";
import { testStatusLabel, testStatusTone } from "../../lib/test-status";

type ClassWork = HierarchyItem & {
  classId: string;
  contentType: string;
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
        contentType: assignment.contentType,
        classroom: assignment.classroom,
        subjectId: subject.id,
        subjectName: subject.name,
        grade: Number(assignment.grade),
        chapter: assignment.chapter || "Chưa phân chương",
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
  const [params, setParams] = useSearchParams();
  const activeTab: SpaceTab = params.get("tab") === "resources" ? "resources" : params.get("tab") === "tests" ? "tests" : "lessons";
  const setActiveTab = (tab: SpaceTab) => setParams((previous) => { previous.set("tab", tab); return previous; });
  const reviewId = params.get("assignmentId");
  const [result, setResult] = useState<{ message: string; pending: boolean } | null>(null);
  const key = useRef(idempotencyKey());
  const list = useQuery<StudentClass[]>({ queryKey: ["classes"], queryFn: () => api("/classes") });
  const classWork = useQuery({ queryKey: ["student-class-space-content"], queryFn: readStudentClassWork, enabled: Boolean(classId) });
  const join = useMutate<{ enrollmentStatus: string; message: string; class: { name: string } }>();
  const joinError = join.error
    ? isApiError(join.error, "JOIN_RATE_LIMITED")
      ? "Bạn đã thử quá nhiều lần. Hãy thử lại sau 15 phút."
      : isApiError(join.error, "JOIN_CODE_INVALID")
        ? "Mã lớp không hợp lệ. Hãy kiểm tra lại với giáo viên."
        : join.error
    : null;
  const selectedClass = classId ? list.data?.find((item) => item.id === classId) : undefined;
  if (classId && list.isLoading) return <PageHeading eyebrow="CLASS SPACE" title="Đang mở lớp…" description="Đang tải nội dung lớp." />;
  if (classId && list.isError) return <><PageHeading eyebrow="CLASS SPACE" title="Không tải được lớp" description="Hãy thử tải lại danh sách lớp." /><LoadError query={list} what="Class Space" /><Link to="/classes">Quay lại danh sách lớp</Link></>;
  if (classId && !selectedClass) return <><PageHeading eyebrow="CLASS SPACE" title="Không tìm thấy lớp" description="Lớp này không nằm trong danh sách lớp em tham gia." /><Link className="student-lesson-open" to="/classes">Quay lại Class Space</Link></>;
  if (classId && selectedClass) return <>
    <PageHeading eyebrow={`CLASS SPACE · KHỐI ${selectedClass.grade}`} title={selectedClass.name} description="Không gian học tập riêng của lớp." />
    <Link className="hierarchy-back-link" to="/classes">← Danh sách lớp</Link>
    <section className="panel class-space-detail-panel">
      <Badge tone={selectedClass.enrollmentStatus === "approved" ? "" : "outline"}>{selectedClass.status === "ARCHIVED" ? "Lớp đã lưu trữ" : selectedClass.enrollmentStatus === "approved" ? "Đã vào lớp" : "Chờ giáo viên duyệt"}</Badge>
      {selectedClass.enrollmentStatus !== "approved" ? <p className="muted">Yêu cầu của em đang chờ giáo viên duyệt. Nội dung lớp sẽ mở sau khi được duyệt.</p> : <>
        <div className="tabs class-space-tabs" role="tablist" aria-label="Nội dung Class Space">
          {([["lessons", "Môn học và bài được giao"], ["tests", "Bài kiểm tra"], ["resources", "Tài nguyên lớp"]] as const).map(([tab, label]) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{label}</button>)}
        </div>
        {activeTab === "lessons" && <section role="tabpanel" aria-label="Môn học và bài được giao">
          <h2>Nội dung theo môn học</h2><LoadError query={classWork} what="nội dung Class Space" />
          {classWork.isLoading ? <CardSkeleton count={2} /> : <SubjectGradeChapterBrowser items={(classWork.data?.items ?? []).filter((item) => item.classId === selectedClass.id)} basePath={`/classes/${encodeURIComponent(selectedClass.id)}/catalog`} rootPath={`/classes/${encodeURIComponent(selectedClass.id)}/catalog`} emptyCopy="Lớp này hiện chưa có nội dung được giao." renderItem={(item) => <Link className="student-assignment-row" to={`/assignments/${encodeURIComponent(item.id)}`}><BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.classroom.name} · {dueLabel(item.dueDate)}</small>{item.overdue && <small className="student-overdue">Đã quá hạn · vẫn có thể học</small>}</span><ArrowUpRight size={17} /></Link>} />}
        </section>}
        {activeTab === "tests" && <section role="tabpanel" aria-label="Bài kiểm tra"><h2>Bài kiểm tra được giao</h2><LoadError query={classWork} what="bài kiểm tra" />
          {classWork.data?.tests.filter((item) => item.classroom.id === selectedClass.id).map((item: any) => <Link key={item.id} className="student-assignment-row" to={`/assignments/${encodeURIComponent(item.id)}`}><BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{dueLabel(item.dueDate)}</small>{item.testStatus && <Badge tone={testStatusTone[item.testStatus.status as keyof typeof testStatusTone]}>{testStatusLabel[item.testStatus.status as keyof typeof testStatusLabel]}</Badge>}</span><ArrowUpRight size={17} /></Link>)}
          {classWork.data && classWork.data.tests.filter((item) => item.classroom.id === selectedClass.id).length === 0 && <Empty>Chưa có bài kiểm tra được giao trong lớp này.</Empty>}
        </section>}
        {activeTab === "resources" && <section role="tabpanel" aria-label="Tài nguyên lớp"><StudentClassResources classId={selectedClass.id} />{classWork.data?.items.filter((item) => item.classId === selectedClass.id && item.contentType === "lesson").map((item) => <p key={item.id}><Link className="secondary" to={`?tab=resources&assignmentId=${encodeURIComponent(item.id)}`}>Ôn thẻ · {item.title}</Link></p>)}{reviewId && <ClassLessonCards key={reviewId} assignmentId={reviewId} />}</section>}
      </>}
    </section>
  </>;
  return (
    <>
      <PageHeading
        eyebrow="CLASS SPACE"
        title="Class Space của em"
        description="Xem các lớp em tham gia, trạng thái thành viên và bài được giao."
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
            Tham gia bằng mã
          </button>
        }
      />
      {result && (
        <p className="notice" role="status">
          {result.message}
        </p>
      )}
      <LoadError query={list} what="danh sách lớp" />
      {list.isLoading && <CardSkeleton count={2} />}
      {list.data && list.data.length === 0 && <Empty>Em chưa tham gia lớp nào. Hãy nhập mã lớp thầy cô gửi.</Empty>}
      {list.data?.map((c) => (
          <section className="panel student-class-card" key={c.id}>
          <div className="section-heading">
            <h2><Link to={`/classes/${encodeURIComponent(c.id)}/catalog`}>{c.name}</Link></h2>
            <Badge tone={c.enrollmentStatus === "approved" ? "" : "outline"}>
              {c.status === "ARCHIVED" ? "Lớp đã lưu trữ" : c.enrollmentStatus === "approved" ? "Đã vào lớp" : "Chờ giáo viên duyệt"}
            </Badge>
          </div>
          {c.enrollmentStatus === "pending" && <p className="muted">Yêu cầu của em đang chờ giáo viên duyệt.</p>}
          {c.enrollmentStatus === "approved" && <p className="muted">{c.assignments.length} bài được giao · <Link to={`/classes/${encodeURIComponent(c.id)}/catalog`}>Mở Class Space <ArrowUpRight size={14} /></Link></p>}
        </section>
      ))}
      {reviewId && <ClassLessonCards assignmentId={reviewId} />}
    {joining && (
        <Modal title="Tham gia lớp" onClose={() => setJoining(false)}>
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
              label="Mã tham gia lớp"
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
              {join.isPending ? "Đang gửi…" : "Tham gia"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
