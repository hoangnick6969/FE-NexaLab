import { useMemo, type ReactNode } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { defineText } from "../i18n";
import { commonText } from "../i18n/common";

const text = defineText({
  vi: {
    lessons: "bài học",
    notFound: "Không tìm thấy môn học hoặc khối này trong nội dung hiện có.",
    backToCatalog: "Quay lại danh mục",
    catalogPath: "Đường dẫn danh mục",
    chapterNotFound: "Không tìm thấy chương này trong danh mục hiện có.",
    subjectsAndGrades: "Môn và khối",
    grade: (grade: number | string) => `Khối ${grade}`,
    items: (n: number) => `${n} nội dung`,
    chapterIndex: "Mục lục chương",
    chapterIndexLabel: "Mục lục chương",
    emptyChapter: "Chương này chưa có nội dung.",
  },
  en: {
    lessons: "lessons",
    notFound: "This subject or grade is not in the current content.",
    backToCatalog: "Back to the catalogue",
    catalogPath: "Catalogue path",
    chapterNotFound: "This chapter is not in the current catalogue.",
    subjectsAndGrades: "Subjects and grades",
    grade: (grade: number | string) => `Grade ${grade}`,
    items: (n: number) => `${n} ${n === 1 ? "item" : "items"}`,
    chapterIndex: "Chapter index",
    chapterIndexLabel: "Chapter index",
    emptyChapter: "This chapter has no content yet.",
  },
});

export type HierarchyItem = {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  grade: number;
  chapter: string;
  chapterOrder?: number | null;
  itemOrder?: number | null;
};

type SubjectGradeChapterBrowserProps<T extends HierarchyItem> = {
  items: T[];
  emptyCopy: string;
  renderItem: (item: T) => ReactNode;
  basePath: string;
  rootPath?: string;
  className?: string;
  itemLabel?: string;
};

const compareOrder = (left?: number | null, right?: number | null) =>
  (left ?? Number.MAX_SAFE_INTEGER) - (right ?? Number.MAX_SAFE_INTEGER);
const chapterPath = (chapter: string) => encodeURIComponent(chapter);

/** URL-backed hierarchy shared by student catalogs; every level is a real screen/deep link. */
export function SubjectGradeChapterBrowser<T extends HierarchyItem>({
  items,
  emptyCopy,
  renderItem,
  basePath,
  rootPath,
  className = "",
  itemLabel = text().lessons,
}: SubjectGradeChapterBrowserProps<T>) {
  const { pathname } = useLocation();
  const t = text();
  const path = pathname.replace(/\/$/, "");
  const isRoot = path === basePath.replace(/\/$/, "") || path === rootPath;
  const subjectGrades = useMemo(() => {
    const groups = new Map<string, { subjectId: string; subjectName: string; grade: number; count: number }>();
    for (const item of items) {
      const key = `${item.grade}:${item.subjectId}`;
      const group = groups.get(key) ?? { subjectId: item.subjectId, subjectName: item.subjectName, grade: item.grade, count: 0 };
      group.count += 1;
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.grade - b.grade || a.subjectName.localeCompare(b.subjectName, "vi"));
  }, [items]);

  const prefix = `${basePath.replace(/\/$/, "")}/grades/`;
  const routeParts = path.startsWith(prefix) ? path.slice(prefix.length).split("/").map((part) => decodeURIComponent(part)) : [];
  const grade = /^\d+$/.test(routeParts[0] ?? "") ? Number(routeParts[0]) : null;
  const subjectId = routeParts[1] === "subjects" ? routeParts[2] : undefined;
  const chapterTitle = routeParts[3] === "chapters" ? routeParts[4] : undefined;
  const selected = subjectGrades.find((item) => item.grade === grade && item.subjectId === subjectId);
  const scopedItems = selected ? items.filter((item) => item.grade === selected.grade && item.subjectId === selected.subjectId) : [];
  const chapters = useMemo(() => {
    const groups = new Map<string, { title: string; order?: number | null; count: number }>();
    for (const item of scopedItems) {
      const title = item.chapter || commonText().noChapter;
      const key = title.toLocaleLowerCase("vi");
      const group = groups.get(key) ?? { title, order: item.chapterOrder, count: 0 };
      group.count += 1;
      if (group.order == null) group.order = item.chapterOrder;
      groups.set(key, group);
    }
    return [...groups.entries()].sort(([, a], [, b]) => compareOrder(a.order, b.order) || a.title.localeCompare(b.title, "vi", { numeric: true }));
  }, [scopedItems]);
  const selectedChapter = chapters.find(([, chapter]) => chapter.title === chapterTitle);
  const grades = useMemo(() => [...new Set(subjectGrades.map((item) => item.grade))], [subjectGrades]);
  const chapterItems = selectedChapter ? scopedItems
    .filter((item) => (item.chapter || commonText().noChapter).toLocaleLowerCase("vi") === selectedChapter[0])
    .sort((a, b) => compareOrder(a.itemOrder, b.itemOrder) || a.title.localeCompare(b.title, "vi", { numeric: true })) : [];
  const selectionPath = selected ? `${basePath}/grades/${selected.grade}/subjects/${encodeURIComponent(selected.subjectId)}` : basePath;

  if (!items.length) return <div className={className}><p className="hierarchy-empty">{emptyCopy}</p></div>;
  if (!isRoot && !selected) return <div className={`hierarchy-browser ${className}`}>
    <p className="hierarchy-empty">{t.notFound}</p><Link to={basePath}>{t.backToCatalog}</Link>
  </div>;
  if (selected && chapterTitle && !selectedChapter) return <div className={`hierarchy-browser ${className}`}>
    <nav aria-label={t.catalogPath}><Link to={selectionPath}>{t.grade(selected.grade)} · {selected.subjectName}</Link></nav>
    <p className="hierarchy-empty">{t.chapterNotFound}</p>
  </div>;

  return <div className={`hierarchy-browser ${className}`}>
    <nav className="hierarchy-breadcrumb" aria-label={t.catalogPath}>
      <Link to={basePath}>{t.subjectsAndGrades}</Link>
      {selected && <><span aria-hidden="true">/</span><Link to={selectionPath} aria-current={!chapterTitle ? "page" : undefined}>{t.grade(selected.grade)} · {selected.subjectName}</Link></>}
      {selectedChapter && <><span aria-hidden="true">/</span><span aria-current="page">{selectedChapter[1].title}</span></>}
    </nav>
    {!selected ? <div className="hierarchy-grade-sections">
      {grades.map((gradeValue) => <section className="hierarchy-grade-section" key={gradeValue} aria-labelledby={`catalog-grade-${gradeValue}`}>
        <h3 id={`catalog-grade-${gradeValue}`}>{t.grade(gradeValue)}</h3>
        <div className="hierarchy-grade-section-grid">{subjectGrades.filter((group) => group.grade === gradeValue).map((group) => <Link className="hierarchy-choice" key={`${group.grade}:${group.subjectId}`} to={`${basePath}/grades/${group.grade}/subjects/${encodeURIComponent(group.subjectId)}`}>
          <span className={`subject-icon ${group.subjectId}`}><BookOpen /></span>
          <span className="hierarchy-choice-copy"><b>{group.subjectName}</b><small>{t.items(group.count)}</small></span><ArrowRight size={18} aria-hidden="true" />
        </Link>)}</div>
      </section>)}
    </div> : !selectedChapter ? <>
      <header className="hierarchy-screen-heading"><span className="eyebrow">{t.grade(selected.grade).toLocaleUpperCase()}</span><h2>{selected.subjectName}</h2><p>{t.chapterIndex} · {scopedItems.length} {itemLabel}</p></header>
      {chapters.length ? <ol className="hierarchy-chapter-list" aria-label={t.chapterIndexLabel}>
        {chapters.map(([key, chapter], index) => <li key={key}><Link className="hierarchy-chapter" to={`${selectionPath}/chapters/${chapterPath(chapter.title)}`}>
          <span className="hierarchy-chapter-number">{index + 1}</span><span><b>{chapter.title}</b><small>{chapter.count} {itemLabel}</small></span><ArrowRight size={18} aria-hidden="true" />
        </Link></li>)}
      </ol> : <p className="hierarchy-empty">{emptyCopy}</p>}
    </> : <>
      <header className="hierarchy-screen-heading"><span className="eyebrow">{selected.subjectName} · {t.grade(selected.grade).toLocaleUpperCase()}</span><h2>{selectedChapter[1].title}</h2><p>{chapterItems.length} {itemLabel}</p></header>
      {chapterItems.length ? <div className="hierarchy-content-list">{chapterItems.map((item) => <div key={item.id}>{renderItem(item)}</div>)}</div> : <p className="hierarchy-empty">{t.emptyChapter}</p>}
    </>}
  </div>;
}
