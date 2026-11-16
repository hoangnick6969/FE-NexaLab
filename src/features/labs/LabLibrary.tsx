import { FlaskConical, ArrowUpRight, Zap, Eye, Magnet, Scale, Search, X, RotateCcw, SlidersHorizontal, Dna, Fish, Network } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { api, useAuth } from "../../lib/api";
import { Skeleton } from "../../components/ui";
import { PageHeading } from "../../components/PageHeading";
import { labInfo } from "./lab-info";
import { foldModeCards } from "./lab-modes";
import { rememberLabsSearch } from "./labs-return";
import { defineText } from "../../i18n";
import { relatedLessonHref, type RelatedLesson } from "./pathways/lesson-lab-navigation";
import { labCurriculumLabel } from "./lab-curriculum-label";
import { KitComponents } from "./kit-catalog/KitComponents";

const text = defineText({
  vi: {
    grades: "Lớp 8–9",
    basicsFirst: "Học kiến thức nền trước",
    explore: "Khám phá phòng lab",
    relatedLesson: "Bài học liên quan",
    moreRelatedLessons: (count: number) => `Xem thêm ${count} bài học liên quan`,
    nonePublished: "Chưa có phòng thực hành nền tảng nào được phát hành.",
    loading: "Đang tải danh sách phòng thí nghiệm…",
    loadFailed: "Chưa tải được danh sách phòng thí nghiệm.",
    retry: "Thử lại",
    eyebrow: "HỌC QUA TRẢI NGHIỆM",
    title: "Phòng thí nghiệm",
    description: "Tự đặt câu hỏi, tự thử nghiệm và kiểm chứng bằng kết quả.",
    disclaimer: "Mọi thí nghiệm đều là mô phỏng giáo dục. Không thực hiện với điện hoặc hóa chất thật theo mô hình này.",
    allGrades: "Tất cả lớp",
    grade8: "Lớp 8",
    grade9: "Lớp 9",
    allSubjects: "Tất cả môn",
    physics: "Vật lý",
    chemistry: "Hóa học",
    biology: "Sinh học",
    searchPlaceholder: "Tìm kiếm phòng lab, chủ đề, từ khóa…",
    sortBy: "Sắp xếp:",
    sortDefault: "Thứ tự chương trình",
    sortTitleAsc: "Tên: A → Z",
    sortTitleDesc: "Tên: Z → A",
    sortGradeAsc: "Theo lớp: 8 → 9",
    showingCount: (count: number, total: number) => `Hiển thị ${count} / ${total} phòng thí nghiệm`,
    noMatches: "Không tìm thấy phòng thí nghiệm nào phù hợp với bộ lọc.",
    resetFilters: "Đặt lại bộ lọc",
    filterGradeLabel: "Lớp:",
    filterSubjectLabel: "Môn:",
    twoModes: "2 chế độ",
    modesLabel: "Chế độ:",
    guidedMode: "Có hướng dẫn",
    exploreMode: "Khám phá tự do",
  },
  en: {
    grades: "Grades 8–9",
    basicsFirst: "Learn the basics first",
    explore: "Explore the lab",
    relatedLesson: "Related lesson",
    moreRelatedLessons: (count: number) => `Show ${count} more related lessons`,
    nonePublished: "No foundation labs are published yet.",
    loading: "Loading labs…",
    loadFailed: "Labs could not be loaded.",
    retry: "Try again",
    eyebrow: "LEARN BY EXPERIENCE",
    title: "Labs",
    description: "Ask your own questions, experiment and check against the results.",
    disclaimer: "Every experiment is an educational simulation. Do not try it with real electricity or chemicals.",
    allGrades: "All grades",
    grade8: "Grade 8",
    grade9: "Grade 9",
    allSubjects: "All subjects",
    physics: "Physics",
    chemistry: "Chemistry",
    biology: "Biology",
    searchPlaceholder: "Search labs, topics, keywords…",
    sortBy: "Sort by:",
    sortDefault: "Curriculum sequence",
    sortTitleAsc: "Name: A → Z",
    sortTitleDesc: "Name: Z → A",
    sortGradeAsc: "By Grade: 8 → 9",
    showingCount: (count: number, total: number) => `Showing ${count} of ${total} labs`,
    noMatches: "No simulation labs matched your search criteria.",
    resetFilters: "Reset filters",
    filterGradeLabel: "Grade:",
    filterSubjectLabel: "Subject:",
    twoModes: "2 modes",
    modesLabel: "Modes:",
    guidedMode: "Guided",
    exploreMode: "Free explore",
  },
});
const t = text();

function LabCardsSkeleton({ showFilters, message }: { showFilters: boolean; message: string }) {
  return (
    <div className="lab-library-loading" role="status" aria-live="polite" aria-busy="true" aria-label={message}>
      {showFilters && <section className="lab-filter-section lab-filter-skeleton" aria-hidden="true">
        <Skeleton variant="rect" className="lab-filter-skeleton-search" />
        <div className="lab-filter-skeleton-chips">{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} variant="rect" className="lab-filter-skeleton-chip" />)}</div>
      </section>}
      <div className="lab-grid lab-library-skeleton" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => <article key={i} className="lab-card lab-card-skeleton">
          <Skeleton variant="rect" className="lab-card-skeleton-image" />
          <div className="lab-card-skeleton-copy">
            <Skeleton variant="text" className="lab-card-skeleton-tag" />
            <Skeleton variant="text" className="lab-card-skeleton-title" />
            <Skeleton variant="text" className="lab-card-skeleton-description" />
            <Skeleton variant="text" className="lab-card-skeleton-footer" />
          </div>
        </article>)}
      </div>
    </div>
  );
}

export function LabCards({ guided = false, showFilters = false, showDisclaimer = false }: { guided?: boolean; showFilters?: boolean; showDisclaimer?: boolean } = {}) {
  const role = useAuth((s) => s.user!.role);
  const labs = useQuery({ queryKey: ["labs"], queryFn: () => api<any[]>("/labs"), enabled: ["STUDENT", "TEACHER", "ADMIN"].includes(role) });

  // Filters live in the URL (`/labs?grade=8&subject=biology&sort=…&q=…`) so "← Quay về" from a Lab, reload and shared
  // links keep them. Only the library page (showFilters) owns the query; embedded card lists keep defaults.
  const [params, setParams] = useSearchParams();
  const read = (key: string, fallback: string, allowed?: readonly string[]) => {
    if (!showFilters) return fallback;
    const value = params.get(key);
    return value && (!allowed || allowed.includes(value)) ? value : fallback;
  };
  const selectedGrade = read("grade", "all", ["8", "9"]);
  const selectedSubject = read("subject", "all", ["physics", "chemistry", "biology"]);
  const sortBy = read("sort", "default", ["grade-asc", "title-asc", "title-desc"]);
  const searchQuery = read("q", "");
  const setParam = (key: string, value: string, fallback: string) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (value === fallback || value === "") next.delete(key); else next.set(key, value);
    return next;
  }, { replace: true });
  const setSelectedGrade = (value: string) => setParam("grade", value, "all");
  const setSelectedSubject = (value: string) => setParam("subject", value, "all");
  const setSortBy = (value: string) => setParam("sort", value, "default");
  const setSearchQuery = (value: string) => setParam("q", value, "");
  const filterQuery = showFilters ? params.toString() : null;
  useEffect(() => { if (filterQuery !== null) rememberLabsSearch(filterQuery ? `?${filterQuery}` : ""); }, [filterQuery]);

  const allCards = role === "STUDENT" ? (labs.data ?? []).flatMap((lab: any) => {
    const visual = labInfo.find((item) => item.id === lab.id);
    const label = labCurriculumLabel(lab, visual?.subject ?? "", t.grades);
    return visual ? [{ ...visual, grade: "grade" in visual ? visual.grade : undefined, title: visual.localizedCopy ? visual.title : lab.title, description: visual.localizedCopy ? visual.description : lab.learningObjective, subject: label.subject, gradeLabel: label.grade, lessonLinks: lab.lessonLinks as RelatedLesson[] | undefined }] : [];
  }) : labInfo.map((visual) => {
    const lab = labs.data?.find((item) => item.id === visual.id);
    const label = labCurriculumLabel(lab, visual.subject, t.grades);
    return { ...visual, grade: "grade" in visual ? visual.grade : undefined, title: visual.localizedCopy ? visual.title : lab?.title ?? visual.title, description: visual.localizedCopy ? visual.description : lab?.learningObjective ?? visual.description, subject: label.subject, gradeLabel: label.grade, lessonLinks: lab?.lessonLinks as RelatedLesson[] | undefined };
  });

  // One card per FL slot: the Explore mode of a Lab that also has Guided folds into the Guided card (interim D-5).
  // D-5: a Guided Lab with Explore on the same Lab ID shows one card whose Explore chip opens `?mode=explore`.
  const twoMode = new Set((labs.data ?? []).filter((lab: any) => lab.modes?.includes("guided") && lab.modes?.includes("explore")).map((lab: any) => lab.id as string));
  const cards = foldModeCards(allCards).map((card) => !card.exploreCard && twoMode.has(card.id) ? { ...card, exploreCard: { ...card, id: `${card.id}?mode=explore` } } : card);

  const gradeCounts = useMemo(() => {
    let g8 = 0;
    let g9 = 0;
    for (const card of cards) {
      const g = card.grade ?? (card.gradeLabel?.includes("9") ? 9 : 8);
      if (g === 8) g8++;
      else if (g === 9) g9++;
    }
    return { all: cards.length, g8, g9 };
  }, [cards]);

  const filteredCards = useMemo(() => {
    let result = cards.filter((l) => {
      const g = l.grade ?? (l.gradeLabel?.includes("9") ? 9 : 8);
      if (selectedGrade === "8" && g !== 8) return false;
      if (selectedGrade === "9" && g !== 9) return false;

      if (selectedSubject !== "all" && l.className !== selectedSubject) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const title = (l.title || "").toLowerCase();
        const desc = (l.description || "").toLowerCase();
        const subj = (l.subject || "").toLowerCase();
        const tag = (l.tag || "").toLowerCase();
        const explore = l.exploreCard ? `${l.exploreCard.title} ${l.exploreCard.description} ${l.exploreCard.tag}`.toLowerCase() : "";
        if (!title.includes(query) && !desc.includes(query) && !subj.includes(query) && !tag.includes(query) && !explore.includes(query)) {
          return false;
        }
      }
      return true;
    });

    if (sortBy === "title-asc") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "title-desc") {
      result = [...result].sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortBy === "grade-asc") {
      result = [...result].sort((a, b) => {
        const ga = a.grade ?? (a.gradeLabel?.includes("9") ? 9 : 8);
        const gb = b.grade ?? (b.gradeLabel?.includes("9") ? 9 : 8);
        return ga - gb;
      });
    }

    return result;
  }, [cards, selectedGrade, selectedSubject, sortBy, searchQuery]);

  const isFiltered = selectedGrade !== "all" || selectedSubject !== "all" || searchQuery.trim().length > 0 || sortBy !== "default";

  if (labs.isLoading) return <LabCardsSkeleton showFilters={showFilters} message={t.loading} />;

  const handleResetFilters = () => setParams((current) => {
    const next = new URLSearchParams(current);
    ["grade", "subject", "sort", "q"].forEach((key) => next.delete(key));
    return next;
  }, { replace: true });

  if (labs.isError && labs.data === undefined) return <div className="notice lab-library-load-error" role="alert">
    <span>{t.loadFailed}</span>
    <button type="button" className="secondary" onClick={() => void labs.refetch()}>{t.retry}</button>
  </div>;

  return (
    <div className="lab-library-container">
      {showFilters && (
        <section className="lab-filter-section" aria-label="Bộ lọc phòng thí nghiệm">
          <div className="lab-filter-top">
            <div className="lab-search-box">
              <Search size={16} className="lab-search-icon" aria-hidden="true" />
              <input
                type="text"
                className="lab-search-input"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={t.searchPlaceholder}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="lab-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="lab-sort-control">
              <label htmlFor="lab-sort-select" className="lab-filter-label">
                <SlidersHorizontal size={14} />
                <span>{t.sortBy}</span>
              </label>
              <select
                id="lab-sort-select"
                className="lab-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="default">{t.sortDefault}</option>
                <option value="grade-asc">{t.sortGradeAsc}</option>
                <option value="title-asc">{t.sortTitleAsc}</option>
                <option value="title-desc">{t.sortTitleDesc}</option>
              </select>
            </div>
          </div>

          <div className="lab-filter-bottom">
            <div className="lab-filter-chips-row">
              <div className="lab-filter-group" role="group" aria-label={t.filterGradeLabel}>
                <span className="lab-group-title">{t.filterGradeLabel}</span>
                <button
                  type="button"
                  className={`lab-chip${selectedGrade === "all" ? " is-active" : ""}`}
                  onClick={() => setSelectedGrade("all")}
                >
                  {t.allGrades}
                  <span className="lab-chip-count">{gradeCounts.all}</span>
                </button>
                <button
                  type="button"
                  className={`lab-chip${selectedGrade === "8" ? " is-active" : ""}`}
                  onClick={() => setSelectedGrade("8")}
                >
                  {t.grade8}
                  <span className="lab-chip-count">{gradeCounts.g8}</span>
                </button>
                <button
                  type="button"
                  className={`lab-chip${selectedGrade === "9" ? " is-active" : ""}`}
                  onClick={() => setSelectedGrade("9")}
                >
                  {t.grade9}
                  <span className="lab-chip-count">{gradeCounts.g9}</span>
                </button>
              </div>

              <div className="lab-filter-group" role="group" aria-label={t.filterSubjectLabel}>
                <span className="lab-group-title">{t.filterSubjectLabel}</span>
                <button
                  type="button"
                  className={`lab-chip${selectedSubject === "all" ? " is-active" : ""}`}
                  onClick={() => setSelectedSubject("all")}
                >
                  {t.allSubjects}
                </button>
                <button
                  type="button"
                  className={`lab-chip${selectedSubject === "physics" ? " is-active" : ""}`}
                  onClick={() => setSelectedSubject("physics")}
                >
                  {t.physics}
                </button>
                <button
                  type="button"
                  className={`lab-chip${selectedSubject === "chemistry" ? " is-active" : ""}`}
                  onClick={() => setSelectedSubject("chemistry")}
                >
                  {t.chemistry}
                </button>
                <button
                  type="button"
                  className={`lab-chip${selectedSubject === "biology" ? " is-active" : ""}`}
                  onClick={() => setSelectedSubject("biology")}
                >
                  {t.biology}
                </button>
              </div>
            </div>

            <div className="lab-filter-meta">
              <span className="lab-results-count">
                {t.showingCount(filteredCards.length, cards.length)}
              </span>
              {isFiltered && (
                <button
                  type="button"
                  className="lab-reset-btn"
                  onClick={handleResetFilters}
                >
                  <RotateCcw size={13} />
                  {t.resetFilters}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="lab-grid">
        {filteredCards.map((l) => (
          <article key={l.id} id={`lab-${l.id}`} className="lab-library-item">
            <Link
              to={
                guided && role === "STUDENT"
                  ? (l.lessonLinks?.[0]?.lessonId ? `/lessons/${encodeURIComponent(l.lessonLinks[0].lessonId)}` : "/lessons")
                  : ["STUDENT", "TEACHER"].includes(role)
                    ? "/labs/" + l.id
                    : "/labs"
              }
              className="lab-card"
              key={l.id}
            >
              <div className={"lab-art " + l.className + (l.thumbnail ? " has-thumbnail" : "")}>
                {l.thumbnail && <img className="lab-thumbnail-image" src={l.thumbnail} alt="" aria-hidden="true" loading="lazy" decoding="async" width="1280" height="720" onError={(event) => event.currentTarget.parentElement?.classList.add("thumbnail-failed")} />}
                <span className="lab-subject">{l.subject}</span>
                <span className="art-number">{l.number}</span>
                <div className="art-symbol">
                  {l.artId === "circuit" ? <Zap size={34} strokeWidth={1.75} /> : l.artId === "eye" || l.artId === "eye-optics" ? <Eye size={34} strokeWidth={1.75} /> : l.artId === "em-induction" ? <Magnet size={34} strokeWidth={1.75} /> : l.artId === "density" || l.artId === "mass-conservation" ? <Scale size={34} strokeWidth={1.75} /> : l.artId === "gene-protein" ? <Dna size={34} strokeWidth={1.75} /> : l.artId === "ecology-tolerance" ? <Fish size={34} strokeWidth={1.75} /> : l.artId === "food-web" ? <Network size={34} strokeWidth={1.75} /> : <FlaskConical size={34} strokeWidth={1.75} />}
                </div>
                <span className="art-caption">NEXALAB / EXPERIMENT {l.number}</span>
              </div>
              <div className="lab-copy">
                <div className="lab-meta">
                  <span className="lab-tag-badge">{l.tag}</span>
                  {l.exploreCard && <span className="lab-tag-badge lab-modes-badge">{t.twoModes}</span>}
                  <span className="lab-grade-badge">{l.gradeLabel}</span>
                </div>
                <h3>{l.title}</h3>
                <p>{l.description}</p>
                <div className="card-footer">
                  <span>{guided && role === "STUDENT" ? t.basicsFirst : t.explore}</span>
                  <span className="round-arrow">
                    <ArrowUpRight size={17} />
                  </span>
                </div>
              </div>
            </Link>
            {l.exploreCard && ["STUDENT", "TEACHER"].includes(role) && !(guided && role === "STUDENT") && <div className="lab-library-mode-row" data-testid="lab-mode-row">
              <span className="lab-library-lesson-label">{t.modesLabel}</span>
              <Link to={"/labs/" + l.id} className="lab-mode-chip">{t.guidedMode}</Link>
              <Link to={"/labs/" + l.exploreCard.id} className="lab-mode-chip" aria-label={`${t.exploreMode}: ${l.exploreCard.title}`}>{t.exploreMode}<ArrowUpRight size={14} aria-hidden="true" /></Link>
            </div>}
            {!!l.lessonLinks?.length && <div className="lab-library-lesson-row">
              <span className="lab-library-lesson-label">{t.relatedLesson}:</span>
              <Link
                className="lab-library-lesson-primary"
                aria-label={`${t.relatedLesson}: ${l.lessonLinks[0].title}`}
                to={relatedLessonHref(l.lessonLinks[0].lessonId)}
              >
                <span>{l.lessonLinks[0].title}</span><ArrowUpRight size={15} aria-hidden="true" />
              </Link>
              {l.lessonLinks.length > 1 && <details className="lab-library-lesson-more">
                <summary aria-label={t.moreRelatedLessons(l.lessonLinks.length - 1)}>+{l.lessonLinks.length - 1}</summary>
                <ul>
                  {l.lessonLinks.slice(1).map((lesson) => <li key={lesson.lessonId}><Link to={relatedLessonHref(lesson.lessonId)}>{lesson.title}<ArrowUpRight size={14} aria-hidden="true" /></Link></li>)}
                </ul>
              </details>}
            </div>}
          </article>
        ))}
        {filteredCards.length === 0 && cards.length > 0 && (
          <div className="lab-empty-filter-state">
            <FlaskConical size={36} className="lab-empty-icon" />
            <p className="lab-empty-message">{t.noMatches}</p>
            <button
              type="button"
              className="lab-reset-btn primary"
              onClick={handleResetFilters}
            >
              <RotateCcw size={14} />
              {t.resetFilters}
            </button>
          </div>
        )}
        {role === "STUDENT" && labs.isSuccess && cards.length === 0 && <p className="notice">{t.nonePublished}</p>}
      </div>
      {showDisclaimer && labs.data !== undefined && <div className="notice">{t.disclaimer}</div>}
    </div>
  );
}

export function LabLibrary() {
  return (
    <>
      <PageHeading
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />
      <LabCards showFilters showDisclaimer />
      <KitComponents />
    </>
  );
}
