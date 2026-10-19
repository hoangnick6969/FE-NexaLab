import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, Empty, ErrorBox, PageLoader } from "../../components/ui";
import { testStatusLabel, testStatusTone } from "../../lib/test-status";
import { SubjectGradeChapterBrowser, type HierarchyItem } from "../../components/SubjectGradeChapterBrowser";

type AssignmentItem = HierarchyItem & {
  contentType: string;
  dueDate: string | null;
  overdue: boolean;
  canOpen: boolean;
  classroom: { id: string; name: string };
  notice?: string | null;
  testStatus?: { status: string; dueSoon?: boolean; extended?: boolean } | null;
};

export function StudentAssignments() {
  const query = useQuery<any[]>({ queryKey: ["assignments"], queryFn: () => api("/assignments") });
  if (query.isLoading) return <PageLoader message="Đang tải bài tập…" />;
  if (query.error) return <div><ErrorBox error={query.error} /><button onClick={() => query.refetch()}>Thử lại</button></div>;
  const assignments = (query.data ?? []) as any[];
  const dueSoon = assignments.filter((item) => item.testStatus?.dueSoon);
  const hierarchical = assignments.filter((item) => item.canOpen && item.contentType !== "test" && item.subject && item.grade).map((item) => ({
    ...item,
    subjectId: item.subject.id,
    subjectName: item.subject.name,
    grade: Number(item.grade),
    chapter: item.chapter || "Chưa phân chương",
    itemOrder: item.curriculumOrder ?? item.topicOrder,
  })) as AssignmentItem[];
  const tests = assignments.filter((item) => item.contentType === "test");
  const closed = assignments.filter((item) => item.canOpen === false);
  return (
    <>
      <PageHeading eyebrow="LUYỆN TẬP VÀ THỰC HÀNH" title="Bài tập" description="Chọn môn và khối, rồi mở chương để xem bài được giao." />
      {dueSoon.length > 0 && (
        <p className="notice" role="status">Có {dueSoon.length} bài kiểm tra sắp đến hạn trong 24 giờ: {dueSoon.map((item: any) => item.title).join(", ")}.</p>
      )}
      <SubjectGradeChapterBrowser
        items={hierarchical}
        basePath="/assignments/catalog"
        rootPath="/assignments"
        emptyCopy="Chưa có bài học hoặc thực hành được giao theo môn học."
        renderItem={(item) => <Link className="student-assignment-row" to={`/assignments/${encodeURIComponent(item.id)}`}>
          <BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.classroom.name} · {item.dueDate ? `Hạn ${new Date(item.dueDate).toLocaleDateString("vi-VN")}` : "Không có hạn nộp"}</small>{item.overdue && <small className="student-overdue">Đã quá hạn · vẫn có thể làm bài</small>}</span><ArrowUpRight size={17} />
        </Link>}
      />
      {tests.length > 0 && <section className="student-closed-assignments" aria-labelledby="assigned-tests-heading">
        <h2 id="assigned-tests-heading">Bài kiểm tra</h2>
        <div className="student-list student-assignment-list">{tests.filter((item) => item.canOpen !== false).map((item) => <Link key={item.id} className="student-assignment-row" to={`/assignments/${encodeURIComponent(item.id)}`}>
          <BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.classroom.name} · {item.dueDate ? `Hạn ${new Date(item.dueDate).toLocaleString("vi-VN")}` : "Không có hạn nộp"}</small>{item.testStatus && <Badge tone={testStatusTone[item.testStatus.status as keyof typeof testStatusTone]}>{testStatusLabel[item.testStatus.status as keyof typeof testStatusLabel]}{item.testStatus.extended ? " · đã dời hạn" : ""}</Badge>}</span><ArrowUpRight size={17} />
        </Link>)}</div>
      </section>}
      {closed.length > 0 && <section className="student-closed-assignments" aria-labelledby="closed-assignment-heading">
        <h2 id="closed-assignment-heading">Nội dung đã lưu trữ</h2>
        {closed.map((item) => <article key={item.id} className="student-assignment-row" aria-disabled="true"><BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.notice ?? "Nội dung hiện không thể mở."}</small></span></article>)}
      </section>}
    </>
  );
}
