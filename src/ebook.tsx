import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, Columns2, ExternalLink, FileText, Highlighter, Layers3, LoaderCircle, Maximize2, Minimize2, Minus, Play, Plus, StickyNote, Underline, X } from "lucide-react";
import { api, idempotencyKey, isApiError, openMaterial, useAuth, type StudentPathway } from "./api";
import { ErrorBox, PageLoader } from "./ui";
import { PageHeading } from "./App";
import { AttributionNote, libraryQuery } from "./library";
import { VideoLearningStep } from "./VideoLearningStep";
import { StudyCardsStep } from "./StudyCardsStep";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type Annotation = {
  id: string;
  pageNumber: number;
  kind: "HIGHLIGHT" | "UNDERLINE" | "NOTE";
  startOffset: number;
  endOffset: number;
  selectedText: string;
  prefix: string | null;
  suffix: string | null;
  noteText: string | null;
};
type FallbackMark = { id: string; kind: Annotation["kind"]; left: number; top: number; width: number; height: number };

function EbookCompanionPage({ document, pageNumber, zoom, onActivate }: { document: pdfjs.PDFDocumentProxy; pageNumber: number; zoom: number; onActivate: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let active = true;
    let renderTask: pdfjs.RenderTask | undefined;
    setReady(false);
    void document.getPage(pageNumber).then((page) => {
      if (!active) return;
      const base = page.getViewport({ scale: 1 });
      const host = canvas.closest(".ebook-page-viewport") as HTMLElement | null;
      const maxWidth = ((host?.clientWidth || 760) - 76) / 2;
      const viewportHeight = Math.max(260, window.innerHeight - (window.document.fullscreenElement ? 150 : 300));
      const maxHeight = Math.min((host?.clientHeight || 520) - 34, viewportHeight);
      const scale = Math.min(1.45, Math.max(0.02, Math.min(maxWidth / base.width, maxHeight / base.height))) * zoom;
      const viewport = page.getViewport({ scale });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      renderTask = page.render({ canvas, canvasContext: context, viewport, ...(outputScale === 1 ? {} : { transform: [outputScale, 0, 0, outputScale, 0, 0] }) });
      return renderTask.promise;
    }).then(() => { if (active) setReady(true); }).catch((error: unknown) => {
      if (active && !(error instanceof Error && error.name === "RenderingCancelledException")) setReady(false);
    });
    return () => { active = false; renderTask?.cancel(); };
  }, [document, pageNumber, zoom]);

  return <div className={`ebook-pdf-page companion-page${ready ? " is-ready" : ""}`} role="button" tabIndex={0} aria-label={`Chọn trang ${pageNumber}`} onClick={onActivate} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onActivate(); } }}>
    {!ready && <LoaderCircle className="spin companion-loader" aria-hidden="true" />}
    <canvas ref={canvasRef} />
  </div>;
}

const httpsUrl = (value: unknown) => {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

export function LessonDetail() {
  const { id = "" } = useParams();
  const user = useAuth((state) => state.user)!;
  const [activeTab, setActiveTab] = useState<"reading" | "video" | "exercise" | "cards" | "materials">("reading");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const queryClient = useQueryClient();
  const lessons = useQuery({
    queryKey: [user.role === "STUDENT" ? "open-curriculum-lesson" : "lessons", id],
    queryFn: () => user.role === "STUDENT" ? api<any>(`/open-curriculum/lessons/${encodeURIComponent(id)}`) : api<any[]>("/lessons"),
    enabled: Boolean(id),
  });
  const canViewAttribution = ["TEACHER", "ADMIN"].includes(user.role);
  const library = useQuery({
    queryKey: ["teacher-content", "lesson-detail-attribution"],
    queryFn: () => api<{ items?: any[] }>(libraryQuery({ grade: "", domain: "", outcome: "", scope: "ALL" })),
    enabled: canViewAttribution,
  });
  const materialOpen = useMutation({ mutationFn: openMaterial });
  const lesson = user.role === "STUDENT" ? lessons.data : lessons.data?.find((item: any) => item.id === id);
  const videoMaterial = lesson?.materials?.find((item: any) => item.type === "video" && typeof item.url === "string");
  const videoPathway = useQuery<StudentPathway>({
    queryKey: ["lesson-pathway", id],
    queryFn: () => api(`/lessons/${encodeURIComponent(id)}/pathway`),
    enabled: user.role === "STUDENT" && Boolean(id),
  });
  const readingStep = videoPathway.data?.steps.find((step) => step.type === "READING") ?? lesson?.steps?.find((step: any) => step.type === "READING");
  const videoStep = videoPathway.data?.steps.find((step) => step.type === "VIDEO") ?? lesson?.steps?.find((step: any) => step.type === "VIDEO");
  const studyCardsStep = videoPathway.data?.steps.find((step) => step.type === "STUDY_CARDS");
  const basicExerciseStep = lesson?.steps?.find((step: any) => step.type === "BASIC_EXERCISE");
  const lessonSteps = videoPathway.data?.steps.filter((step) => ["READING", "VIDEO", "STUDY_CARDS"].includes(step.type)) ?? [];
  const lessonComplete = lessonSteps.length > 0 && lessonSteps.every((step) => step.state === "COMPLETED");
  const assignmentMissing = isApiError(videoPathway.error, "ASSIGNMENT_NOT_FOUND");
  const completeReading = useMutation({
    mutationFn: () => api(assignmentMissing ? `/open-curriculum/lessons/${encodeURIComponent(id)}/steps/${readingStep!.id}/progress` : `/lessons/${encodeURIComponent(id)}/steps/${readingStep!.id}/progress`, "PUT", { action: "complete" }),
    onSuccess: (response: any) => {
      if (response.pathway) queryClient.setQueryData(["lesson-pathway", id], response.pathway);
      else queryClient.setQueryData(["open-curriculum-lesson", id], (previous: any) => ({ ...previous, steps: previous.steps.map((step: any) => step.id === response.step.id ? { ...step, state: "COMPLETED", progressValue: 100 } : step) }));
    },
  });
  const ebookUrl = httpsUrl(lesson?.subject?.ebookUrl);
  const ebookEdition = lesson?.ebookEditions?.find((edition: any) => httpsUrl(edition.url));

  if (lessons.isLoading) return <PageLoader message="Đang mở bài học…" />;
  if (lessons.error) return <><ErrorBox error={lessons.error} /><Link className="text-button" to="/lessons">Quay lại thư viện</Link></>;
  if (!lesson) return <section className="panel lesson-detail-empty"><BookOpen /><h1>Không mở được bài học</h1><p>Bài học chưa được phát hành hoặc không tồn tại.</p><Link className="primary" to="/lessons">Quay lại bài học</Link></section>;

  const hasVideo = Boolean(videoMaterial || videoStep || (user.role === "STUDENT" && videoPathway.isLoading));
  const hasCards = user.role === "STUDENT" && Boolean(studyCardsStep);
  const hasMaterials = Boolean(ebookUrl || lesson.materials?.length || canViewAttribution);
  const learningObjective = /dữ liệu|kiểm thử|thử nghiệm|placeholder|sample/i.test(lesson.learningObjective ?? "") ? "" : lesson.learningObjective;
  const prerequisites = /dữ liệu|kiểm thử|thử nghiệm|placeholder|sample/i.test(lesson.prerequisites ?? "") ? "" : lesson.prerequisites;
  const tabs = [
    { id: "reading" as const, label: "Bài đọc", icon: BookOpen },
    ...(hasVideo ? [{ id: "video" as const, label: "Video bài giảng", icon: Play }] : []),
    ...(basicExerciseStep ? [{ id: "exercise" as const, label: "Bài tập luyện tập", icon: Check }] : []),
    ...(hasCards ? [{ id: "cards" as const, label: "Thẻ ôn tập", icon: Layers3 }] : []),
    ...(hasMaterials ? [{ id: "materials" as const, label: "Tài liệu", icon: FileText }] : []),
  ];
  const changeTabByKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setActiveTab(tabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };
  const materialsTab = tabs.some((tab) => tab.id === "materials");

  return <div className="lesson-detail-page">
    <PageHeading eyebrow={`${lesson.subject.name} · LỚP ${lesson.grade}`} title={lesson.title} description={lesson.chapter} action={lesson.synthetic && user.role !== "STUDENT" ? <span className="badge outline">Dữ liệu mẫu</span> : undefined} />
    <div className="lesson-detail-tabs" role="tablist" aria-label="Nội dung bài học">
        {tabs.map((tab, index) => {
        const Icon = tab.icon;
        return <button key={tab.id} ref={(element) => { tabRefs.current[index] = element; }} type="button" role="tab" id={`lesson-tab-${tab.id}`} aria-selected={activeTab === tab.id} aria-controls={`lesson-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => changeTabByKeyboard(event, index)}><Icon size={16} />{tab.label}{((tab.id === "reading" && readingStep?.state === "COMPLETED") || (tab.id === "video" && videoStep?.state === "COMPLETED")) && <Check size={15} aria-label="Đã hoàn thành" />}</button>;
      })}
    </div>
    {activeTab === "reading" && <section id="lesson-panel-reading" role="tabpanel" aria-labelledby="lesson-tab-reading" className="panel lesson-detail-reading lesson-tab-panel">
      <div className="lesson-reading-scroll" role="region" aria-label="Nội dung bài đọc có thể cuộn" tabIndex={0}>
        {(learningObjective || prerequisites) && <div className="lesson-objective">{learningObjective && <><span className="eyebrow">MỤC TIÊU BÀI HỌC</span><p>{learningObjective}</p></>}{prerequisites && <small>Kiến thức nền · {prerequisites}</small>}</div>}
        {user.role === "STUDENT" && videoPathway.isLoading ? <p className="muted" role="status">Đang tải nội dung và tiến độ bài học…</p> : user.role === "STUDENT" && videoPathway.error && !assignmentMissing ? <ErrorBox error={videoPathway.error} /> : <LessonBody content={readingStep?.resource?.html || lesson.content} title={lesson.title} chapter={lesson.chapter} />}
      {user.role === "STUDENT" && assignmentMissing && <p className="notice">Đây là nội dung chương trình mở; tiến độ đọc và video được lưu riêng, không cần bài được giao.</p>}
      </div>
      {user.role === "STUDENT" && readingStep && readingStep.state !== "COMPLETED" && <div className="reading-completion">
        {completeReading.error && <ErrorBox error={completeReading.error} />}
        <button className="primary" type="button" disabled={completeReading.isPending || readingStep.state === "LOCKED"} onClick={() => completeReading.mutate()}>{completeReading.isPending ? "Đang lưu tiến độ…" : completeReading.error ? "Thử lưu lại" : "Hoàn thành phần đọc"}</button>
      </div>}
      {user.role === "STUDENT" && readingStep?.state === "COMPLETED" && <p className="notice" role="status">Đã hoàn thành phần đọc. Tiến độ đã được lưu.</p>}
    </section>}
    {activeTab === "video" && <section id="lesson-panel-video" role="tabpanel" aria-labelledby="lesson-tab-video" className="panel lesson-video-feature lesson-tab-panel">
      <h2 className="lesson-tab-title">Video bài giảng</h2>
      {videoStep && user.role === "STUDENT" ? <VideoLearningStep lessonId={id} step={videoStep} progressPath={assignmentMissing ? `/open-curriculum/lessons/${encodeURIComponent(id)}/steps/${videoStep.id}/progress` : undefined} hideTranscript={/dùng chung|kiểm thử|kiểm tra giao diện/i.test(`${videoStep.resource?.title ?? ""} ${videoStep.resource?.transcript ?? ""}`)} onReconciled={(updated: any) => updated.pathway ? queryClient.setQueryData(["lesson-pathway", id], updated.pathway) : queryClient.setQueryData(["open-curriculum-lesson", id], (previous: any) => ({ ...previous, steps: previous.steps.map((step: any) => step.id === updated.step.id ? { ...step, state: updated.step.state, progressValue: updated.step.progressValue, lastPosition: updated.step.lastPosition } : step) }))} />
        : videoMaterial ? <video className="video-player" controls preload="metadata" src={httpsUrl(videoMaterial.url) ?? undefined} aria-label="Video bài giảng" />
          : videoPathway.isLoading ? <p className="video-placeholder" role="status">Đang tải video bài giảng…</p>
            : videoPathway.error && !assignmentMissing ? <ErrorBox error={videoPathway.error} />
              : <p className="notice">Video bài giảng hiện chưa khả dụng.</p>}
    </section>}
    {activeTab === "exercise" && basicExerciseStep && <section id="lesson-panel-exercise" role="tabpanel" aria-labelledby="lesson-tab-exercise" className="panel lesson-tab-panel">
      <h2 className="lesson-tab-title">Bài tập luyện tập</h2>
      <BasicExercise lessonId={id} step={basicExerciseStep} onSubmitted={(result) => queryClient.setQueryData(["open-curriculum-lesson", id], (previous: any) => ({ ...previous, steps: previous.steps.map((step: any) => step.id === basicExerciseStep.id ? { ...step, state: result.passed ? "COMPLETED" : "IN_PROGRESS", exercise: result } : step) }))} />
    </section>}
    {activeTab === "cards" && studyCardsStep && <section id="lesson-panel-cards" role="tabpanel" aria-labelledby="lesson-tab-cards" className="panel lesson-tab-panel lesson-study-cards">
      <h2 className="lesson-tab-title">Thẻ ôn tập</h2>
      {studyCardsStep.state === "LOCKED" ? <p className="pathway-lock">Hoàn thành nội dung và video trước để mở thẻ ghi nhớ.</p> : <StudyCardsStep lessonId={id} step={studyCardsStep} onReconciled={(updatedPathway) => queryClient.setQueryData(["lesson-pathway", id], updatedPathway)} />}
    </section>}
    {activeTab === "materials" && materialsTab && <section id="lesson-panel-materials" role="tabpanel" aria-labelledby="lesson-tab-materials" className="panel lesson-tab-panel lesson-materials-panel">
      <h2>Tài liệu bài học</h2>
      {(ebookEdition || ebookUrl) && <Link className="lesson-material-link" to={`/ebooks/${lesson.subjectId}`} state={{ fromLessonId: lesson.id, editionId: ebookEdition?.version ?? null, ebookUrl: ebookEdition?.url, initialPhysicalPage: ebookEdition?.locator?.physicalPageIndex ?? ebookEdition?.fallbackPhysicalPage ?? 1, externalResource: true }}><BookOpen size={20} /><span><b>Sách giáo khoa · {lesson.subject.name}</b><small>Tài liệu tham khảo bên ngoài · trang in và trang PDF có thể khác nhau.</small></span><ArrowRight size={18} /></Link>}
      {lesson.materials?.filter((material: any) => material.type !== "video").map((material: any, index: number) => material.url?.startsWith("asset:") ? <button className="reader-material" type="button" key={`${material.url}-${index}`} onClick={() => materialOpen.mutate(material.url)}>{material.title || `Tài liệu ${index + 1}`} <ExternalLink size={14} /></button> : <a className="reader-material" key={`${material.url}-${index}`} href={httpsUrl(material.url) ?? undefined} target="_blank" rel="noopener noreferrer">{material.title || `Tài liệu ${index + 1}`} <ExternalLink size={14} /></a>)}
      <ErrorBox error={materialOpen.error} />
      {canViewAttribution && <AttributionNote value={library.data?.items?.find((item) => item.id === lesson.id)?.attribution} />}
    </section>}
    {activeTab === "reading" && user.role === "STUDENT" && studyCardsStep && <p className="lesson-reading-next-hint">Sau khi hoàn thành bài đọc, tiếp tục với tab Video bài giảng và thẻ ôn tập.</p>}
    {user.role === "STUDENT" && lessonComplete && <div className="lesson-next-action"><p>Em đã hoàn thành nội dung bài học.</p><Link className="primary" to={videoPathway.data?.assignment.id ? `/assignments/${videoPathway.data.assignment.id}` : "/assignments"}>Chuyển sang Bài tập <ArrowRight size={16} /></Link></div>}
  </div>;
}

function BasicExercise({ lessonId, step, onSubmitted }: { lessonId: string; step: any; onSubmitted: (result: any) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const attempt = useMutation({
    mutationFn: () => api<any>(`/open-curriculum/lessons/${encodeURIComponent(lessonId)}/exercises/${encodeURIComponent(step.id)}/attempts`, "POST", {
      answers: step.resource.questions.map((question: any) => ({ questionId: question.id, optionId: answers[question.id] })),
      idempotencyKey: idempotencyKey(),
    }),
    onSuccess: (result) => onSubmitted(result),
  });
  const exercise = step.resource;
  return <form onSubmit={(event) => { event.preventDefault(); attempt.mutate(); }}>
    {exercise.questions.map((question: any, index: number) => <fieldset className="exercise-question" key={question.id}>
      <legend>{index + 1}. {question.prompt}</legend>
      {question.options.map((option: any) => <label className="check" key={option.id}><input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} required />{option.text}</label>)}
    </fieldset>)}
    <ErrorBox error={attempt.error} />
    {step.exercise && <p className={step.exercise.passed ? "notice" : "muted"} role="status">{step.exercise.passed ? "Đã đạt" : "Lần trước chưa đạt"}: {step.exercise.score}% · cần {step.exercise.passThreshold}%</p>}
    <button className="primary" type="submit" disabled={attempt.isPending || Object.keys(answers).length !== exercise.questions.length}>{attempt.isPending ? "Đang chấm…" : "Nộp bài luyện tập"}</button>
  </form>;
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

export function EbookReader() {
  const { subjectId = "" } = useParams();
  const location = useLocation();
  const user = useAuth((state) => state.user)!;
  const queryClient = useQueryClient();
  const routeState = location.state as { fromLessonId?: string; initialPhysicalPage?: number; ebookUrl?: string } | null;
  const subjectQuery = useQuery({ queryKey: ["subjects"], queryFn: () => api<any[]>("/subjects") });
  const subject = subjectQuery.data?.find((item) => item.id === subjectId);
  const url = httpsUrl(routeState?.ebookUrl) ?? httpsUrl(subject?.ebookUrl);
  const [document, setDocument] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [fingerprint, setFingerprint] = useState("");
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [renderError, setRenderError] = useState("");
  const [renderRetry, setRenderRetry] = useState(0);
  const [renderedPage, setRenderedPage] = useState(0);
  const [mode, setMode] = useState<"read" | "highlight" | "underline" | "note">("read");
  const [selection, setSelection] = useState<{ text: string; start: number; end: number; prefix: string; suffix: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [pageInput, setPageInput] = useState("1");
  const [zoom, setZoom] = useState(1);
  const [fallbackMarks, setFallbackMarks] = useState<FallbackMark[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [bookView, setBookView] = useState(() => window.innerWidth >= 1024);
  const [notesOpen, setNotesOpen] = useState(false);
  const [turnDirection, setTurnDirection] = useState<"next" | "previous">("next");
  const [turnKey, setTurnKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const pageHostRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [hostSize, setHostSize] = useState({ width: 760, height: 640 });
  const useSpread = bookView && hostSize.width >= 760 && pageNumber > 1;
  const backPath = routeState?.fromLessonId ? `/lessons/${routeState.fromLessonId}` : "/lessons";
  const annotationsQuery = useInfiniteQuery({
    queryKey: ["ebook-annotations", user.id, subjectId, fingerprint],
    queryFn: ({ pageParam }) => api<Annotation[]>(`/subjects/${encodeURIComponent(subjectId)}/ebook-annotations?fingerprint=${encodeURIComponent(fingerprint)}&skip=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => lastPage.length === 500 ? pages.length * 500 : undefined,
    enabled: Boolean(fingerprint && url),
  });
  const saveAnnotation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api<Annotation>(`/subjects/${encodeURIComponent(subjectId)}/ebook-annotations`, "POST", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ebook-annotations", user.id, subjectId, fingerprint] }),
  });
  const updateAnnotation = useMutation({
    mutationFn: ({ id, noteText: text }: { id: string; noteText: string }) => api(`/ebook-annotations/${encodeURIComponent(id)}`, "PUT", { kind: "NOTE", noteText: text }),
    onSuccess: () => { setEditId(null); queryClient.invalidateQueries({ queryKey: ["ebook-annotations", user.id, subjectId, fingerprint] }); },
  });
  const deleteAnnotation = useMutation({
    mutationFn: (id: string) => api(`/ebook-annotations/${encodeURIComponent(id)}`, "DELETE"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ebook-annotations", user.id, subjectId, fingerprint] }),
  });

  useEffect(() => {
    if (!url) return;
    let active = true;
    let task: ReturnType<typeof pdfjs.getDocument> | undefined;
    let rangeTransport: pdfjs.PDFDataRangeTransport | undefined;
    const rangeControllers = new Set<AbortController>();
    const loadController = new AbortController();
    setLoadError(""); setDocument(null); setFingerprint(""); setPageNumber(1); setPageCount(0);
    const load = async () => {
      try {
        let length = 0;
        let firstRange: Response | null = null;
        try {
          const head = await fetch(url, { method: "HEAD", signal: loadController.signal });
          length = Number(head.headers.get("content-length"));
          if (!head.ok || !Number.isSafeInteger(length) || length <= 0) length = 0;
          if (length) firstRange = await fetch(url, { headers: { Range: "bytes=0-262143" }, signal: loadController.signal });
        } catch {
          // Fall back to PDF.js URL loading when storage does not support range metadata.
        }
        if (!active) return;
        if (length && firstRange?.status === 206) {
          const initialData = new Uint8Array(await firstRange.arrayBuffer());
          if (!active) return;
          rangeTransport = new pdfjs.PDFDataRangeTransport(length, initialData);
          rangeTransport.requestDataRange = (begin, end) => {
            const controller = new AbortController();
            rangeControllers.add(controller);
            void fetch(url, { headers: { Range: `bytes=${begin}-${end - 1}` }, signal: controller.signal })
              .then(async (response) => {
                if (response.status !== 206) throw new Error("Máy chủ không trả được một phần trang PDF");
                return new Uint8Array(await response.arrayBuffer());
              })
              .then((data) => { if (active) rangeTransport?.onDataRange(begin, data); })
              .catch((error: unknown) => {
                if (active && !(error instanceof Error && error.name === "AbortError")) {
                  setLoadError(error instanceof Error ? error.message : "Không tải được dữ liệu trang PDF");
                  void task?.destroy();
                }
              })
              .finally(() => rangeControllers.delete(controller));
          };
          rangeTransport.abort = () => { rangeControllers.forEach((controller) => controller.abort()); rangeControllers.clear(); };
          task = pdfjs.getDocument({ range: rangeTransport, rangeChunkSize: 262144, disableStream: true, disableAutoFetch: true });
        } else {
          await firstRange?.body?.cancel();
        }
        task ??= pdfjs.getDocument({ url, withCredentials: false });
        const loaded = await task.promise;
        if (!active) return;
        const initial = Number.isInteger(routeState?.initialPhysicalPage) ? routeState!.initialPhysicalPage! : 1;
        const startPage = Math.min(loaded.numPages, Math.max(1, initial));
        setDocument(loaded); setPageCount(loaded.numPages); setPageNumber(startPage); setPageInput(String(startPage));
        setFingerprint(loaded.fingerprints.find((value): value is string => Boolean(value)) ?? "");
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "Không tải được ebook");
      }
    };
    void load();
    return () => { active = false; loadController.abort(); rangeTransport?.abort(); void task?.destroy(); };
  }, [url, reloadKey, routeState?.initialPhysicalPage]);

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(window.document.fullscreenElement === readerRef.current);
    window.document.addEventListener("fullscreenchange", updateFullscreen);
    return () => window.document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  useEffect(() => {
    const host = pageHostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => setHostSize({ width: entry.contentRect.width || 760, height: entry.contentRect.height || 640 }));
    observer.observe(host);
    return () => observer.disconnect();
  }, [document]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); turnPage("previous"); }
      if (event.key === "ArrowRight") { event.preventDefault(); turnPage("next"); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    if (!document || !canvasRef.current || !textLayerRef.current) return;
    let active = true;
    let renderTask: pdfjs.RenderTask | undefined;
    let textLayer: pdfjs.TextLayer | undefined;
    const canvas = canvasRef.current;
    const textContainer = textLayerRef.current;
    setRenderError("");
    void (async () => {
      try {
        const page = await document.getPage(pageNumber);
        if (!active) return;
        const base = page.getViewport({ scale: 1 });
        const currentHostWidth = pageHostRef.current?.clientWidth || hostSize.width;
        const currentHostHeight = pageHostRef.current?.clientHeight || hostSize.height;
        const spreadWidth = useSpread ? (currentHostWidth - 76) / 2 : currentHostWidth - 48;
        const fitWidth = spreadWidth / base.width;
        const viewportHeight = Math.max(260, window.innerHeight - (isFullscreen ? 150 : 300));
        const fitHeight = Math.min(currentHostHeight - 34, viewportHeight) / base.height;
        const scale = Math.min(1.45, Math.max(0.02, Math.min(fitWidth, fitHeight))) * zoom;
        const viewport = page.getViewport({ scale });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Trình duyệt không hỗ trợ hiển thị trang PDF");
        canvas.width = Math.floor(viewport.width * outputScale); canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
        textContainer.style.width = `${viewport.width}px`; textContainer.style.height = `${viewport.height}px`;
        textContainer.replaceChildren();
        renderTask = page.render({ canvas, canvasContext: context, viewport, ...(outputScale === 1 ? {} : { transform: [outputScale, 0, 0, outputScale, 0, 0] }) });
        await renderTask.promise;
        if (!active) return;
        const content = await page.getTextContent();
        if (!active) return;
        textLayer = new pdfjs.TextLayer({ textContentSource: content, container: textContainer, viewport });
        await textLayer.render();
        if (active) setRenderedPage((value) => value + 1);
      } catch (error) {
        if (active && !(error instanceof Error && error.name === "RenderingCancelledException")) setRenderError(error instanceof Error ? error.message : "Không hiển thị được trang ebook");
      }
    })();
    setPageInput(String(pageNumber)); setSelection(null);
    return () => { active = false; renderTask?.cancel(); textLayer?.cancel(); };
  }, [document, pageNumber, hostSize, zoom, renderRetry, useSpread, isFullscreen]);

  useEffect(() => {
    const container = textLayerRef.current;
    const highlightApi = (window.CSS as any)?.highlights;
    const HighlightCtor = (window as any).Highlight;
    if (!container) return;
    if (highlightApi) {
      highlightApi.delete("nexalab-highlight"); highlightApi.delete("nexalab-underline"); highlightApi.delete("nexalab-note");
    }
    const ranges: Record<string, Range[]> = { HIGHLIGHT: [], UNDERLINE: [], NOTE: [] };
    const fallback: FallbackMark[] = [];
    const pageBounds = pageRef.current?.getBoundingClientRect();
    for (const annotation of annotationsQuery.data?.pages.flat() ?? []) {
      if (annotation.pageNumber !== pageNumber) continue;
      const range = rangeForOffsets(container, annotation.startOffset, annotation.endOffset);
      if (!range) continue;
      ranges[annotation.kind].push(range);
      if ((!highlightApi || !HighlightCtor) && pageBounds) {
        Array.from(range.getClientRects()).forEach((rect, index) => fallback.push({
          id: `${annotation.id}-${index}`, kind: annotation.kind,
          left: rect.left - pageBounds.left, top: rect.top - pageBounds.top,
          width: rect.width, height: rect.height,
        }));
      }
    }
    setFallbackMarks(fallback);
    if (!highlightApi || !HighlightCtor) return;
    for (const [kind, name] of [["HIGHLIGHT", "nexalab-highlight"], ["UNDERLINE", "nexalab-underline"], ["NOTE", "nexalab-note"]]) {
      if (ranges[kind].length) highlightApi.set(name, new HighlightCtor(...ranges[kind]));
    }
    return () => { highlightApi.delete("nexalab-highlight"); highlightApi.delete("nexalab-underline"); highlightApi.delete("nexalab-note"); };
  }, [annotationsQuery.data, pageNumber, renderedPage]);

  const saveSelected = (kind: Annotation["kind"]) => {
    if (!selection || !fingerprint || (kind === "NOTE" && !noteText.trim())) return;
    saveAnnotation.mutate({ documentFingerprint: fingerprint, pageNumber, kind, startOffset: selection.start, endOffset: selection.end, selectedText: selection.text, prefix: selection.prefix, suffix: selection.suffix, noteText: kind === "NOTE" ? noteText.trim() : null }, { onSuccess: () => { setSelection(null); setNoteText(""); setMode("read"); window.getSelection()?.removeAllRanges(); } });
  };
  const captureSelection = () => {
    if (mode === "read") return;
    const container = textLayerRef.current;
    const selected = window.getSelection();
    if (!container || !selected?.rangeCount || selected.isCollapsed) return;
    const range = selected.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return;
    const rawText = range.toString();
    const selectedText = rawText.trim();
    if (!selectedText || selectedText.length > 2000) return;
    const before = range.cloneRange(); before.selectNodeContents(container); before.setEnd(range.startContainer, range.startOffset);
    const pageText = container.textContent ?? "";
    const start = before.toString().length + (rawText.length - rawText.trimStart().length);
    const end = start + selectedText.length;
    setSelection({ text: selectedText, start, end, prefix: pageText.slice(Math.max(0, start - 120), start), suffix: pageText.slice(end, end + 120) });
  };
  useEffect(() => {
    window.document.addEventListener("selectionchange", captureSelection);
    return () => window.document.removeEventListener("selectionchange", captureSelection);
  }, [pageNumber, mode]);
  const goToPage = (next: number, direction?: "next" | "previous") => {
    if (!Number.isInteger(next) || next < 1 || next > pageCount || next === pageNumber) return;
    setTurnDirection(direction ?? (next > pageNumber ? "next" : "previous"));
    setTurnKey((value) => value + 1);
    setPageNumber(next);
  };
  const turnPage = (direction: "next" | "previous") => {
    const step = useSpread ? 2 : 1;
    const next = direction === "next"
      ? (bookView && hostSize.width >= 760 && pageNumber === 1 ? 2 : Math.min(pageCount, pageNumber + step))
      : (bookView && hostSize.width >= 760 && pageNumber <= 2 ? 1 : Math.max(1, pageNumber - step));
    goToPage(next, direction);
  };
  const toggleFullscreen = async () => {
    try {
      if (window.document.fullscreenElement) await window.document.exitFullscreen();
      else await readerRef.current?.requestFullscreen();
      setFullscreenError("");
    } catch {
      setFullscreenError("Trình duyệt này chưa hỗ trợ chế độ toàn màn hình.");
    }
  };
  const finishPageSwipe = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || event.pointerType !== "touch" || mode !== "read") return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 56 && Math.abs(dx) > Math.abs(dy) * 1.25) turnPage(dx < 0 ? "next" : "previous");
  };

  if (subjectQuery.isLoading) return <PageLoader message="Đang mở ebook…" />;
  if (subjectQuery.error) return <><ErrorBox error={subjectQuery.error} /><Link to="/lessons">Quay lại bài học</Link></>;
  if (!subject || !url) return <section className="panel lesson-detail-empty"><BookOpen /><h1>Chưa có ebook cho môn học này</h1><p>Liên kết ebook chưa được cấu hình hoặc không an toàn.</p><Link className="primary" to="/lessons">Quay lại bài học</Link></section>;
  const annotations = annotationsQuery.data?.pages.flat() ?? [];
  const companionPage = useSpread
    ? (pageNumber % 2 === 0 ? pageNumber + 1 : pageNumber - 1)
    : null;
  const activePageIsRight = Boolean(companionPage && pageNumber % 2 === 1);

  return <div className={`ebook-reader-page${selection && mode !== "read" ? " has-ebook-selection" : ""}`} ref={readerRef}>
    {!fingerprint && document && <p className="notice">Tài liệu chưa cung cấp mã phiên bản; các tính năng đồng bộ ghi chú đang tạm khóa.</p>}
    <div className="ebook-reader-layout">
      <section className="ebook-reader-main">
        <div className="ebook-toolbar" aria-label="Công cụ đọc ebook">
          <div className="ebook-book-identity">
            <Link className="ebook-icon-button" aria-label={routeState?.fromLessonId ? "Quay lại bài học" : "Quay lại thư viện"} to={backPath}><ArrowLeft size={20} /></Link>
            <div><strong>SGK {subject.name}</strong><small>Sách giáo khoa điện tử</small></div>
          </div>
          <div className="ebook-page-controls ebook-page-controls-primary">
            <button type="button" aria-label="Về trang đầu" disabled={pageNumber <= 1} onClick={() => goToPage(1, "previous")}><span aria-hidden="true">«</span></button>
            <button type="button" aria-label="Trang trước" disabled={pageNumber <= 1} onClick={() => turnPage("previous")}><ArrowLeft size={17} /></button>
            <label><span className="sr-only">Trang hiện tại</span><input aria-label="Số trang" inputMode="numeric" value={pageInput} onChange={(event) => setPageInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") goToPage(Number(pageInput)); }} onBlur={() => setPageInput(String(pageNumber))} /></label>
            <span>/ {pageCount || "–"}</span>
            <button type="button" aria-label="Trang sau" disabled={!pageCount || pageNumber >= pageCount} onClick={() => turnPage("next")}><ArrowRight size={17} /></button>
            <button type="button" aria-label="Về trang cuối" disabled={!pageCount || pageNumber >= pageCount} onClick={() => goToPage(pageCount, "next")}><span aria-hidden="true">»</span></button>
          </div>
          <div className="ebook-toolbar-actions">
            <button type="button" aria-label="Thu nhỏ" disabled={zoom <= 0.75} onClick={() => setZoom((value) => Math.max(0.75, +(value - 0.15).toFixed(2)))}><Minus size={17} /></button>
            <span className="ebook-zoom-value">{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Phóng to" disabled={zoom >= 1.6} onClick={() => setZoom((value) => Math.min(1.6, +(value + 0.15).toFixed(2)))}><Plus size={17} /></button>
            <button type="button" className={bookView ? "active" : ""} aria-pressed={bookView} aria-label={bookView ? "Chuyển sang một trang" : "Chuyển sang hai trang"} title={bookView ? "Một trang" : "Hai trang"} onClick={() => setBookView((value) => !value)}><Columns2 size={18} /></button>
            <button type="button" className={notesOpen ? "active" : ""} aria-expanded={notesOpen} aria-controls="ebook-notes-panel" aria-label="Mở ghi chú" onClick={() => setNotesOpen((value) => !value)}><StickyNote size={18} /><span className="ebook-note-count">{annotations.length}</span></button>
            <a className="ebook-toolbar-link" href={url} aria-label="Mở PDF gốc" title="Mở PDF gốc" target="_blank" rel="noopener noreferrer"><ExternalLink size={17} /></a>
            <button type="button" aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"} title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"} onClick={toggleFullscreen}>{isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
          </div>
          <div className="ebook-modes" role="group" aria-label="Công cụ đánh dấu">
            <button type="button" className={mode === "read" ? "active" : ""} onClick={() => setMode("read")}><BookOpen size={16} /> Đọc</button>
            <button type="button" className={mode === "highlight" ? "active" : ""} onClick={() => setMode("highlight")}><Highlighter size={16} /> Tô sáng</button>
            <button type="button" className={mode === "underline" ? "active" : ""} onClick={() => setMode("underline")}><Underline size={16} /> Gạch chân</button>
            <button type="button" className={mode === "note" ? "active" : ""} onClick={() => setMode("note")}><StickyNote size={16} /> Ghi chú</button>
          </div>
        </div>
        {fullscreenError && <p className="notice" role="status">{fullscreenError}</p>}
        {loadError ? <div className="ebook-load-error" role="alert"><BookOpen /><h2>Không tải được sách trong trình đọc</h2><p>Kiểm tra kết nối rồi thử lại, hoặc mở PDF gốc trong tab mới.</p><button className="primary" type="button" onClick={() => setReloadKey((value) => value + 1)}>Thử tải lại</button> <a href={url} target="_blank" rel="noopener noreferrer">Mở PDF gốc <ExternalLink size={14} /></a><small>{loadError}</small></div> : <div className="ebook-page-viewport" ref={pageHostRef} onPointerDown={(event) => { swipeStartRef.current = event.pointerType === "touch" ? { x: event.clientX, y: event.clientY } : null; }} onPointerUp={finishPageSwipe} onPointerCancel={() => { swipeStartRef.current = null; }}>
          <button className="ebook-edge-control previous" type="button" aria-label="Trang trước" disabled={pageNumber <= 1} onClick={() => turnPage("previous")}><ArrowLeft size={22} /></button>
          {(!document || renderError) && <div className="ebook-page-loading" role="status">{renderError ? <><b>Trang chưa hiển thị</b><span>{renderError}</span><button className="secondary" type="button" onClick={() => setRenderRetry((value) => value + 1)}>Thử hiển thị lại</button></> : <><LoaderCircle className="spin" /><span>Đang tải trang…</span></>}</div>}
          <div key={turnKey} className={`ebook-book${companionPage ? " is-spread" : " is-single"} turn-${turnDirection}`}>
            {document && companionPage && activePageIsRight && <EbookCompanionPage document={document} pageNumber={companionPage} zoom={zoom} onActivate={() => goToPage(companionPage, "previous")} />}
            <div className="ebook-pdf-page active-page" ref={pageRef} style={{ visibility: document && !renderError ? "visible" : "hidden" }}>
              <div className="ebook-fallback-marks" aria-hidden="true">{fallbackMarks.map((mark) => <span key={mark.id} className={`ebook-fallback-mark ${mark.kind.toLowerCase()}`} style={{ left: mark.left, top: mark.top, width: mark.width, height: mark.height }} />)}</div>
              <canvas ref={canvasRef} aria-label={`Trang ${pageNumber} của ${subject.name}`} />
              <div ref={textLayerRef} className={`textLayer ebook-text-layer${mode === "read" ? " read-only" : " annotation-mode"}`} onPointerUp={captureSelection} />
            </div>
            {document && companionPage && !activePageIsRight && companionPage <= pageCount && <EbookCompanionPage document={document} pageNumber={companionPage} zoom={zoom} onActivate={() => goToPage(companionPage, "next")} />}
          </div>
          <button className="ebook-edge-control next" type="button" aria-label="Trang sau" disabled={!pageCount || pageNumber >= pageCount} onClick={() => turnPage("next")}><ArrowRight size={22} /></button>
        </div>}
        <div className="ebook-reader-footer">
          <span>Trang {pageNumber} / {pageCount || "–"}</span>
          <input type="range" aria-label="Tiến độ đọc sách" min="1" max={Math.max(1, pageCount)} value={Math.min(pageNumber, Math.max(1, pageCount))} onChange={(event) => goToPage(Number(event.target.value))} />
          <span>{mode === "read" ? "Vuốt hoặc dùng phím ← →" : "Kéo chọn nội dung trên trang"}</span>
        </div>
      </section>
      {notesOpen && <button className="ebook-notes-scrim" type="button" aria-label="Đóng ghi chú" onClick={() => setNotesOpen(false)} />}
      <aside id="ebook-notes-panel" className={`panel ebook-annotation-panel${notesOpen ? " is-open" : ""}`} aria-hidden={!notesOpen}>
        <button className="ebook-notes-close" type="button" aria-label="Đóng ghi chú" onClick={() => setNotesOpen(false)}><X size={19} /></button>
        <div className="annotation-panel-heading"><div><span className="eyebrow">GHI CHÚ CỦA EM</span><h2>Đánh dấu & ghi chú</h2></div><span className="badge outline">{annotations.length}</span></div>
        {selection && <div className="ebook-selection-card"><small>Đoạn đã chọn</small><blockquote>{selection.text}</blockquote>{mode === "note" && <label className="field"><span>Ghi chú cho đoạn này</span><textarea rows={3} value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Viết điều em muốn nhớ…" /></label>}{mode === "read" ? <p>Chọn một công cụ để lưu đoạn này.</p> : <button className="primary" type="button" disabled={saveAnnotation.isPending || (mode === "note" && !noteText.trim())} onClick={() => saveSelected(mode === "note" ? "NOTE" : mode === "underline" ? "UNDERLINE" : "HIGHLIGHT")}>{saveAnnotation.isPending ? "Đang lưu…" : mode === "note" ? "Lưu ghi chú" : mode === "underline" ? "Gạch chân đoạn này" : "Tô sáng đoạn này"}</button>}</div>}
        <ErrorBox error={annotationsQuery.error || saveAnnotation.error || updateAnnotation.error || deleteAnnotation.error} />
        {annotationsQuery.isLoading ? <p className="muted">Đang tải ghi chú…</p> : annotations.length === 0 ? <p className="muted">Chưa có ghi chú. Chọn một đoạn để đánh dấu hoặc ghi lại điều cần nhớ.</p> : <div className="ebook-annotation-list">{annotations.map((annotation) => <article className={`ebook-annotation-item ${annotation.kind.toLowerCase()}`} key={annotation.id}>
          <button className="annotation-quote" type="button" onClick={() => goToPage(annotation.pageNumber)}><small>TRANG {annotation.pageNumber} · {annotation.kind === "HIGHLIGHT" ? "TÔ SÁNG" : annotation.kind === "UNDERLINE" ? "GẠCH CHÂN" : "GHI CHÚ"}</small><span>{annotation.selectedText}</span></button>
          {editId === annotation.id ? <div className="annotation-edit"><textarea rows={3} value={editText} onChange={(event) => setEditText(event.target.value)} /><button type="button" className="primary" disabled={!editText.trim() || updateAnnotation.isPending} onClick={() => updateAnnotation.mutate({ id: annotation.id, noteText: editText.trim() })}>Lưu</button><button type="button" className="text-button" onClick={() => setEditId(null)}>Hủy</button></div> : annotation.noteText && <p>{annotation.noteText}</p>}
          {annotation.kind === "NOTE" && editId !== annotation.id && <button type="button" className="text-button" onClick={() => { setEditId(annotation.id); setEditText(annotation.noteText ?? ""); }}>Sửa ghi chú</button>}
          <button type="button" className="text-button" disabled={deleteAnnotation.isPending} onClick={() => deleteAnnotation.mutate(annotation.id)}>Xóa</button>
        </article>)}</div>}
        {annotationsQuery.hasNextPage && <button className="secondary" type="button" disabled={annotationsQuery.isFetchingNextPage} onClick={() => annotationsQuery.fetchNextPage()}>{annotationsQuery.isFetchingNextPage ? "Đang tải…" : "Tải ghi chú cũ hơn"}</button>}
        <p className="tiny muted">Ghi chú chỉ hiển thị với tài khoản của em và được đồng bộ theo phiên bản sách.</p>
      </aside>
    </div>
  </div>;
}

function rangeForOffsets(container: HTMLElement, startOffset: number, endOffset: number): Range | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node = walker.nextNode() as Text | null;
  let cursor = 0;
  let started = false;
  while (node) {
    const end = cursor + node.length;
    if (!started && startOffset >= cursor && startOffset <= end) {
      range.setStart(node, Math.min(node.length, startOffset - cursor));
      started = true;
    }
    if (started && endOffset <= end) {
      range.setEnd(node, Math.min(node.length, endOffset - cursor));
      return range;
    }
    cursor = end;
    node = walker.nextNode() as Text | null;
  }
  return null;
}

