import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, Empty, ErrorBox, PageLoader } from "../../components/ui";
import { testStatusLabel, testStatusTone } from "../../lib/test-status";

export function StudentAssignments() {
  const query = useQuery<any[]>({ queryKey: ["assignments"], queryFn: () => api("/assignments") });
  if (query.isLoading) return <PageLoader message="Đang tải bài tập…" />;
  const dueSoon = query.data?.filter((item: any) => item.testStatus?.dueSoon) ?? [];
  if (query.error) return <div><ErrorBox error={query.error} /><button onClick={() => query.refetch()}>Thử lại</button></div>;
  return (
    <>
      <PageHeading eyebrow="LUYỆN TẬP VÀ THỰC HÀNH" title="Bài tập" description="Bài kiểm tra và hoạt động thực hành sẽ mở theo tiến độ bài học của em." />
      {dueSoon.length > 0 && (
        <p className="notice" role="status">Có {dueSoon.length} bài kiểm tra sắp đến hạn trong 24 giờ: {dueSoon.map((item: any) => item.title).join(", ")}.</p>
      )}
      {query.data?.length ? <div className="student-list student-assignment-list">
        {query.data.map((item: any) => item.canOpen === false ? (
          <article key={item.id} className="student-assignment-row" aria-disabled="true">
            <BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.notice}</small></span>
          </article>
        ) : (
          <Link key={item.id} className="student-assignment-row" to={`/assignments/${item.id}`}>
            <BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.contentType === "test" ? "Bài kiểm tra · " : ""}{item.classroom.name} · {item.dueDate ? `Hạn ${item.contentType === "test" ? new Date(item.dueDate).toLocaleString("vi-VN") : new Date(item.dueDate).toLocaleDateString("vi-VN")}` : "Không có hạn nộp"}</small>{item.testStatus ? <Badge tone={testStatusTone[item.testStatus.status as keyof typeof testStatusTone]}>{testStatusLabel[item.testStatus.status as keyof typeof testStatusLabel]}{item.testStatus.extended ? " · đã dời hạn" : ""}</Badge> : item.overdue && <small className="student-overdue">Đã quá hạn · vẫn có thể làm bài</small>}</span><ArrowUpRight size={17} />
          </Link>
        ))}
      </div> : <Empty>Chưa có bài tập được giao. Bài học của em vẫn có trong mục Bài học.</Empty>}
    </>
  );
}
