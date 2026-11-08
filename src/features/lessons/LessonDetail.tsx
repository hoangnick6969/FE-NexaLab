import { chapterLessonHref } from "./lesson-navigation";
import { groupLabOutcomes, markMissingFigureReferences, normalizeLessonMarkdown, stripRepeatedSectionHeading } from "./lesson-content-format";
import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, ExternalLink, FileText, FlaskConical, Play } from "lucide-react";
import { api, idempotencyKey, isAssetUrl, openMaterial, useAuth, type StudentPathway } from "../../lib/api";
import { ErrorBox, PageLoader } from "../../components/ui";
import { useActionToast } from "../../components/ActionToasts";
import { PageHeading } from "../../components/PageHeading";
import { AttributionNote, libraryQuery } from "./library";
import { VideoLearningStep } from "./VideoLearningStep";
import { httpsUrl } from "../../lib/urls";
import { withAssignmentContext } from "./lesson-catalog";
import { ExerciseQuestionHint } from "../assignments/QuizQuestionHint";
import { defineText } from "../../i18n";
import SourcePdfViewer from "../ebook/SourcePdfViewer";
import { lessonLabHref, lessonLabSection, relatedLessonHref, type LessonLab } from "../labs/pathways/lesson-lab-navigation";
import { labInfo } from "../labs/lab-info";
import "./lesson-detail-ux.css";

const text = defineText({
  vi: {
    opening: "Đang mở bài học…",
    backToLibrary: "Quay lại thư viện",
    cannotOpen: "Không mở được bài học",
    notPublished: "Bài học chưa được phát hành hoặc không tồn tại.",
    backToLessons: "Quay lại bài học",
    reading: "Nội dung bài",
    video: "Video bài giảng",
    exercise: "Bài tập luyện tập",
    cards: "Thẻ ôn tập",
    materials: "Tài liệu",
    practiceLabs: "Thực hành Lab",
    supplementaryLab: "Lab gắn với bài học",
    labIntro: "Vận dụng kiến thức vừa học qua dự đoán, quan sát và giải thích trong mô phỏng.",
    openLab: "Mở hoạt động Lab",
    viewLabLibrary: "Xem Lab trong thư viện",
    relatedSection: "Phần kiến thức liên quan",
    readSection: "Xem phần kiến thức",
    grade: (grade: number) => `LỚP ${grade}`,
    sample: "Dữ liệu mẫu",
    contentTabs: "Nội dung bài học",
    completed: "Đã hoàn thành",
    readingRegion: "Nội dung bài đọc",
    objective: "Mục tiêu bài học",
    prerequisites: "Kiến thức nền",
    loadingContent: "Đang tải nội dung và tiến độ bài học…",
    openNoticeTitle: "Bài học thuộc chương trình mở",
    openNotice: "Tiến độ đọc và video được lưu riêng. Em có thể học mà không cần bài tập được giao.",
    savingProgress: "Đang lưu tiến độ…",
    saveAgain: "Thử lưu lại",
    finishReading: "Hoàn thành phần đọc",
    readingDoneTitle: "Đã hoàn thành phần đọc",
    readingDoneBody: "Tiến độ đã được lưu.",
    readingToastTitle: "Đã lưu tiến độ đọc",
    videoToastTitle: "Đã hoàn thành video",
    videoToastBody: "Tiến độ xem đã được lưu.",
    materialToastTitle: "Tài liệu đã mở",
    materialToastBody: "Tài liệu đang mở trong tab mới.",
    materialErrorToast: "Không mở được tài liệu",
    materialErrorBody: "Hãy thử mở lại hoặc báo cho giáo viên.",
    exercisePassedToast: "Đã lưu kết quả luyện tập",
    exerciseRetryToast: "Đã lưu kết quả. Em có thể thử lại.",
    progressErrorToast: "Chưa lưu được tiến độ",
    loadingVideo: "Đang tải video bài giảng…",
    videoUnavailable: "Video bài giảng hiện chưa khả dụng.",
    cardsLocked: "Hoàn thành nội dung và video trước để mở thẻ ghi nhớ.",
    lessonMaterials: "Tài liệu bài học",
    textbook: "Sách giáo khoa",
    externalNote: "Tài liệu tham khảo bên ngoài. Trang in và trang PDF có thể khác nhau.",
    material: (n: number) => `Tài liệu ${n}`,
    nextHint: "Sau khi hoàn thành nội dung bài, tiếp tục với video bài giảng. Thẻ ôn tập nằm trong Class Space.",
    openCards: "Mở thẻ ôn tập trong Class Space",
    lessonDone: "Em đã hoàn thành nội dung bài học.",
    continueAssignment: "Tiếp tục bài được giao",
    passed: "Đã đạt",
    lastNotPassed: "Lần trước chưa đạt",
    needs: (n: number) => `cần ${n}%`,
    grading: "Đang chấm…",
    submitExercise: "Nộp bài luyện tập",
    prevLesson: "Bài trước",
    nextLesson: "Bài sau",
    chapterLessons: "Mục lục chương",
    currentLesson: "Đang học",
    supplementaryMaterials: "Tài liệu bổ sung",
    openMaterial: "Mở tài liệu",
    openingMaterial: "Đang mở…",
    materialResource: "Tài liệu của bài học",
    materialsIntro: "Sách giáo khoa và tài liệu tham khảo cho bài học này.",
    showChapterLessons: "Xem danh sách bài",
    hideChapterLessons: "Ẩn danh sách bài",
  },
  en: {
    opening: "Opening the lesson…",
    backToLibrary: "Back to the library",
    cannotOpen: "The lesson could not be opened",
    notPublished: "The lesson is not published or does not exist.",
    backToLessons: "Back to lessons",
    reading: "Lesson content",
    video: "Lesson video",
    exercise: "Practice exercise",
    cards: "Review cards",
    materials: "Materials",
    practiceLabs: "Lab practice",
    supplementaryLab: "Lab linked to this lesson",
    labIntro: "Apply what you have learned through prediction, observation and explanation in a simulation.",
    openLab: "Open Lab activity",
    viewLabLibrary: "View Lab in the library",
    relatedSection: "Related lesson section",
    readSection: "Read the related section",
    grade: (grade: number) => `GRADE ${grade}`,
    sample: "Sample data",
    contentTabs: "Lesson content",
    completed: "Completed",
    readingRegion: "Reading content",
    objective: "Lesson objective",
    prerequisites: "Prerequisites",
    loadingContent: "Loading the lesson content and progress…",
    openNoticeTitle: "Open curriculum lesson",
    openNotice: "Reading and video progress are saved separately. No assigned task is needed.",
    savingProgress: "Saving progress…",
    saveAgain: "Try saving again",
    finishReading: "Finish the reading",
    readingDoneTitle: "Reading completed",
    readingDoneBody: "Your progress has been saved.",
    readingToastTitle: "Reading progress saved",
    videoToastTitle: "Video completed",
    videoToastBody: "Your viewing progress has been saved.",
    materialToastTitle: "Material opened",
    materialToastBody: "The material opened in a new tab.",
    materialErrorToast: "The material could not be opened",
    materialErrorBody: "Try again or let your teacher know.",
    exercisePassedToast: "Practice result saved",
    exerciseRetryToast: "Result saved. You can try again.",
    progressErrorToast: "Progress could not be saved",
    loadingVideo: "Loading the lesson video…",
    videoUnavailable: "The lesson video is not available yet.",
    cardsLocked: "Finish the content and video first to open the study cards.",
    lessonMaterials: "Lesson materials",
    textbook: "Textbook",
    externalNote: "External reference. Printed and PDF page numbers may differ.",
    material: (n: number) => `Material ${n}`,
    nextHint: "After the lesson content, continue with the lesson video. Review cards are in Class Space.",
    openCards: "Open review cards in Class Space",
    lessonDone: "You have finished the lesson content.",
    continueAssignment: "Continue the assignment",
    passed: "Passed",
    lastNotPassed: "Last attempt not passed",
    needs: (n: number) => `needs ${n}%`,
    grading: "Grading…",
    submitExercise: "Submit the exercise",
    prevLesson: "Previous lesson",
    nextLesson: "Next lesson",
    chapterLessons: "Chapter lessons",
    currentLesson: "Current",
    supplementaryMaterials: "Additional materials",
    openMaterial: "Open material",
    openingMaterial: "Opening…",
    materialResource: "Lesson resource",
    materialsIntro: "Textbook and reference materials for this lesson.",
    showChapterLessons: "Show lesson list",
    hideChapterLessons: "Hide lesson list",
  },
});
const t = text();

export function LessonDetail() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const assignmentId = searchParams.get("assignmentId") || undefined;
  const [chapterListOpen, setChapterListOpen] = useState(() => typeof window === "undefined" || window.matchMedia("(min-width: 961px)").matches);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 961px)");
    const syncChapterRail = () => setChapterListOpen(desktop.matches);
    desktop.addEventListener("change", syncChapterRail);
    return () => desktop.removeEventListener("change", syncChapterRail);
  }, []);
  const user = useAuth((state) => state.user)!;
  const toast = useActionToast();
  type LessonTab = "reading" | "video" | "exercise" | "labs" | "materials";
  const requestedTab = searchParams.get("tab");
  const selectedTab: LessonTab = ["reading", "video", "exercise", "labs", "materials"].includes(requestedTab ?? "") ? requestedTab as LessonTab : "reading";
  const setActiveTab = (tab: LessonTab) => setSearchParams((previous) => {
    const next = new URLSearchParams(previous); next.set("tab", tab); return next;
  }, { replace: true });
  const [sourcePage, setSourcePage] = useState<number | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const queryClient = useQueryClient();
  const lessons = useQuery({
    queryKey: [user.role === "STUDENT" ? "open-curriculum-lesson" : "lessons", id],
    queryFn: () => user.role === "STUDENT" ? api<any>(`/open-curriculum/lessons/${encodeURIComponent(id)}`) : api<any[]>("/lessons"),
    enabled: Boolean(id) && !(user.role === "STUDENT" && assignmentId),
    staleTime: 5 * 60 * 1000,
  });
  const foundationalLabs = useQuery({
    queryKey: ["lesson-foundational-labs", id],
    queryFn: () => api<LessonLab[]>(`/lessons/${encodeURIComponent(id)}/foundational-labs`),
    enabled: ["STUDENT", "TEACHER", "ADMIN"].includes(user.role) && Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
  const linkedPublicLesson = useQuery({
    queryKey: ["open-curriculum-lesson", id],
    queryFn: () => api<any>(`/open-curriculum/lessons/${encodeURIComponent(id)}`),
    enabled: Boolean(foundationalLabs.data?.length) && (user.role !== "STUDENT" || Boolean(assignmentId)),
    staleTime: 5 * 60 * 1000,
  });
  const curriculum = useQuery({
    queryKey: ["student-open-curriculum"],
    queryFn: () => api<{ subjects?: Array<{ id: string; name: string; grades?: any[] }> }>("/open-curriculum"),
    enabled: user.role === "STUDENT",
  });
  const canViewAttribution = ["TEACHER", "ADMIN"].includes(user.role);
  const library = useQuery({
    queryKey: ["teacher-content", "lesson-detail-attribution"],
    queryFn: () => api<{ items?: any[] }>(libraryQuery({ grade: "", domain: "", outcome: "", scope: "ALL" })),
    enabled: canViewAttribution,
  });
  const materialOpen = useMutation({
    mutationFn: openMaterial,
    onSuccess: () => toast({ title: t.materialToastTitle, description: t.materialToastBody, tone: "info" }),
    onError: () => toast({ title: t.materialErrorToast, description: t.materialErrorBody, tone: "error" }),
  });
  const videoPathway = useQuery<StudentPathway>({
    queryKey: ["lesson-pathway", id, assignmentId],
    queryFn: () => api(withAssignmentContext(`/lessons/${encodeURIComponent(id)}/pathway`, assignmentId)),
    enabled: user.role === "STUDENT" && Boolean(id) && Boolean(assignmentId),
  });
  const lesson = user.role === "STUDENT" ? (assignmentId ? videoPathway.data?.lesson : lessons.data) : lessons.data?.find((item: any) => item.id === id);
  const publicLesson = linkedPublicLesson.data?.id === id ? linkedPublicLesson.data : undefined;
  const structuredContent = lesson?.structuredContent ?? publicLesson?.structuredContent;
  const sourceDocument = lesson?.sourceDocument ?? publicLesson?.sourceDocument;
  const videoMaterial = lesson?.materials?.find((item: any) => item.type === "video" && typeof item.url === "string");
  const readingStep = videoPathway.data?.steps.find((step) => step.type === "READING") ?? lesson?.steps?.find((step: any) => step.type === "READING");
  const videoStep = videoPathway.data?.steps.find((step) => step.type === "VIDEO") ?? lesson?.steps?.find((step: any) => step.type === "VIDEO");
  const studyCardsStep = videoPathway.data?.steps.find((step) => step.type === "STUDY_CARDS");
  const basicExerciseStep = lesson?.steps?.find((step: any) => step.type === "BASIC_EXERCISE");
  const hasVideo = Boolean(videoMaterial || videoStep || (user.role === "STUDENT" && videoPathway.isLoading));
  const hasMaterials = Boolean(
    httpsUrl(lesson?.subject?.ebookUrl)
    || lesson?.ebookEditions?.some((edition: any) => httpsUrl(edition.url))
    || lesson?.materials?.some((material: any) => material.type !== "video")
    || canViewAttribution
  );
  const hasLabs = Boolean(foundationalLabs.data?.length || (selectedTab === "labs" && foundationalLabs.isPending));
  const available = { reading: true, video: hasVideo, exercise: Boolean(basicExerciseStep), labs: hasLabs, materials: hasMaterials };
  const activeTab = !lesson || available[selectedTab] ? selectedTab : "reading";
  useEffect(() => {
    const frame = requestAnimationFrame(() => document.getElementById(`lesson-tab-${activeTab}`)?.scrollIntoView({ block: "nearest", inline: "nearest" }));
    return () => cancelAnimationFrame(frame);
  }, [activeTab]);
  useEffect(() => { setSourcePage(null); }, [id, activeTab]);
  useEffect(() => {
    if (activeTab !== "reading" || !lesson?.id || !location.hash) return;
    let target: string;
    try { target = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const frame = requestAnimationFrame(() => {
      const section = document.getElementById(target);
      section?.scrollIntoView({ block: "start" });
      section?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeTab, lesson?.id, location.hash, structuredContent]);
  const lessonSteps = videoPathway.data?.steps.filter((step) => ["READING", "VIDEO"].includes(step.type)) ?? [];
  const lessonComplete = lessonSteps.length > 0 && lessonSteps.every((step) => step.state === "COMPLETED");

  const chapterLessons = useMemo(() => {
    if (!curriculum.data?.subjects || !lesson) return [];
    for (const subject of curriculum.data.subjects) {
      for (const grade of subject.grades ?? []) {
        for (const chapter of grade.chapters ?? []) {
          const list = [
            ...(chapter.lessons ?? []),
            ...(chapter.topics ?? []).flatMap((top: any) => top.lessons ?? []),
          ];
          if (list.some((l: any) => l.id === id)) {
            return list;
          }
        }
      }
    }
    return [];
  }, [curriculum.data, lesson, id]);

  const currentLessonIndex = chapterLessons.findIndex((l: any) => l.id === id);
  const prevLesson = currentLessonIndex > 0 ? chapterLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < chapterLessons.length - 1 ? chapterLessons[currentLessonIndex + 1] : null;

  const completeReading = useMutation({
    mutationFn: () => api(assignmentId
      ? withAssignmentContext(`/lessons/${encodeURIComponent(id)}/steps/${readingStep!.id}/progress`, assignmentId)
      : `/open-curriculum/lessons/${encodeURIComponent(id)}/steps/${readingStep!.id}/progress`, "PUT", { action: "complete" }),
    onSuccess: (response: any) => {
      if (response.pathway) queryClient.setQueryData(["lesson-pathway", id, assignmentId], response.pathway);
      else queryClient.setQueryData(["open-curriculum-lesson", id], (previous: any) => ({ ...previous, steps: previous.steps.map((step: any) => step.id === response.step.id ? { ...step, state: "COMPLETED", progressValue: 100 } : step) }));
      toast({ title: t.readingToastTitle, description: t.readingDoneBody });
    },
    onError: () => toast({ title: t.progressErrorToast, description: t.saveAgain, tone: "error" }),
  });
  const ebookUrl = httpsUrl(lesson?.subject?.ebookUrl);
  const ebookEdition = lesson?.ebookEditions?.find((edition: any) => httpsUrl(edition.url));
  const reconcileVideo = (updated: any) => {
    const pathway = updated.pathway ?? updated;
    const videoCompleted = pathway.steps?.some((step: any) => step.id === videoStep?.id && step.state === "COMPLETED");
    if (videoStep?.state !== "COMPLETED" && videoCompleted)
      toast({ title: t.videoToastTitle, description: t.videoToastBody });
    if (updated.pathway || updated.steps)
      queryClient.setQueryData(["lesson-pathway", id, assignmentId], pathway);
    else
      queryClient.setQueryData(["open-curriculum-lesson", id], (previous: any) => ({ ...previous, steps: previous.steps.map((step: any) => step.id === updated.step.id ? { ...step, state: updated.step.state, progressValue: updated.step.progressValue, lastPosition: updated.step.lastPosition } : step) }));
  };

  if ((assignmentId ? videoPathway.isLoading : lessons.isLoading)) return <PageLoader message={t.opening} />;
  if ((assignmentId ? videoPathway.error : lessons.error) && !lesson) return <><ErrorBox error={assignmentId ? videoPathway.error : lessons.error} /><Link className="text-button" to="/lessons">{t.backToLibrary}</Link></>;
  if (!lesson) return <section className="panel lesson-detail-empty"><BookOpen /><h1>{t.cannotOpen}</h1><p>{t.notPublished}</p><Link className="primary" to="/lessons">{t.backToLessons}</Link></section>;

  const learningObjective = /dữ liệu|kiểm thử|thử nghiệm|placeholder|sample/i.test(lesson.learningObjective ?? "") ? "" : lesson.learningObjective;
  const prerequisites = /dữ liệu|kiểm thử|thử nghiệm|placeholder|sample/i.test(lesson.prerequisites ?? "") ? "" : lesson.prerequisites;
  const tabs = [
    { id: "reading" as const, label: t.reading, icon: BookOpen },
    ...(hasVideo ? [{ id: "video" as const, label: t.video, icon: Play }] : []),
    ...(basicExerciseStep ? [{ id: "exercise" as const, label: t.exercise, icon: Check }] : []),
    ...(hasLabs ? [{ id: "labs" as const, label: t.practiceLabs, icon: FlaskConical }] : []),
    ...(hasMaterials ? [{ id: "materials" as const, label: t.materials, icon: FileText }] : []),
  ];
  const changeTabByKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setActiveTab(tabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };
  const materialsTab = tabs.some((tab) => tab.id === "materials");
  const supplementaryMaterials = lesson.materials?.filter((material: any) => material.type !== "video") ?? [];
  const sections = structuredContent?.learningContent?.sections ?? [];
  const waitingForSection = !structuredContent && linkedPublicLesson.isFetching;
  const sectionFor = (lab: LessonLab) => {
    const sectionId = lessonLabSection(id, lab.labId);
    if (!sectionId) return undefined;
    return sections.find((section: any) => section.id === sectionId);
  };
  const labCard = (lab: LessonLab, inline = false, primary = false) => {
    const section = sectionFor(lab);
    const preview = labInfo.find((item) => item.id === lab.labId)?.thumbnail;
    return <article className={`lesson-lab-card${inline ? " is-inline" : ""}`} key={lab.releaseId}>
      {preview && <img className="lesson-lab-preview" src={preview} alt="" loading="lazy" decoding="async" />}
      <div className="lesson-lab-copy">
        <span className="lesson-lab-chip">{t.supplementaryLab}</span>
        <h3>{lab.title}</h3>
        {lab.objective && <ul>{groupLabOutcomes(lab.objective).map((outcome) => <li key={outcome}>Em sẽ {outcome.charAt(0).toLocaleLowerCase("vi") + outcome.slice(1)}</li>)}</ul>}
        {section && <p className="lesson-lab-section-label">{t.relatedSection}: <strong>{section.heading}</strong></p>}
        <div className="button-row">
          {waitingForSection ? <button className={primary && !inline ? "primary" : "lesson-lab-link"} type="button" disabled aria-busy="true">{t.loadingContent}</button> : <Link className={primary && !inline ? "primary" : "lesson-lab-link"} to={user.role === "ADMIN" ? `/labs#lab-${encodeURIComponent(lab.labId)}` : lessonLabHref(lab, id, assignmentId, section?.id)}>{user.role === "ADMIN" ? t.viewLabLibrary : t.openLab}<ArrowRight size={15} /></Link>}
          {!inline && section && <Link className="lesson-lab-link" to={relatedLessonHref(id, "reading", assignmentId, section.id)}>{t.readSection}</Link>}
        </div>
      </div>
    </article>;
  };

  return <div className="lesson-detail-page">
    <PageHeading title={lesson.title} action={lesson.synthetic && user.role !== "STUDENT" ? <span className="badge outline">{t.sample}</span> : undefined} />

    <ErrorBox error={foundationalLabs.error} />
    <ErrorBox error={linkedPublicLesson.error} />

    <div className="lesson-detail-tabs" role="tablist" aria-label={t.contentTabs}>
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        return <button key={tab.id} ref={(element) => { tabRefs.current[index] = element; }} type="button" role="tab" id={`lesson-tab-${tab.id}`} aria-selected={activeTab === tab.id} aria-controls={`lesson-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => changeTabByKeyboard(event, index)}><Icon size={16} />{tab.label}{((tab.id === "reading" && readingStep?.state === "COMPLETED") || (tab.id === "video" && videoStep?.state === "COMPLETED")) && <Check size={15} aria-label={t.completed} />}</button>;
      })}
    </div>

    {/* Lesson content and chapter navigation */}
    <div className={`lesson-detail-two-col${user.role === "STUDENT" && chapterLessons.length > 1 ? " has-chapter-rail" : ""}`}>
      {user.role === "STUDENT" && chapterLessons.length > 1 && (
        <aside className="lesson-chapter-picker" aria-labelledby="lesson-chapter-title">
          <div className="toc-sidebar-header">
            <div className="toc-sidebar-heading">
              <span className="toc-sidebar-kicker">{t.chapterLessons}</span>
              <h2 id="lesson-chapter-title">{lesson.chapter || t.chapterLessons}</h2>
              <div className="toc-sidebar-meta">
                <span className="toc-meta-badge">
                  {chapterLessons.length} {t.chapterLessons.toLowerCase().includes("mục lục") ? "bài" : "lessons"}
                </span>
                {currentLessonIndex >= 0 && (
                  <span className="toc-meta-pos">
                    {t.chapterLessons.toLowerCase().includes("mục lục") ? `Bài ${currentLessonIndex + 1}/${chapterLessons.length}` : `${currentLessonIndex + 1}/${chapterLessons.length}`}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="toc-sidebar-toggle"
              aria-label={chapterListOpen ? t.hideChapterLessons : t.showChapterLessons}
              aria-expanded={chapterListOpen}
              aria-controls="lesson-chapter-toc-list"
              onClick={() => setChapterListOpen((open) => !open)}
              title={chapterListOpen ? t.hideChapterLessons : t.showChapterLessons}
            >
              <span className="toc-toggle-label">{chapterListOpen ? t.hideChapterLessons : t.showChapterLessons}</span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>
          </div>
          <ol id="lesson-chapter-toc-list" className={`toc-sidebar-list${chapterListOpen ? " is-open" : ""}`}>
            {chapterLessons.map((item: any, index: number) => {
              const isCurrent = item.id === id;
              const linkUrl = chapterLessonHref(item.id, id, assignmentId);
              return (
                <li key={item.id}>
                  <Link
                    to={linkUrl}
                    className={`toc-sidebar-link${isCurrent ? " is-current" : ""}`}
                    aria-current={isCurrent ? "page" : undefined}
                    title={item.title}
                  >
                    <span className="toc-item-num" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="toc-item-body">
                      <span className="toc-item-title">{item.title}</span>
                      {isCurrent && (
                        <span className="toc-item-current">
                          <span className="toc-current-dot" aria-hidden="true" />
                          {t.currentLesson}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </aside>
      )}

      {/* Main lesson content */}
      <div className="lesson-detail-main-col">
        {/* Thin progress bar */}
        {user.role === "STUDENT" && readingStep && readingStep.state !== "COMPLETED" && (
          <div className="lesson-reading-progress-bar" role="progressbar" aria-valuenow={readingStep?.state === "COMPLETED" ? 100 : (readingStep?.progressValue ?? 0)} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="lesson-progress-indicator"
              style={{ transform: `scaleX(${(readingStep?.state === "COMPLETED" ? 100 : (readingStep?.progressValue ?? 0)) / 100})` }}
            />
          </div>
        )}

        {activeTab === "reading" && <div className={`lesson-source-layout${sourcePage ? " is-open" : ""}`}><section id="lesson-panel-reading" role="tabpanel" aria-labelledby="lesson-tab-reading" className="panel lesson-detail-reading lesson-tab-panel">
          <div className="lesson-reading-scroll" role="region" aria-label={t.readingRegion} tabIndex={0}>
            {user.role === "STUDENT" && !assignmentId && <div className="lesson-open-curriculum-note" role="note">
              <BookOpen size={20} aria-hidden="true" />
              <span><strong>{t.openNoticeTitle}</strong><span>{t.openNotice}</span></span>
            </div>}
            {(learningObjective || prerequisites) && <div className="lesson-objective">{learningObjective && <><span className="lesson-objective-label">{t.objective}</span><div className="lesson-objective-content"><LessonMarkdown value={objectiveMarkdown(learningObjective)} /></div></>}{prerequisites && <small>{t.prerequisites}: {prerequisites}</small>}</div>}
            {user.role === "STUDENT" && assignmentId && videoPathway.isLoading ? <p className="muted" role="status">{t.loadingContent}</p> : user.role === "STUDENT" && assignmentId && videoPathway.error ? <ErrorBox error={videoPathway.error} /> : structuredContent?.learningContent ? <StructuredLessonBody value={structuredContent} sourceAvailable={Boolean(sourceDocument)} onOpenSource={setSourcePage} renderSectionLabs={(sectionId) => foundationalLabs.data?.filter((lab) => sectionFor(lab)?.id === sectionId).map((lab) => labCard(lab, true))} /> : <LessonBody content={readingStep?.resource?.html || lesson.content} title={lesson.title} chapter={lesson.chapter} />}
          </div>
          {user.role === "STUDENT" && readingStep && readingStep.state !== "COMPLETED" && <div className="reading-completion">
            {completeReading.error && <ErrorBox error={completeReading.error} />}
            <button className="lesson-reading-complete" type="button" disabled={completeReading.isPending || readingStep.state === "LOCKED"} aria-busy={completeReading.isPending} onClick={() => completeReading.mutate()}>
              <Check size={16} aria-hidden="true" />
              {completeReading.isPending ? t.savingProgress : completeReading.error ? t.saveAgain : t.finishReading}
            </button>
          </div>}
          {user.role === "STUDENT" && readingStep?.state === "COMPLETED" && (
            <div className="lesson-progress-confirmation" role="status">
              <span className="lesson-progress-icon-wrap" aria-hidden="true">
                <CheckCircle2 size={17} />
              </span>
              <div className="lesson-progress-text">
                <strong className="lesson-progress-title">{t.readingDoneTitle}</strong>
                <span className="lesson-progress-sep" aria-hidden="true">·</span>
                <span className="lesson-progress-desc">{t.readingDoneBody}</span>
              </div>
            </div>
          )}
        </section>{sourcePage && sourceDocument && <SourcePdfViewer assetVersionId={sourceDocument.assetVersionId} sourceDigest={sourceDocument.sourceDigest} initialPage={sourcePage} onClose={() => setSourcePage(null)} />}</div>}

        {activeTab === "labs" && <section id="lesson-panel-labs" role="tabpanel" aria-labelledby="lesson-tab-labs" className="panel lesson-tab-panel lesson-labs-panel">
          <p className="muted">{t.labIntro}</p>
          <div className="lesson-lab-list">{foundationalLabs.data?.map((lab, index) => labCard(lab, false, index === 0))}</div>
        </section>}

        {activeTab === "video" && <section id="lesson-panel-video" role="tabpanel" aria-labelledby="lesson-tab-video" className="panel lesson-video-feature lesson-tab-panel">
          <h2 className="lesson-tab-title">{t.video}</h2>
          {videoStep && user.role === "STUDENT" ? <VideoLearningStep lessonId={id} step={videoStep} progressPath={assignmentId ? withAssignmentContext(`/lessons/${encodeURIComponent(id)}/steps/${videoStep.id}/progress`, assignmentId) : `/open-curriculum/lessons/${encodeURIComponent(id)}/steps/${videoStep.id}/progress`} hideTranscript={/dùng chung|kiểm thử|kiểm tra giao diện/i.test(`${videoStep.resource?.title ?? ""} ${videoStep.resource?.transcript ?? ""}`)} onReconciled={reconcileVideo} />
            : videoMaterial ? <video className="video-player" controls preload="metadata" src={httpsUrl(videoMaterial.url) ?? undefined} aria-label={t.video} />
              : videoPathway.isLoading ? <p className="video-placeholder" role="status">{t.loadingVideo}</p>
                : assignmentId && videoPathway.error ? <ErrorBox error={videoPathway.error} />
                  : <p className="notice">{t.videoUnavailable}</p>}
        </section>}

        {activeTab === "exercise" && basicExerciseStep && <section id="lesson-panel-exercise" role="tabpanel" aria-labelledby="lesson-tab-exercise" className="panel lesson-tab-panel">
          <h2 className="lesson-tab-title">{t.exercise}</h2>
          <BasicExercise lessonId={id} step={basicExerciseStep} onSubmitted={(result) => queryClient.setQueryData(["open-curriculum-lesson", id], (previous: any) => ({ ...previous, steps: previous.steps.map((step: any) => step.id === basicExerciseStep.id ? { ...step, state: result.passed ? "COMPLETED" : "IN_PROGRESS", exercise: result } : step) }))} />
        </section>}

        {activeTab === "materials" && materialsTab && <section id="lesson-panel-materials" role="tabpanel" aria-labelledby="lesson-tab-materials" className="panel lesson-tab-panel lesson-materials-panel">
          <header className="lesson-materials-heading">
            <h2>{t.lessonMaterials}</h2>
            <p>{t.materialsIntro}</p>
          </header>
          {(ebookEdition || ebookUrl) && <section className="lesson-resource-group">
            <h3>{t.textbook}</h3>
            <Link className="lesson-material-card" to={`/ebooks/${lesson.subjectId}`} state={{ fromLessonId: lesson.id, editionId: ebookEdition?.version ?? null, ebookUrl: ebookEdition?.url, initialPhysicalPage: ebookEdition?.locator?.physicalPageIndex ?? ebookEdition?.fallbackPhysicalPage ?? 1, externalResource: true }}>
              <span className="lesson-material-icon"><BookOpen size={18} aria-hidden="true" /></span>
              <span className="lesson-material-copy"><strong>{lesson.subject.name}</strong><small>{t.externalNote}</small></span>
              <span className="lesson-material-action">{t.openMaterial}<ArrowRight size={16} aria-hidden="true" /></span>
            </Link>
          </section>}
          {supplementaryMaterials.length > 0 && <section className="lesson-resource-group">
            <h3>{t.supplementaryMaterials}</h3>
            <ul className="lesson-material-list">
              {supplementaryMaterials.map((material: any, index: number) => {
                const title = material.title || t.material(index + 1);
                const url = httpsUrl(material.url);
                return <li key={`${material.url}-${index}`}>
                  <MaterialRow
                    title={title}
                    description={t.materialResource}
                    actionLabel={materialOpen.isPending ? t.openingMaterial : t.openMaterial}
                    onOpen={isAssetUrl(material.url) ? () => materialOpen.mutate(material.url) : undefined}
                    href={!isAssetUrl(material.url) ? url ?? undefined : undefined}
                    disabled={materialOpen.isPending}
                  />
                </li>;
              })}
            </ul>
          </section>}
          <ErrorBox error={materialOpen.error} />
          {canViewAttribution && <AttributionNote value={library.data?.items?.find((item) => item.id === lesson.id)?.attribution} />}
        </section>}

        {/* Bottom navigation for prev/next lesson */}
        {user.role === "STUDENT" && (prevLesson || nextLesson) && (
          <nav className="lesson-prev-next-nav bottom" aria-label="Điều hướng bài học cuối bài">
            {prevLesson ? (
              <Link
                className="lesson-nav-btn prev"
                to={chapterLessonHref(prevLesson.id, id, assignmentId)}
              >
                <ArrowLeft size={16} aria-hidden="true" /> {t.prevLesson}: {prevLesson.title}
              </Link>
            ) : <span />}
            {nextLesson && (
              <Link
                className="lesson-nav-btn next"
                to={chapterLessonHref(nextLesson.id, id, assignmentId)}
              >
                {t.nextLesson}: {nextLesson.title} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </nav>
        )}

        {activeTab === "reading" && user.role === "STUDENT" && studyCardsStep && <p className="lesson-reading-next-hint">{t.nextHint}</p>}
        {user.role === "STUDENT" && studyCardsStep && assignmentId && <p><Link className="secondary" to={`/classes?tab=resources&assignmentId=${encodeURIComponent(assignmentId)}`}>{t.openCards}</Link></p>}
        {user.role === "STUDENT" && lessonComplete && <div className="lesson-next-action"><p>{t.lessonDone}</p>{assignmentId && <Link className="primary" to={`/assignments/${encodeURIComponent(assignmentId)}`}>{t.continueAssignment} <ArrowRight size={16} /></Link>}</div>}
      </div>

    </div>
  </div>;
}

function MaterialRow({
  title,
  description,
  actionLabel,
  href,
  onOpen,
  disabled = false,
}: {
  title: string;
  description: string;
  actionLabel: string;
  href?: string;
  onOpen?: () => void;
  disabled?: boolean;
}) {
  const content = <>
    <span className="lesson-material-icon"><FileText size={18} aria-hidden="true" /></span>
    <span className="lesson-material-copy"><strong>{title}</strong><small>{description}</small></span>
    <span className="lesson-material-action">{actionLabel}<ExternalLink size={15} aria-hidden="true" /></span>
  </>;

  if (onOpen) {
    return <button className="lesson-material-row" type="button" aria-label={`${actionLabel}: ${title}`} disabled={disabled} aria-busy={disabled} onClick={onOpen}>{content}</button>;
  }
  if (href) {
    return <a className="lesson-material-row" aria-label={`${actionLabel}: ${title}`} href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  return <div className="lesson-material-row is-unavailable" aria-disabled="true">{content}</div>;
}

function BasicExercise({ lessonId, step, onSubmitted }: { lessonId: string; step: any; onSubmitted: (result: any) => void }) {
  const toast = useActionToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const attempt = useMutation({
    mutationFn: () => api<any>(`/open-curriculum/lessons/${encodeURIComponent(lessonId)}/exercises/${encodeURIComponent(step.id)}/attempts`, "POST", {
      answers: step.resource.questions.map((question: any) => ({ questionId: question.id, optionId: answers[question.id] })),
      idempotencyKey: idempotencyKey(),
    }),
    onSuccess: (result) => {
      onSubmitted(result);
      toast({ title: result.passed ? t.exercisePassedToast : t.exerciseRetryToast, tone: result.passed ? "success" : "info" });
    },
    onError: () => toast({ title: t.progressErrorToast, description: t.saveAgain, tone: "error" }),
  });
  const exercise = step.resource;
  return <form onSubmit={(event) => { event.preventDefault(); attempt.mutate(); }}>
    {exercise.questions.map((question: any, index: number) => <fieldset className="exercise-question" key={question.id}>
      <legend>{index + 1}. {question.prompt}</legend>
      {question.options.map((option: any) => <label className="check" key={option.id}><input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} required />{option.text}</label>)}
      {step.state !== "COMPLETED" && <ExerciseQuestionHint lessonId={lessonId} stepId={step.id} questionId={question.id} />}
    </fieldset>)}
    <ErrorBox error={attempt.error} />
    {step.exercise && <p className={step.exercise.passed ? "notice" : "muted"} role="status">{step.exercise.passed ? t.passed : t.lastNotPassed}: {step.exercise.score}%. {t.needs(step.exercise.passThreshold)}</p>}
    <button className="primary" type="submit" disabled={attempt.isPending || Object.keys(answers).length !== exercise.questions.length}>{attempt.isPending ? t.grading : t.submitExercise}</button>
  </form>;
}

function objectiveMarkdown(value: string) {
  return value.replace(/(^|\s)■\s*/gu, (_marker, prefix: string) => `${prefix.trimEnd()}\n- `)
    .split(/\r?\n/)
    .map((line) => line.trimStart().startsWith("- ") || !line.trim() ? line : `${line}  `)
    .join("\n");
}

function LessonMarkdown({ value, displayMath = false }: { value: string; displayMath?: boolean }) {
  const lessonText = normalizeLessonMarkdown(value);
  const hasDelimitedMath = /\$[^$]+\$/.test(lessonText);
  const trimmedValue = lessonText.trim();
  const displayValue = displayMath && hasDelimitedMath
    ? lessonText.replace(/\$([^$]+)\$/g, (_match, formula: string) => `\n\n$$\n${formula}\n$$\n\n`)
    : displayMath && /^\\[A-Za-z]+/.test(trimmedValue)
      ? `$$\n${trimmedValue}\n$$`
      : lessonText;
  let inDisplayMath = false;
  const markdown = displayValue.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("$$")) {
      if (!trimmed.endsWith("$$") || trimmed.length === 2) inDisplayMath = !inDisplayMath;
      return line;
    }
    if (inDisplayMath) return line;
    return /^\\[A-Za-z]+/.test(trimmed) ? `$$\n${trimmed}\n$$` : line;
  }).join("\n");
  return <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { throwOnError: false, trust: false }]]}>{markdown}</ReactMarkdown>;
}

function StructuredLessonBody({ value, sourceAvailable, onOpenSource, renderSectionLabs }: { value: any; sourceAvailable: boolean; onOpenSource: (page: number) => void; renderSectionLabs?: (sectionId: string) => React.ReactNode }) {
  const content = value.learningContent ?? {};
  const pageByBlock = new Map<string, { pdfPage?: number; printedPageLabel?: string }>();
  for (const block of value.sourceBlocks ?? []) {
    if (typeof block?.id !== "string") continue;
    const pdfPage = Number.isInteger(block.physicalPageIndex) && block.physicalPageIndex > 0 ? block.physicalPageIndex : undefined;
    const printedPageLabel = typeof block.printedPageLabel === "string" && block.printedPageLabel.trim() ? block.printedPageLabel.trim() : undefined;
    if (pdfPage || printedPageLabel) pageByBlock.set(block.id, { pdfPage, printedPageLabel });
  }
  const evidence = (ids: unknown) => {
    if (!Array.isArray(ids)) return null;
    const blocks = ids.filter((id): id is string => typeof id === "string");
    if (!blocks.length) return null;
    const references = [...new Map(blocks.flatMap((id) => {
      const reference = pageByBlock.get(id);
      if (!reference) return [];
      const label = reference.pdfPage ? `PDF trang ${reference.pdfPage}` : "";
      const printed = reference.printedPageLabel ? `trang in ${reference.printedPageLabel}` : "";
      const text = [label, printed].filter(Boolean).join(", ");
      return text ? [[`${reference.pdfPage ?? "printed"}:${reference.printedPageLabel ?? ""}`, { text, page: reference.pdfPage, printedPage: reference.printedPageLabel }] as const] : [];
    })).values()];
    return <span className="lesson-structured-sources">
      {references.length ? references.map((reference) => (
        <small className="lesson-structured-source" key={`${reference.page}:${reference.text}`}>
          {reference.page ? <>
            <button type="button" className={`source-sgk-light-btn${sourceAvailable ? "" : " is-disabled"}`}
              disabled={!sourceAvailable}
              title={sourceAvailable ? `Nguồn ${reference.text}` : `Nguồn ${reference.text}. Bản PDF nguồn hiện chưa khả dụng.`}
              aria-label={`Xem trong SGK, ${reference.text}`}
              onClick={() => onOpenSource(reference.page!)}>
              SGK, {reference.printedPage ? `trang ${reference.printedPage}` : `PDF trang ${reference.page}`}
            </button>
            {!sourceAvailable && <span className="lesson-source-unavailable" role="note">Bản PDF nguồn hiện chưa khả dụng.</span>}
          </> : <span>Nguồn SGK: {reference.text}</span>}
        </small>
      )) : <small className="lesson-structured-source"><span>Nguồn sách giáo khoa</span></small>}
    </span>;
  };
  const textOf = (item: any) => typeof item === "string" ? item : item?.text ?? item?.content ?? item?.prompt ?? "";
  const coveredBlocks = new Set<string>();
  const renderedText = new Set<string>();
  const sectionTextByBlock = new Map<string, string[]>();
  const normalize = (value: string) => value.replace(/\$+/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("vi");
  if (typeof content.summary === "string") renderedText.add(normalize(content.summary));
  const sections = Array.isArray(content.sections) ? content.sections : [];
  const summarySourceIds = Array.isArray(content.summarySourceBlockIds) ? content.summarySourceBlockIds : [];
  const sectionSourceIds = new Set(sections.flatMap((section: any) => Array.isArray(section.sourceBlockIds) ? section.sourceBlockIds : []));
  const summaryDuplicatesSection = summarySourceIds.some((id: unknown) => typeof id === "string" && sectionSourceIds.has(id))
    || sections.some((section: any) => normalize(section.content ?? "") === normalize(content.summary ?? ""));
  const renderSupplement = (item: any, key: string | number, displayMath = false) => {
    const rawText = textOf(item);
    const ids = Array.isArray(item?.sourceBlockIds) ? item.sourceBlockIds.filter((id: unknown): id is string => typeof id === "string") : [];
    let uniqueText = rawText;
    for (const sectionText of ids.flatMap((id: string) => sectionTextByBlock.get(id) ?? [])) {
      const normalizedUnique = normalize(uniqueText);
      const normalizedSection = normalize(sectionText);
      if (!normalizedUnique || !normalizedSection) continue;
      if (normalizedSection.includes(normalizedUnique)) return null;
      if (!normalizedUnique.includes(normalizedSection)) continue;
      if (!uniqueText.includes(sectionText)) return null;
      uniqueText = uniqueText.replace(sectionText, " ").trim();
    }
    const normalized = normalize(uniqueText);
    if (!normalized || renderedText.has(normalized)) return null;
    renderedText.add(normalized);
    ids.forEach((id: string) => coveredBlocks.add(id));
    const itemTitle = typeof item?.title === "string" ? item.title.trim() : typeof item?.label === "string" ? item.label.trim() : "";
    return <div className="lesson-structured-item" key={item?.id ?? key}>{itemTitle && normalize(itemTitle) !== normalized && <h4>{itemTitle}</h4>}<LessonMarkdown value={markMissingFigureReferences(uniqueText)} displayMath={displayMath} />{evidence(ids)}</div>;
  };
  const range = value.pdfPageRange ? `PDF ${value.pdfPageRange.start}–${value.pdfPageRange.end}` : "";
  return <div className="lesson-content lesson-structured-content">
    {content.summary && !summaryDuplicatesSection && <section className="lesson-structured-summary" aria-label="Tóm tắt bài học"><h3>Tóm tắt bài học</h3><div className="lesson-structured-summary-content"><LessonMarkdown value={content.summary} /></div></section>}
    {sections.map((section: any, index: number) => {
      const ids = Array.isArray(section.sourceBlockIds) ? section.sourceBlockIds : [];
      ids.forEach((id: unknown) => { if (typeof id === "string") coveredBlocks.add(id); });
      let body = typeof section.content === "string" ? section.content : "";
      if (section.heading) body = stripRepeatedSectionHeading(body, String(section.heading));
      const comparable = (text: string) => normalize(text).replace(/^\d+[.)]\s*/, "");
      const bodyRepeatsHeading = Boolean(section.heading && body && comparable(section.heading) === comparable(body));
      renderedText.add(normalize(`${section.heading ?? ""} ${body}`));
      if (body) renderedText.add(normalize(body));
      if (typeof section.heading === "string") renderedText.add(normalize(section.heading));
      ids.forEach((id: unknown) => {
        if (typeof id !== "string") return;
        const texts = [body, typeof section.heading === "string" ? section.heading : ""].filter(Boolean);
        sectionTextByBlock.set(id, [...(sectionTextByBlock.get(id) ?? []), ...texts]);
      });
      const rawHeading = typeof section.heading === "string" ? section.heading.trim() : "";
      const displayHeading = rawHeading === "?" ? "Câu hỏi & Thảo luận" : rawHeading.replace(/^#{1,6}\s+/, "").trim();
      body = markMissingFigureReferences(body);
      const sectionId = section.id ?? `lesson-section-${index}`;
      const headingId = `${sectionId}-heading`;
      return <section key={section.id ?? index} id={sectionId} aria-labelledby={headingId} tabIndex={-1}>
      <h3 id={headingId}>{displayHeading || `Nội dung ${String(index + 1).padStart(2, "0")}`}</h3>{body && !bodyRepeatsHeading && <div className="lesson-structured-markdown"><LessonMarkdown value={body} /></div>}{evidence(ids)}
      {typeof section.id === "string" && renderSectionLabs?.(section.id)}
    </section>;
    })}
    {(content.knowledgeUnits ?? []).map((unit: any, index: number) => {
      const claims = (unit.claims ?? []).map((claim: any, claimIndex: number) => renderSupplement({ ...claim, sourceBlockIds: claim.sourceBlockIds ?? unit.sourceBlockIds }, claim.id ?? claimIndex)).filter(Boolean);
      const headingId = `lesson-knowledge-${unit.id ?? index}-heading`;
      return claims.length ? <section key={unit.id ?? index} aria-labelledby={headingId}><h3 id={headingId}>{unit.title || `Kiến thức trọng tâm ${String(index + 1).padStart(2, "0")}`}</h3>{claims}</section> : null;
    })}
    {[
      ["Khái niệm", content.definitions, false],
      ["Công thức", content.formulas, true],
      ["Bảng", content.tables, false],
      ["Ví dụ", content.examples, false],
      ["Luyện tập trong nguồn", content.basicExercises, false],
    ].map(([heading, items, displayMath]) => {
      const rendered = (Array.isArray(items) ? items : []).map((item: any, index: number) => renderSupplement(item, index, Boolean(displayMath))).filter(Boolean);
      const headingId = `lesson-supplement-${String(heading).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;
      return rendered.length ? <section key={String(heading)} aria-labelledby={headingId}><h3 id={headingId}>{heading}</h3>{rendered}</section> : null;
    })}
    {(value.book?.title || range) && <small className="lesson-structured-provenance">Nguồn: {[value.book?.title, value.book?.author, value.book?.version, range].filter(Boolean).join(", ")}</small>}
  </div>;
}

function LessonBody({ content, title, chapter }: { content: string; title: string; chapter: string }) {
  const htmlTags = /<\s*\/?\s*(?:h[1-6]|p|div|ul|ol|li|table|blockquote|img|figure|br|strong|em)\b/i;
  if (htmlTags.test(content)) {
    const sanitized = DOMPurify.sanitize(content)
      .replace(/<h1(?=[\s>])/gi, "<h2").replace(/<\/h1\s*>/gi, "</h2>")
      .replace(/<h[4-6](?=[\s>])/gi, "<h3").replace(/<\/h[4-6]\s*>/gi, "</h3>");
    return <div className="lesson-content" dangerouslySetInnerHTML={{ __html: sanitized }} />;
  }

  const lines = content.replace(/\r\n?/g, "\n").split("\n")
    .map((line) => line.trim().replace(/\b(?:OI\s+TRITHUC|CUOC\s+SG|DI\s+CUOC\s+SONG)\b/gi, "").trim())
    .flatMap((line) => line.split(/(?<!\d)(?<=[.!?])\s+(?=\p{Lu})/u))
    .filter((line) => line.length > 0 && !/^\d{1,3}$/.test(line));
  const titleKey = title.trim().toLocaleLowerCase("vi");
  const chapterKey = chapter.trim().toLocaleLowerCase("vi");
  let atDocumentHeader = true;
  const visible = lines.filter((line) => {
    const normalized = line.toLocaleLowerCase("vi");
    const headerLine = /^b[aàáảãạ]i\s+\d+\b/i.test(line)
      || /^chương\s+[ivxlcdm\d]+\b/i.test(line)
      || normalized === titleKey || normalized === chapterKey;
    if (atDocumentHeader && headerLine) return false;
    atDocumentHeader = false;
    return true;
  });
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let nextParagraphClass = "";
  let activeProcedure: { label: string; text: string; index: number } | null = null;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push(<p key={`p-${blocks.length}`} className={nextParagraphClass || undefined}>{paragraph.join(" ")}</p>);
    paragraph = [];
    nextParagraphClass = "";
  };
  const flushList = () => {
    if (!list.length || !listType) return;
    const List = listType;
    blocks.push(<List key={`list-${blocks.length}`}>{list.map((item, index) => <li key={index}>{item}</li>)}</List>);
    list = [];
    listType = null;
  };
  const sentenceCount = (value: string) => (value.replace(/\.{2,}/g, "").match(/[.!?](?=[\s"'’”)}\]]|$)/g) ?? []).length;
  for (const line of visible) {
    if (paragraph.length && sentenceCount(paragraph.join(" ")) >= 2 && /^\p{Lu}/u.test(line)) flushParagraph();
    const procedureLabel = line.match(/^(Chuẩn bị|Tiến hành|Quan sát|Giải thích|Hướng dẫn giải|Chú ý)\s*:\s*(.*)$/i);
    if (procedureLabel) {
      flushParagraph();
      flushList();
      const index = blocks.length;
      activeProcedure = { label: procedureLabel[1], text: procedureLabel[2], index };
      blocks.push(<p className="lesson-procedure" key={`procedure-${index}`}><strong>{activeProcedure.label}:</strong>{activeProcedure.text ? ` ${activeProcedure.text}` : ""}</p>);
      continue;
    }
    if (activeProcedure) {
      const startsNewBlock = /^(?:[IVXLC]+\s*[–—-]|\d+\s*[.)–—-]\s+|[-–•+]\s+|Hình\s+\d+|MỤC\s*TIÊU|EM\s+ĐÃ\s+HỌC|EM\s+CÓ\s+THỂ|So sánh|Khái niệm|Ảnh hưởng|Thí nghiệm|Ví dụ|Vận dụng)\b/i.test(line);
      if (!/[.!?;:]\s*$/.test(activeProcedure.text) && !startsNewBlock && !/\?\s*$/.test(line)) {
        activeProcedure.text = [activeProcedure.text, line].filter(Boolean).join(" ");
        blocks[activeProcedure.index] = <p className="lesson-procedure" key={`procedure-${activeProcedure.index}`}><strong>{activeProcedure.label}:</strong> {activeProcedure.text}</p>;
        continue;
      }
      activeProcedure = null;
    }
    const unordered = line.match(/^[-–•+]\s+(.+)/);
    const ordered = line.match(/^\d+[.)]\s+(?!Khái niệm\b|Ảnh hưởng\b|Diễn biến\b|Vai trò\b|Cấu tạo\b|Quá trình\b|Thí nghiệm\b|Đặc điểm\b)(.+)/i);
    if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      list.push((unordered ?? ordered)![1]);
      continue;
    }
    if (listType && list.length && !/[.!?;:]\s*$/.test(list[list.length - 1])) {
      list[list.length - 1] += ` ${line}`;
      continue;
    }
    flushList();
    const sectionHeading = /^(?:[IVXLC]+)\s*[–—-]\s*\S/i.test(line)
      || /^(?:MỤC\s*TIÊU|EM\s+ĐÃ\s+HỌC|EM\s+CÓ\s+THỂ|VẬN\s+DỤNG|LUYỆN\s+TẬP|THỬ\s+THÁCH)(?:\s|$)/i.test(line);
    const subsectionHeading = /^\d+\s*[.)–—-]\s+(?:Khái niệm|Ảnh hưởng|Diễn biến|Vai trò|Cấu tạo|Quá trình|Thí nghiệm|Đặc điểm)\b/i.test(line)
      || /^(?:So sánh|Khái niệm|Ảnh hưởng|Thí nghiệm|Ví dụ|Tính|Vai trò|Cấu tạo|Quá trình|Đặc điểm|Vận dụng)\b.{0,90}$/i.test(line);
    if (sectionHeading || subsectionHeading) {
      flushParagraph();
      const heading = line.replace(/^MỤC\s*TIÊU$/i, "MỤC TIÊU").replace(/^EM\s+ĐÃ\s+HỌC$/i, "EM ĐÃ HỌC").replace(/^EM\s+CÓ\s+THỂ$/i, "EM CÓ THỂ");
      blocks.push(sectionHeading
        ? <h2 key={`h2-${blocks.length}`}>{heading}</h2>
        : <h3 key={`h3-${blocks.length}`}>{heading}</h3>);
      continue;
    }
    const figureCaption = /^(?:(?:[a-z]\)\s*)?Hình\s+\d+(?:\.\d+)?\b.*|[a-z]\).{0,100}\bHình\s+\d+(?:\.\d+)?\b.*)$/i.test(line);
    if (figureCaption) {
      flushParagraph();
      blocks.push(<p className="lesson-figure-caption" key={`figure-${blocks.length}`}>{line}</p>);
      continue;
    }
    const formulaLine = line.length <= 110 && (/[→⇌=]/u.test(line) || /(?:\d+\s*)?[A-Z][A-Za-z0-9₀-₉]*\s*\+\s*(?:\d+\s*)?[A-Z][A-Za-z0-9₀-₉]*/u.test(line));
    if (formulaLine) {
      flushParagraph();
      blocks.push(<p className="lesson-formula" key={`formula-${blocks.length}`}>{line}</p>);
      continue;
    }
    if (line.length <= 60 && line === line.toLocaleUpperCase("vi") && /\p{L}/u.test(line)) {
      flushParagraph();
      blocks.push(<p className="lesson-ocr-fragment" key={`fragment-${blocks.length}`}>{line}</p>);
      continue;
    }
    if (line.trim() === "?") {
      flushParagraph();
      blocks.push(<h3 key={`h3-q-${blocks.length}`} className="lesson-section-question">Câu hỏi & Thảo luận</h3>);
      continue;
    }
    if (/\?\s*$/.test(line)) {
      const isStandaloneQuestion = paragraph.length === 0 || /:\s*$/.test(paragraph[paragraph.length - 1]);
      if (isStandaloneQuestion) {
        flushParagraph();
        nextParagraphClass = "lesson-question";
        paragraph.push(line);
        flushParagraph();
      } else {
        paragraph.push(line);
        flushParagraph();
      }
      continue;
    }
    paragraph.push(line);
  }
  flushList();
  flushParagraph();
  return <div className="lesson-content lesson-content-ocr">{blocks}</div>;
}
