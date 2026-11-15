import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, ChevronDown, ChevronRight, School, GraduationCap, FlaskConical, Zap, Leaf } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { defineText } from "../i18n";
import { commonText } from "../i18n/common";
import { inlineMaterial } from "../lib/api";

const text = defineText({
  vi: {
    lessons: "bài học",
    notFound: "Không tìm thấy môn học hoặc khối này trong nội dung hiện có.",
    backToCatalog: "Quay lại danh mục",
    catalogPath: "Đường dẫn danh mục",
    chapterNotFound: "Không tìm thấy chương này trong danh mục hiện có.",
    subjectsAndGrades: "Mục lục môn học",
    grade: (grade: number | string) => `Khối ${grade}`,
    items: (n: number) => `${n} bài học`,
    chapterIndex: "Mục lục chương",
    chapterIndexLabel: "Mục lục chương",
    emptyChapter: "Chương này chưa có nội dung.",
    startLearning: "Bắt đầu học",
    prevChapter: "Chương trước",
    nextChapter: "Chương sau",
    expandChapter: "Xem danh sách bài",
    collapseChapter: "Thu gọn",
    classLabel: "Lớp",
    teacherLabel: "GV",
  },
  en: {
    lessons: "lessons",
    notFound: "This subject or grade is not in the current content.",
    backToCatalog: "Back to the catalogue",
    catalogPath: "Catalogue path",
    chapterNotFound: "This chapter is not in the current catalogue.",
    subjectsAndGrades: "Subjects and grades",
    grade: (grade: number | string) => `Grade ${grade}`,
    items: (n: number) => `${n} ${n === 1 ? "lesson" : "lessons"}`,
    chapterIndex: "Chapter index",
    chapterIndexLabel: "Chapter index",
    emptyChapter: "This chapter has no content yet.",
    startLearning: "Start learning",
    prevChapter: "Previous chapter",
    nextChapter: "Next chapter",
    expandChapter: "View lessons",
    collapseChapter: "Collapse",
    classLabel: "Class",
    teacherLabel: "Teacher",
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
  coverAssetVersionId?: string | null;
  classroom?: { id: string; name: string; teacher?: { fullName?: string | null; username?: string | null } | null };
  contentType?: string;
  contentId?: string;
  thumbnail?: string | null;
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

function SubjectIconComponent({ subjectId, size = 26 }: { subjectId: string; size?: number }) {
  const normalized = (subjectId || "").toLowerCase();
  if (normalized.includes("physic") || normalized.includes("vat-ly") || normalized.includes("vatly")) {
    return <Zap size={size} aria-hidden="true" />;
  }
  if (normalized.includes("chem") || normalized.includes("hoa-hoc") || normalized.includes("hoahoc")) {
    return <FlaskConical size={size} aria-hidden="true" />;
  }
  if (normalized.includes("bio") || normalized.includes("sinh-hoc") || normalized.includes("sinhhoc")) {
    return <Leaf size={size} aria-hidden="true" />;
  }
  if (normalized.includes("khtn") || normalized.includes("natural") || normalized.includes("khoa-hoc")) {
    return <FlaskConical size={size} aria-hidden="true" />;
  }
  return <BookOpen size={size} aria-hidden="true" />;
}

function getSubjectAbbr(subjectId: string, subjectName: string): string {
  const name = (subjectName || "").toUpperCase();
  if (name.includes("TỰ NHIÊN")) return "KHTN";
  if (name.includes("VẬT LÝ") || name.includes("VẬT LÍ")) return "VẬT LÝ";
  if (name.includes("HÓA HỌC")) return "HÓA HỌC";
  if (name.includes("SINH HỌC")) return "SINH HỌC";
  if (name.includes("TOÁN")) return "TOÁN";
  return name.slice(0, 8);
}

export function SubjectCover({
  subjectId,
  subjectName,
  versionId,
  thumbnail,
  grade,
  className,
}: {
  subjectId: string;
  subjectName: string;
  versionId?: string | null;
  thumbnail?: string | null;
  grade?: number | null;
  className?: string | null;
}) {
  const [src, setSrc] = useState<string | null>(thumbnail ?? null);
  useEffect(() => {
    if (thumbnail) {
      setSrc(thumbnail);
      return;
    }
    let active = true;
    let revoke: () => void = () => undefined;
    setSrc(null);
    if (versionId) inlineMaterial(`assetv:${versionId}`).then((image) => {
      if (active) { revoke = image.revoke; setSrc(image.src); }
      else image.revoke();
    }).catch(() => undefined);
    return () => { active = false; revoke(); };
  }, [versionId, thumbnail]);

  return (
    <span className={`subject-icon ${subjectId}`} aria-hidden="true">
      {src ? (
        <img src={src} alt="" width="400" height="600" loading="lazy" decoding="async" onError={() => setSrc(null)} />
      ) : (
        <div className={`subject-mockup-cover is-${subjectId}`}>
          <div className="subject-mockup-decor" aria-hidden="true">
            <div className="decor-circle circle-1" />
            <div className="decor-circle circle-2" />
          </div>
          <div className="subject-mockup-top">
            <span className="mockup-class-badge">
              <GraduationCap size={12} aria-hidden="true" />
              <span>LỚP HỌC</span>
            </span>
            {grade && <span className="mockup-grade-pill">K{grade}</span>}
          </div>
          <div className="subject-mockup-center">
            <div className="mockup-icon-box">
              <SubjectIconComponent subjectId={subjectId} size={28} />
            </div>
            <span className="mockup-subject-abbr">{getSubjectAbbr(subjectId, subjectName)}</span>
          </div>
          {className && (
            <div className="subject-mockup-footer">
              <School size={11} aria-hidden="true" />
              <span className="mockup-class-name" title={className}>{className}</span>
            </div>
          )}
        </div>
      )}
      <span className="sr-only">{subjectName}</span>
    </span>
  );
}

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
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

  const subjectGrades = useMemo(() => {
    const groups = new Map<string, {
      subjectId: string;
      subjectName: string;
      grade: number;
      count: number;
      coverAssetVersionId?: string | null;
      thumbnail?: string | null;
      classNames: string[];
      teacherNames: string[];
    }>();
    for (const item of items) {
      const key = `${item.grade}:${item.subjectId}`;
      const group = groups.get(key) ?? {
        subjectId: item.subjectId,
        subjectName: item.subjectName,
        grade: item.grade,
        count: 0,
        coverAssetVersionId: item.coverAssetVersionId,
        thumbnail: item.thumbnail,
        classNames: [],
        teacherNames: [],
      };
      group.count += 1;
      if (!group.coverAssetVersionId && item.coverAssetVersionId) {
        group.coverAssetVersionId = item.coverAssetVersionId;
      }
      if (!group.thumbnail && item.thumbnail) {
        group.thumbnail = item.thumbnail;
      }
      if (item.classroom?.name && !group.classNames.includes(item.classroom.name)) {
        group.classNames.push(item.classroom.name);
      }
      const teacherName = item.classroom?.teacher?.fullName || item.classroom?.teacher?.username;
      if (teacherName && !group.teacherNames.includes(teacherName)) {
        group.teacherNames.push(teacherName);
      }
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
  const chapterItems = selectedChapter ? scopedItems
    .filter((item) => (item.chapter || commonText().noChapter).toLocaleLowerCase("vi") === selectedChapter[0])
    .sort((a, b) => compareOrder(a.itemOrder, b.itemOrder) || a.title.localeCompare(b.title, "vi", { numeric: true })) : [];
  const selectionPath = selected ? `${basePath}/grades/${selected.grade}/subjects/${encodeURIComponent(selected.subjectId)}` : basePath;

  const toggleChapter = (key: string, e: React.MouseEvent) => {
    e.preventDefault();
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!items.length) return <div className={className}><p className="hierarchy-empty">{emptyCopy}</p></div>;
  if (!isRoot && !selected) return <div className={`hierarchy-browser ${className}`}>
    <p className="hierarchy-empty">{t.notFound}</p><Link to={basePath}>{t.backToCatalog}</Link>
  </div>;
  if (selected && chapterTitle && !selectedChapter) return <div className={`hierarchy-browser ${className}`}>
    <nav className="hierarchy-breadcrumb" aria-label={t.catalogPath}>
      <Link to={basePath} className="breadcrumb-item">{t.subjectsAndGrades}</Link>
      <ChevronRight size={12} className="breadcrumb-sep" aria-hidden="true" />
      <Link to={selectionPath} className="breadcrumb-item">{t.grade(selected.grade)} · {selected.subjectName}</Link>
    </nav>
    <p className="hierarchy-empty">{t.chapterNotFound}</p>
  </div>;

  return <div className={`hierarchy-browser ${className}`}>
    <nav className="hierarchy-breadcrumb" aria-label={t.catalogPath}>
      <Link to={basePath} className="breadcrumb-item">{t.subjectsAndGrades}</Link>
      {selected && (
        <>
          <ChevronRight size={12} className="breadcrumb-sep" aria-hidden="true" />
          <Link to={selectionPath} className="breadcrumb-item" aria-current={!chapterTitle ? "page" : undefined}>
            {t.grade(selected.grade)} · {selected.subjectName}
          </Link>
        </>
      )}
      {selectedChapter && (
        <>
          <ChevronRight size={12} className="breadcrumb-sep" aria-hidden="true" />
          <span className="breadcrumb-current" aria-current="page">{selectedChapter[1].title}</span>
        </>
      )}
    </nav>
    {!selected ? <div className="hierarchy-subject-grid">
      {subjectGrades.map((group) => (
        <Link
          className="hierarchy-choice"
          key={`${group.grade}:${group.subjectId}`}
          to={`${basePath}/grades/${group.grade}/subjects/${encodeURIComponent(group.subjectId)}`}
        >
          <SubjectCover
            subjectId={group.subjectId}
            subjectName={group.subjectName}
            versionId={group.coverAssetVersionId}
            thumbnail={group.thumbnail}
            grade={group.grade}
            className={group.classNames[0]}
          />
          <span className="hierarchy-choice-copy">
            <span className="hierarchy-choice-grade-row">
              <span className="hierarchy-choice-grade">{t.grade(group.grade)}</span>
              <span className="hierarchy-choice-count-pill">{t.items(group.count)}</span>
            </span>
            <b className="hierarchy-choice-title">{group.subjectName}</b>
            {group.classNames.length > 0 && (
              <span className="hierarchy-choice-meta-line class-meta" title={group.classNames.join(", ")}>
                <School size={13} aria-hidden="true" />
                <span>{group.classNames.join(", ")}</span>
              </span>
            )}
            {group.teacherNames.length > 0 && (
              <span className="hierarchy-choice-meta-line teacher-meta" title={group.teacherNames.join(", ")}>
                <GraduationCap size={13} aria-hidden="true" />
                <span>{t.teacherLabel}: {group.teacherNames.join(", ")}</span>
              </span>
            )}
          </span>
          <ArrowRight size={18} aria-hidden="true" className="hierarchy-choice-arrow" />
        </Link>
      ))}
    </div> : !selectedChapter ? <>
      <header className="hierarchy-screen-heading"><span className="eyebrow">{t.grade(selected.grade).toLocaleUpperCase()}</span><h2>{selected.subjectName}</h2><p>{t.chapterIndex} · {scopedItems.length} {itemLabel}</p></header>
      {chapters.length ? <ol className="hierarchy-chapter-list" aria-label={t.chapterIndexLabel}>
        {chapters.map(([key, chapter], index) => {
          const isExpanded = expandedKeys.has(key);
          const lessonsInChapter = isExpanded ? scopedItems
            .filter((item) => (item.chapter || commonText().noChapter).toLocaleLowerCase("vi") === key)
            .sort((a, b) => compareOrder(a.itemOrder, b.itemOrder) || a.title.localeCompare(b.title, "vi", { numeric: true })) : [];
          return (
            <li key={key} className={`hierarchy-chapter-item${isExpanded ? " is-expanded" : ""}`}>
              <div className="hierarchy-chapter-row">
                <button
                  type="button"
                  className="hierarchy-chapter-toggle"
                  onClick={(e) => toggleChapter(key, e)}
                  aria-expanded={isExpanded}
                  title={isExpanded ? t.collapseChapter : t.expandChapter}
                >
                  <span className="hierarchy-chapter-number">{index + 1}</span>
                  <span className="hierarchy-chapter-info">
                    <b>{chapter.title}</b>
                    <small>{chapter.count} {itemLabel}</small>
                  </span>
                  <span className="hierarchy-chapter-chevron" aria-hidden="true">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </span>
                </button>
                <Link
                  className="hierarchy-chapter-direct-link"
                  to={`${selectionPath}/chapters/${chapterPath(chapter.title)}`}
                  title={chapter.title}
                  aria-label={`${chapter.title} - ${t.expandChapter}`}
                >
                  <ArrowRight size={16} />
                </Link>
              </div>
              {isExpanded && (
                <div className="hierarchy-accordion-body">
                  {lessonsInChapter.length ? (
                    <div className="hierarchy-accordion-lessons">
                      {lessonsInChapter.map((item) => (
                        <div key={item.id} className="hierarchy-accordion-lesson-wrap">
                          {renderItem(item)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="hierarchy-empty-inline">{emptyCopy}</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol> : <p className="hierarchy-empty">{emptyCopy}</p>}
    </> : (() => {
      const currentIdx = chapters.findIndex(([k]) => k === selectedChapter[0]);
      const prevChap = currentIdx > 0 ? chapters[currentIdx - 1] : null;
      const nextChap = currentIdx >= 0 && currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;
      const firstItem = chapterItems[0] as (T & { assignments?: Array<{ id: string }> }) | undefined;
      const firstItemHref = firstItem
        ? basePath.startsWith("/assignments") || basePath.startsWith("/classes/")
          ? `/assignments/${encodeURIComponent(firstItem.id)}`
          : firstItem.assignments?.[0]?.id
            ? `/lessons/${encodeURIComponent(firstItem.id)}?assignmentId=${encodeURIComponent(firstItem.assignments[0].id)}`
            : `/lessons/${encodeURIComponent(firstItem.id)}`
        : null;
      return (
        <>
          <header className="hierarchy-screen-heading chapter-view-heading">
            <div className="chapter-heading-meta">
              <span className="eyebrow">{selected.subjectName} · {t.grade(selected.grade).toLocaleUpperCase()}</span>
              <h2>{selectedChapter[1].title}</h2>
              <p>{chapterItems.length} {itemLabel}</p>
            </div>
            {firstItemHref && (
              <Link className="primary chapter-start-cta" to={firstItemHref}>
                {t.startLearning} <ArrowRight size={16} />
              </Link>
            )}
          </header>
          {(prevChap || nextChap) && (
            <nav className="hierarchy-chapter-nav" aria-label="Điều hướng chương">
              {prevChap ? (
                <Link className="hierarchy-nav-prev" to={`${selectionPath}/chapters/${chapterPath(prevChap[1].title)}`}>
                  ← {t.prevChapter}: {prevChap[1].title}
                </Link>
              ) : <span />}
              {nextChap && (
                <Link className="hierarchy-nav-next" to={`${selectionPath}/chapters/${chapterPath(nextChap[1].title)}`}>
                  {t.nextChapter}: {nextChap[1].title} →
                </Link>
              )}
            </nav>
          )}
          {chapterItems.length ? (
            <div className="hierarchy-content-list">
              {chapterItems.map((item) => <div key={item.id}>{renderItem(item)}</div>)}
            </div>
          ) : (
            <p className="hierarchy-empty">{t.emptyChapter}</p>
          )}
          {(prevChap || nextChap) && (
            <nav className="hierarchy-chapter-nav bottom" aria-label="Điều hướng chương cuối trang">
              {prevChap ? (
                <Link className="hierarchy-nav-prev" to={`${selectionPath}/chapters/${chapterPath(prevChap[1].title)}`}>
                  ← {t.prevChapter}: {prevChap[1].title}
                </Link>
              ) : <span />}
              {nextChap && (
                <Link className="hierarchy-nav-next" to={`${selectionPath}/chapters/${chapterPath(nextChap[1].title)}`}>
                  {t.nextChapter}: {nextChap[1].title} →
                </Link>
              )}
            </nav>
          )}
        </>
      );
    })()}
  </div>;
}
