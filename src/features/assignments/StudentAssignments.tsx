import { useQuery } from "@tanstack/react-query";
import { Archive, ArrowUpRight, BookOpen, ClipboardCheck, Clock3, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { Badge, ErrorBox, PageLoader } from "../../components/ui";
import { testStatusLabel, testStatusTone } from "../../lib/test-status";
import { SubjectGradeChapterBrowser, type HierarchyItem } from "../../components/SubjectGradeChapterBrowser";
import { defineText, formatDate, formatDateTime } from "../../i18n";
import { commonText } from "../../i18n/common";
import { labInfo } from "../labs/lab-info";
import { labCurriculumMetadata } from "../labs/lab-curriculum-label";
import "../classes/class-resource-preview.css";

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
    totalAssigned: (n: number) => `${n} bài được giao`,
    totalTests: (n: number) => `${n} bài kiểm tra`,
    overdueCount: (n: number) => `${n} quá hạn`,
    badgeLesson: "Bài học lý thuyết",
    badgeLab: "Thí nghiệm ảo",
    badgeTest: "Bài kiểm tra",
    teacher: "GV",
    assignedAt: (date: string) => `Giao lúc ${date}`,
    badgeWritten: "Bài tự luận",
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
    totalAssigned: (n: number) => `${n} ${n === 1 ? "assigned item" : "assigned items"}`,
    totalTests: (n: number) => `${n} ${n === 1 ? "test" : "tests"}`,
    overdueCount: (n: number) => `${n} overdue`,
    badgeLesson: "Theory lesson",
    badgeLab: "Virtual lab",
    badgeTest: "Assessment",
    teacher: "Teacher",
    assignedAt: (date: string) => `Assigned ${date}`,
    badgeWritten: "Written task",
  },
});

type AssignmentItem = HierarchyItem & {
  contentId: string;
  createdAt: string;
  contentType: string;
  thumbnailUrl?: string | null;
  dueDate: string | null;
  overdue: boolean;
  canOpen: boolean;
  classroom: { id: string; name: string; teacher?: { fullName?: string | null; username?: string | null } | null };
  notice?: string | null;
  testStatus?: { status: string; dueSoon?: boolean; extended?: boolean } | null;
  writtenStatus?: { status: string; dueSoon?: boolean; extended?: boolean } | null;
};

export function StudentAssignments() {
  const t = text();
  const query = useQuery<any[]>({ queryKey: ["assignments"], queryFn: () => api("/assignments"), staleTime: 15_000 });
  if (query.isLoading) return <PageLoader message={t.loading} />;
  if (query.error) return <div><ErrorBox error={query.error} /><button onClick={() => query.refetch()}>{t.retry}</button></div>;
  const assignments = (query.data ?? []) as any[];
  const dueSoon = assignments.filter((item) => (item.testStatus ?? item.writtenStatus)?.dueSoon);
  const overdueItems = assignments.filter((item) => item.overdue);
  const hierarchical = assignments.filter((item) => item.canOpen && item.subject && item.grade).map((item) => ({
    ...item,
    subjectId: item.contentType === "lab" ? labCurriculumMetadata(item).subjectId : item.subject.id,
    subjectName: item.contentType === "lab" ? labCurriculumMetadata(item).subjectName : item.subject.name,
    grade: Number(item.contentType === "lab" ? labCurriculumMetadata(item).grade : item.grade),
    chapter: item.chapter || commonText().noChapter,
    itemOrder: item.curriculumOrder ?? item.topicOrder,
    thumbnail: item.contentType === "lab" ? labInfo.find((lab) => lab.id === item.contentId)?.thumbnail : undefined,
  })) as AssignmentItem[];
  const tests = assignments.filter((item) => item.contentType === "test" || item.contentType === "written");
  const ungroupedTests = tests.filter((item) => item.canOpen !== false && (!item.subject || !item.grade));
  const closed = assignments.filter((item) => item.canOpen === false);
  return (
    <>
      <PageHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <div className="assignments-overview-strip" aria-label="Tổng quan bài tập">
        <span className="assignments-overview-chip">
          <BookOpen size={14} aria-hidden="true" />
          <span>{t.totalAssigned(hierarchical.length)}</span>
        </span>
        {tests.length > 0 && (
          <span className="assignments-overview-chip">
            <ClipboardCheck size={14} aria-hidden="true" />
            <span>{t.totalTests(tests.length)}</span>
          </span>
        )}
        {overdueItems.length > 0 && (
          <span className="assignments-overview-chip is-alert">
            <Clock3 size={14} aria-hidden="true" />
            <span>{t.overdueCount(overdueItems.length)}</span>
          </span>
        )}
      </div>

      {dueSoon.length > 0 && (
        <div className="assignments-due-soon-banner" role="status">
          <Clock3 size={16} aria-hidden="true" className="assignments-due-soon-icon" />
          <span>{t.dueSoon(dueSoon.length, dueSoon.map((item: any) => item.title).join(", "))}</span>
        </div>
      )}
      <SubjectGradeChapterBrowser
        items={hierarchical}
        basePath="/assignments/catalog"
        rootPath="/assignments"
        itemLabel={t.itemLabel}
        emptyCopy={ungroupedTests.length ? t.emptyUngrouped : t.emptyAll}
        renderItem={(item) => {
          const thumbnail = item.thumbnailUrl || (item.contentType === "lab" ? labInfo.find((lab) => lab.id === item.contentId)?.thumbnail : undefined);
          return <Link className="student-assignment-row" to={`/assignments/${encodeURIComponent(item.id)}`}>
            {thumbnail && <img className="student-assignment-thumbnail" src={thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling?.removeAttribute("hidden"); }} />}
            <span className="class-test-thumbnail" hidden={item.contentType === "lesson" || Boolean(thumbnail)} aria-hidden="true">{item.contentType === "lab" ? <FlaskConical size={30} /> : <ClipboardCheck size={30} />}</span>
            <span className="student-assignment-icon-wrap" aria-hidden="true">
              {item.contentType === "lab" ? (
                <FlaskConical size={18} />
              ) : item.contentType === "test" || item.contentType === "written" ? (
                <ClipboardCheck size={18} />
              ) : (
                <BookOpen size={18} />
              )}
            </span>
            <span className="student-assignment-copy">
              <span className="student-assignment-title-line">
                <strong className="student-assignment-title">{item.title}</strong>
                <span className={`student-content-badge ${item.contentType}`}>
                  {item.contentType === "lab"
                    ? t.badgeLab
                    : item.contentType === "test"
                      ? t.badgeTest
                      : item.contentType === "written"
                        ? t.badgeWritten
                        : t.badgeLesson}
                </span>
                {(() => {
                  const status = item.testStatus ?? item.writtenStatus;
                  if (!status) return null;
                  return (
                    <Badge tone={testStatusTone[status.status as keyof typeof testStatusTone]}>
                      {testStatusLabel[status.status as keyof typeof testStatusLabel]}
                      {status.extended ? t.extended : ""}
                    </Badge>
                  );
                })()}
              </span>
              <div className="student-assignment-meta-row">
                <span className="student-assignment-meta-text">
                  {item.classroom.name} · {item.dueDate ? commonText().due(formatDate(item.dueDate)) : commonText().noDueDate}
                </span>
                {item.classroom.teacher && <span className="student-assignment-meta-text">{t.teacher}: {item.classroom.teacher.fullName || item.classroom.teacher.username}</span>}
                {item.createdAt && <span className="student-assignment-meta-text">{t.assignedAt(formatDateTime(item.createdAt))}</span>}
                {item.overdue && (
                  <span className="student-assignment-overdue-pill">
                    {t.overdue}
                  </span>
                )}
              </div>
            </span>
            <ArrowUpRight size={17} className="student-assignment-arrow" aria-hidden="true" />
          </Link>
        }}
      />
      {ungroupedTests.length > 0 && (
        <section className="student-closed-assignments" aria-labelledby="ungrouped-tests-heading">
          <h2 id="ungrouped-tests-heading">{t.ungroupedTitle}</h2>
          <p className="hierarchy-empty">{t.ungroupedBody}</p>
          <div className="student-list student-assignment-list">
            {ungroupedTests.map((item) => (
              <Link key={item.id} className="student-assignment-row" to={`/assignments/${encodeURIComponent(item.id)}`}>
                {item.thumbnailUrl && <img className="student-assignment-thumbnail" src={item.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling?.removeAttribute("hidden"); }} />}
                <span className="class-test-thumbnail" hidden={Boolean(item.thumbnailUrl)} aria-hidden="true"><ClipboardCheck size={30} /></span>
                <span className="student-assignment-icon-wrap" aria-hidden="true">
                  <ClipboardCheck size={18} />
                </span>
                <span className="student-assignment-copy">
                  <span className="student-assignment-title-line">
                    <strong className="student-assignment-title">{item.title}</strong>
                    <span className="student-content-badge test">{t.badgeTest}</span>
                    {item.testStatus && (
                      <Badge tone={testStatusTone[item.testStatus.status as keyof typeof testStatusTone]}>
                        {testStatusLabel[item.testStatus.status as keyof typeof testStatusLabel]}
                        {item.testStatus.extended ? t.extended : ""}
                      </Badge>
                    )}
                  </span>
                  <div className="student-assignment-meta-row">
                    <span className="student-assignment-meta-text">
                      {item.classroom.name} · {item.dueDate ? commonText().due(formatDateTime(item.dueDate)) : commonText().noDueDate}
                    </span>
                    {item.overdue && (
                      <span className="student-assignment-overdue-pill">
                        {t.overdue}
                      </span>
                    )}
                  </div>
                </span>
                <ArrowUpRight size={17} className="student-assignment-arrow" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}
      {closed.length > 0 && (
        <section className="student-closed-assignments" aria-labelledby="closed-assignment-heading">
          <h2 id="closed-assignment-heading">{t.archived}</h2>
          <div className="student-list student-assignment-list">
            {closed.map((item) => (
              <article key={item.id} className="student-assignment-row is-archived" aria-disabled="true">
                <span className="student-assignment-icon-wrap" aria-hidden="true">
                  <Archive size={18} />
                </span>
                <span className="student-assignment-copy">
                  <span className="student-assignment-title-line">
                    <strong className="student-assignment-title">{item.title}</strong>
                    <Badge tone="outline">{t.archived}</Badge>
                  </span>
                  <div className="student-assignment-meta-row">
                    <span className="student-assignment-meta-text">{item.notice ?? t.unavailable}</span>
                  </div>
                </span>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
