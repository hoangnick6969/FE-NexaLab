import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Empty, ErrorBox, PageLoader } from "../../components/ui";
import { SubjectGradeChapterBrowser, type HierarchyItem } from "../../components/SubjectGradeChapterBrowser";

type AssignmentSummary = {
  id: string; title: string; contentId: string; contentType: string; dueDate: string | null;
  overdue: boolean; canOpen: boolean; classroom: { id: string; name: string }; notice?: string | null;
  subject?: { id: string; name: string }; grade?: number; chapter?: string | null; topic?: string | null;
  curriculumOrder?: number | null; chapterOrder?: number | null; topicOrder?: number | null;
};

async function readStudentAssignments() {
  const assignments = await api<AssignmentSummary[]>("/assignments");
  const items = assignments.filter((item) => item.canOpen).flatMap((assignment) => {
    const subject = assignment.subject;
    if (!subject || !assignment.grade) return [];
    return [{
      ...assignment,
      id: assignment.id,
      title: assignment.title,
      subjectId: subject.id,
      subjectName: subject.name,
      grade: assignment.grade,
      chapter: assignment.chapter || "Chưa phân chương",
      chapterOrder: assignment.chapterOrder,
      itemOrder: assignment.curriculumOrder ?? assignment.topicOrder,
      contentType: assignment.contentType,
    }];
  });
  return { assignments, items };
}

export function StudentAssignments() {
  const query = useQuery({ queryKey: ["student-assignment-hierarchy"], queryFn: readStudentAssignments });
  if (query.isLoading) return <PageLoader message="Đang tải bài tập…" />;
  if (query.error) return <div><ErrorBox error={query.error} /><button onClick={() => query.refetch()}>Thử lại</button></div>;
  if (!query.data) return <Empty>Chưa có dữ liệu bài tập.</Empty>;
  const unavailable = query.data.assignments.filter((item) => !item.canOpen);
  return (
    <>
      <PageHeading eyebrow="LUYỆN TẬP VÀ THỰC HÀNH" title="Bài tập" description="Chọn môn và khối, rồi mở chương để xem bài được giao." />
      <SubjectGradeChapterBrowser
        items={query.data.items as Array<AssignmentSummary & HierarchyItem>}
        basePath="/assignments/catalog"
        rootPath="/assignments"
        emptyCopy="Chưa có bài tập được giao. Bài học chung vẫn có trong mục Bài học."
        renderItem={(item) => <Link className="student-assignment-row" to={`/assignments/${encodeURIComponent(item.id)}`}>
          <BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.classroom.name} · {item.dueDate ? `Hạn ${new Date(item.dueDate).toLocaleDateString("vi-VN")}` : "Không có hạn nộp"}</small>{item.overdue && <small className="student-overdue">Đã quá hạn · vẫn có thể làm bài</small>}</span><ArrowUpRight size={17} />
        </Link>}
      />
      {unavailable.length > 0 && <section className="student-closed-assignments" aria-labelledby="closed-assignment-heading">
        <h2 id="closed-assignment-heading">Nội dung đã lưu trữ</h2>
        {unavailable.map((item) => <article key={item.id} className="student-assignment-row" aria-disabled="true">
          <BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.notice ?? "Nội dung hiện không thể mở."}</small></span>
        </article>)}
      </section>}
    </>
  );
}
