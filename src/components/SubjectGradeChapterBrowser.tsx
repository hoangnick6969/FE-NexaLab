import { useMemo, type ReactNode } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

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
}: SubjectGradeChapterBrowserProps<T>) {
  const { pathname } = useLocation();
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
      const title = item.chapter || "Chưa phân chương";
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
    .filter((item) => (item.chapter || "Chưa phân chương").toLocaleLowerCase("vi") === selectedChapter[0])
    .sort((a, b) => compareOrder(a.itemOrder, b.itemOrder) || a.title.localeCompare(b.title, "vi", { numeric: true })) : [];
  const selectionPath = selected ? `${basePath}/grades/${selected.grade}/subjects/${encodeURIComponent(selected.subjectId)}` : basePath;

  if (!items.length) return <div className={className}><p className="hierarchy-empty">{emptyCopy}</p></div>;
  if (!isRoot && !selected) return <div className={`hierarchy-browser ${className}`}>
    <p className="hierarchy-empty">Không tìm thấy môn học hoặc khối này trong nội dung hiện có.</p><Link to={basePath}>Quay lại danh mục</Link>
  </div>;
  if (selected && chapterTitle && !selectedChapter) return <div className={`hierarchy-browser ${className}`}>
    <nav aria-label="Đường dẫn danh mục"><Link to={selectionPath}>Khối {selected.grade} · {selected.subjectName}</Link></nav>
    <p className="hierarchy-empty">Không tìm thấy chương này trong danh mục hiện có.</p>
  </div>;

  return <div className={`hierarchy-browser ${className}`}>
    <nav className="hierarchy-breadcrumb" aria-label="Đường dẫn danh mục">
      <Link to={basePath}>Môn và khối</Link>
      {selected && <><span aria-hidden="true">/</span><Link to={selectionPath} aria-current={!chapterTitle ? "page" : undefined}>Khối {selected.grade} · {selected.subjectName}</Link></>}
      {selectedChapter && <><span aria-hidden="true">/</span><span aria-current="page">{selectedChapter[1].title}</span></>}
    </nav>
    {!selected ? <div className="hierarchy-grade-sections">
      {grades.map((gradeValue) => <section className="hierarchy-grade-section" key={gradeValue} aria-labelledby={`catalog-grade-${gradeValue}`}>
        <h3 id={`catalog-grade-${gradeValue}`}>Khối {gradeValue}</h3>
        <div className="hierarchy-grade-section-grid">{subjectGrades.filter((group) => group.grade === gradeValue).map((group) => <Link className="hierarchy-choice" key={`${group.grade}:${group.subjectId}`} to={`${basePath}/grades/${group.grade}/subjects/${encodeURIComponent(group.subjectId)}`}>
          <span className={`subject-icon ${group.subjectId}`}><BookOpen /></span>
          <span className="hierarchy-choice-copy"><b>{group.subjectName}</b><small>{group.count} nội dung</small></span><ArrowRight size={18} aria-hidden="true" />
        </Link>)}</div>
      </section>)}
    </div> : !selectedChapter ? <>
      <header className="hierarchy-screen-heading"><span className="eyebrow">KHỐI {selected.grade}</span><h2>{selected.subjectName}</h2><p>Mục lục chương · {scopedItems.length} bài học</p></header>
      {chapters.length ? <ol className="hierarchy-chapter-list" aria-label="Mục lục chương">
        {chapters.map(([key, chapter], index) => <li key={key}><Link className="hierarchy-chapter" to={`${selectionPath}/chapters/${chapterPath(chapter.title)}`}>
          <span className="hierarchy-chapter-number">{index + 1}</span><span><b>{chapter.title}</b><small>{chapter.count} bài / nội dung</small></span><ArrowRight size={18} aria-hidden="true" />
        </Link></li>)}
      </ol> : <p className="hierarchy-empty">{emptyCopy}</p>}
    </> : <>
      <header className="hierarchy-screen-heading"><span className="eyebrow">{selected.subjectName} · KHỐI {selected.grade}</span><h2>{selectedChapter[1].title}</h2><p>{chapterItems.length} bài học</p></header>
      {chapterItems.length ? <div className="hierarchy-content-list">{chapterItems.map((item) => <div key={item.id}>{renderItem(item)}</div>)}</div> : <p className="hierarchy-empty">Chương này chưa có nội dung.</p>}
    </>}
  </div>;
}
