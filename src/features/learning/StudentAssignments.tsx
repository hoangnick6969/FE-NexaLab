import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Empty, ErrorBox, PageLoader } from "../../components/ui";

export function StudentAssignments() {
  const query = useQuery<any[]>({ queryKey: ["assignments"], queryFn: () => api("/assignments") });
  if (query.isLoading) return <PageLoader message="Đang tải bài tập…" />;
  if (query.error) return <div><ErrorBox error={query.error} /><button onClick={() => query.refetch()}>Thử lại</button></div>;
  return (
    <>
      <PageHeading eyebrow="LUYỆN TẬP VÀ THỰC HÀNH" title="Bài tập" description="Bài kiểm tra và hoạt động thực hành sẽ mở theo tiến độ bài học của em." />
      {query.data?.length ? <div className="student-list student-assignment-list">
        {query.data.map((item: any) => item.canOpen === false ? (
          <article key={item.id} className="student-assignment-row" aria-disabled="true">
            <BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.notice}</small></span>
          </article>
        ) : (
          <Link key={item.id} className="student-assignment-row" to={`/assignments/${item.id}`}>
            <BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.classroom.name} · {item.dueDate ? `Hạn ${new Date(item.dueDate).toLocaleDateString("vi-VN")}` : "Không có hạn nộp"}</small>{item.overdue && <small className="student-overdue">Đã quá hạn · vẫn có thể làm bài</small>}</span><ArrowUpRight size={17} />
          </Link>
        ))}
      </div> : <Empty>Chưa có bài tập được giao. Bài học của em vẫn có trong mục Bài học.</Empty>}
    </>
  );
}
