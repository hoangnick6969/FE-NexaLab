import { FlaskConical, ArrowUpRight, Zap, Eye, Magnet, Scale, Search, X, RotateCcw, SlidersHorizontal, Dna } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { api, useAuth } from "../../lib/api";
import { PageHeading } from "../../components/PageHeading";
import { labInfo } from "./lab-info";
import { defineText } from "../../i18n";
import { relatedLessonHref, type RelatedLesson } from "./pathways/lesson-lab-navigation";
import { labCurriculumLabel } from "./lab-curriculum-label";

const text = defineText({
  vi: {
    grades: "Lớp 8–9",
    basicsFirst: "Học kiến thức nền trước",
    explore: "Khám phá phòng lab",
    relatedLesson: "Bài học liên quan",
    nonePublished: "Chưa có phòng thực hành nền tảng nào được phát hành.",
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
  },
  en: {
    grades: "Grades 8–9",
    basicsFirst: "Learn the basics first",
    explore: "Explore the lab",
    relatedLesson: "Related lesson",
    nonePublished: "No foundation labs are published yet.",
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
  },
});
const t = text();

export function LabCards({ guided = false, showFilters = false }: { guided?: boolean; showFilters?: boolean } = {}) {
  const role = useAuth((s) => s.user!.role);
  const labs = useQuery({ queryKey: ["labs"], queryFn: () => api<any[]>("/labs"), enabled: ["STUDENT", "TEACHER", "ADMIN"].includes(role) });

  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("default");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const cards = role === "STUDENT" ? (labs.data ?? []).flatMap((lab: any) => {
    const visual = labInfo.find((item) => item.id === lab.id);
    const label = labCurriculumLabel(lab, visual?.subject ?? "", t.grades);
    return visual ? [{ ...visual, title: lab.title, description: lab.learningObjective, subject: label.subject, gradeLabel: label.grade, lessonLinks: lab.lessonLinks as RelatedLesson[] | undefined }] : [];
  }) : labInfo.map((visual) => {
    const lab = labs.data?.find((item) => item.id === visual.id);
    const label = labCurriculumLabel(lab, visual.subject, t.grades);
    return { ...visual, title: lab?.title ?? visual.title, description: lab?.learningObjective ?? visual.description, subject: label.subject, gradeLabel: label.grade, lessonLinks: lab?.lessonLinks as RelatedLesson[] | undefined };
  });

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
        if (!title.includes(query) && !desc.includes(query) && !subj.includes(query) && !tag.includes(query)) {
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

  const handleResetFilters = () => {
    setSelectedGrade("all");
    setSelectedSubject("all");
    setSearchQuery("");
    setSortBy("default");
  };

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
              to={guided && role === "STUDENT" ? "/lessons" : ["STUDENT", "TEACHER"].includes(role) ? "/labs/" + l.id : "/labs"}
              className="lab-card"
              key={l.id}
            >
              <div className={"lab-art " + l.className + (l.thumbnail ? " has-thumbnail" : "")}>
                {l.thumbnail && <img className="lab-thumbnail-image" src={l.thumbnail} alt="" aria-hidden="true" loading="lazy" decoding="async" width="1280" height="720" onError={(event) => event.currentTarget.parentElement?.classList.add("thumbnail-failed")} />}
                <span className="lab-subject">{l.subject}</span>
                <span className="art-number">{l.number}</span>
                <div className="art-symbol">
                  {l.id === "circuit" ? <Zap size={34} strokeWidth={1.75} /> : l.id === "eye" ? <Eye size={34} strokeWidth={1.75} /> : l.id === "em-induction" ? <Magnet size={34} strokeWidth={1.75} /> : l.id === "density" || l.id === "mass-conservation" ? <Scale size={34} strokeWidth={1.75} /> : l.id === "gene-protein" ? <Dna size={34} strokeWidth={1.75} /> : <FlaskConical size={34} strokeWidth={1.75} />}
                </div>
                <span className="art-caption">NEXALAB / EXPERIMENT {l.number}</span>
              </div>
              <div className="lab-copy">
                <div className="lab-meta">
                  <span className="lab-tag-badge">{l.tag}</span>
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
            {l.lessonLinks?.map((lesson) => <Link className="lab-library-lesson" key={lesson.lessonId} to={relatedLessonHref(lesson.lessonId)}>{t.relatedLesson}: {lesson.title}<ArrowUpRight size={15} /></Link>)}
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
      <LabCards showFilters />
      <div className="notice">
        {t.disclaimer}
      </div>
    </>
  );
}
