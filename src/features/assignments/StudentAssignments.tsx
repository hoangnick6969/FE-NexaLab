import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, ErrorBox, PageLoader } from "../../components/ui";
import { testStatusLabel, testStatusTone } from "../../lib/test-status";
import { SubjectGradeChapterBrowser, type HierarchyItem } from "../../components/SubjectGradeChapterBrowser";
import { defineText, formatDate, formatDateTime } from "../../i18n";
import { commonText } from "../../i18n/common";

const text = defineText({
  vi: {
    loading: "Đang tải bài tập…",
    retry: "Thử lại",
    eyebrow: "LUYỆN TẬP VÀ THỰC HÀNH",
    title: "Bài tập",
    description: "Chọn môn và khối, rồi mở chương để xem bài được giao.",
    dueSoon: (n: number, titles: string) => `Có ${n} bài kiểm tra sắp đến hạn trong 24 giờ: ${titles}.`,
    itemLabel: "bài được giao",
    emptyUngrouped: "Chưa có bài nào được xếp vào mục lục môn học.",
    emptyAll: "Chưa có bài được giao theo môn học.",
    test: "Bài kiểm tra",
    extended: " · đã dời hạn",
    overdue: "Đã quá hạn · vẫn có thể làm bài",
    ungroupedTitle: "Bài kiểm tra chưa xếp theo môn",
    ungroupedBody: "Các bài này vẫn mở được, nhưng chưa có liên kết môn/chương để đưa vào mục lục.",
    archived: "Nội dung đã lưu trữ",
    unavailable: "Nội dung hiện không thể mở.",
  },
  en: {
    loading: "Loading assignments…",
    retry: "Try again",
    eyebrow: "PRACTICE",
    title: "Assignments",
    description: "Choose a subject and grade, then open a chapter to see assigned work.",
    dueSoon: (n: number, titles: string) => `${n} ${n === 1 ? "test is" : "tests are"} due within 24 hours: ${titles}.`,
    itemLabel: "assigned items",
    emptyUngrouped: "Nothing is filed under a subject index yet.",
    emptyAll: "No work is assigned by subject yet.",
    test: "Test",
    extended: " · extended",
    overdue: "Overdue · still open",
    ungroupedTitle: "Tests not filed by subject",
    ungroupedBody: "These still open, but they have no subject or chapter link for the index.",
    archived: "Archived content",
    unavailable: "This content cannot be opened right now.",
  },
});

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
  const t = text();
  const query = useQuery<any[]>({ queryKey: ["assignments"], queryFn: () => api("/assignments"), staleTime: 15_000 });
  if (query.isLoading) return <PageLoader message={t.loading} />;
  if (query.error) return <div><ErrorBox error={query.error} /><button onClick={() => query.refetch()}>{t.retry}</button></div>;
  const assignments = (query.data ?? []) as any[];
  const dueSoon = assignments.filter((item) => item.testStatus?.dueSoon);
  const hierarchical = assignments.filter((item) => item.canOpen && item.subject && item.grade).map((item) => ({
    ...item,
    subjectId: item.subject.id,
    subjectName: item.subject.name,
    grade: Number(item.grade),
    chapter: item.chapter || commonText().noChapter,
    itemOrder: item.curriculumOrder ?? item.topicOrder,
  })) as AssignmentItem[];
  const tests = assignments.filter((item) => item.contentType === "test");
  const ungroupedTests = tests.filter((item) => item.canOpen !== false && (!item.subject || !item.grade));
  const closed = assignments.filter((item) => item.canOpen === false);
  return (
    <>
      <PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />
      {dueSoon.length > 0 && (
        <p className="notice" role="status">{t.dueSoon(dueSoon.length, dueSoon.map((item: any) => item.title).join(", "))}</p>
      )}
      <SubjectGradeChapterBrowser
        items={hierarchical}
        basePath="/assignments/catalog"
        rootPath="/assignments"
        itemLabel={t.itemLabel}
        emptyCopy={ungroupedTests.length ? t.emptyUngrouped : t.emptyAll}
        renderItem={(item) => <Link className="student-assignment-row" to={`/assignments/${encodeURIComponent(item.id)}`}>
          <BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.classroom.name} · {item.dueDate ? commonText().due(formatDate(item.dueDate)) : commonText().noDueDate}</small>{item.contentType === "test" && <Badge tone="outline">{t.test}</Badge>}{item.testStatus && <Badge tone={testStatusTone[item.testStatus.status as keyof typeof testStatusTone]}>{testStatusLabel[item.testStatus.status as keyof typeof testStatusLabel]}{item.testStatus.extended ? t.extended : ""}</Badge>}{item.overdue && <small className="student-overdue">{t.overdue}</small>}</span><ArrowUpRight size={17} />
        </Link>}
      />
      {ungroupedTests.length > 0 && <section className="student-closed-assignments" aria-labelledby="ungrouped-tests-heading">
        <h2 id="ungrouped-tests-heading">{t.ungroupedTitle}</h2>
        <p className="hierarchy-empty">{t.ungroupedBody}</p>
        <div className="student-list student-assignment-list">{ungroupedTests.map((item) => <Link key={item.id} className="student-assignment-row" to={`/assignments/${encodeURIComponent(item.id)}`}>
          <BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.classroom.name} · {item.dueDate ? commonText().due(formatDateTime(item.dueDate)) : commonText().noDueDate}</small><Badge tone="outline">{t.test}</Badge>{item.testStatus && <Badge tone={testStatusTone[item.testStatus.status as keyof typeof testStatusTone]}>{testStatusLabel[item.testStatus.status as keyof typeof testStatusLabel]}{item.testStatus.extended ? t.extended : ""}</Badge>}</span><ArrowUpRight size={17} />
        </Link>)}</div>
      </section>}
      {closed.length > 0 && <section className="student-closed-assignments" aria-labelledby="closed-assignment-heading">
        <h2 id="closed-assignment-heading">{t.archived}</h2>
        {closed.map((item) => <article key={item.id} className="student-assignment-row" aria-disabled="true"><BookOpen size={18} /><span className="student-assignment-copy"><b>{item.title}</b><small>{item.notice ?? t.unavailable}</small></span></article>)}
      </section>}
    </>
  );
}
