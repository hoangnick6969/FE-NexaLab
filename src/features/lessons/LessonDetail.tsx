import { useRef, useState } from "react";
import DOMPurify from "dompurify";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpen, Check, ExternalLink, FileText, Play } from "lucide-react";
import { api, idempotencyKey, isAssetUrl, openMaterial, useAuth, type StudentPathway } from "../../lib/api";
import { ErrorBox, PageLoader } from "../../components/ui";
import { PageHeading } from "../../components/PageHeading";
import { AttributionNote, libraryQuery } from "./library";
import { VideoLearningStep } from "./VideoLearningStep";
import { httpsUrl } from "../../lib/urls";
import { withAssignmentContext } from "./lesson-catalog";

export function LessonDetail() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get("assignmentId") || undefined;
  const user = useAuth((state) => state.user)!;
  const [activeTab, setActiveTab] = useState<"reading" | "video" | "exercise" | "materials">("reading");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const queryClient = useQueryClient();
  const lessons = useQuery({
    queryKey: [user.role === "STUDENT" ? "open-curriculum-lesson" : "lessons", id],
    queryFn: () => user.role === "STUDENT" ? api<any>(`/open-curriculum/lessons/${encodeURIComponent(id)}`) : api<any[]>("/lessons"),
    enabled: Boolean(id) && !(user.role === "STUDENT" && assignmentId),
  });
  const canViewAttribution = ["TEACHER", "ADMIN"].includes(user.role);
  const library = useQuery({
    queryKey: ["teacher-content", "lesson-detail-attribution"],
    queryFn: () => api<{ items?: any[] }>(libraryQuery({ grade: "", domain: "", outcome: "", scope: "ALL" })),
    enabled: canViewAttribution,
  });
  const materialOpen = useMutation({ mutationFn: openMaterial });
  const videoPathway = useQuery<StudentPathway>({
    queryKey: ["lesson-pathway", id, assignmentId],
    queryFn: () => api(withAssignmentContext(`/lessons/${encodeURIComponent(id)}/pathway`, assignmentId)),
    enabled: user.role === "STUDENT" && Boolean(id) && Boolean(assignmentId),
  });
  const lesson = user.role === "STUDENT" ? (assignmentId ? videoPathway.data?.lesson : lessons.data) : lessons.data?.find((item: any) => item.id === id);
  const videoMaterial = lesson?.materials?.find((item: any) => item.type === "video" && typeof item.url === "string");
  const readingStep = videoPathway.data?.steps.find((step) => step.type === "READING") ?? lesson?.steps?.find((step: any) => step.type === "READING");
  const videoStep = videoPathway.data?.steps.find((step) => step.type === "VIDEO") ?? lesson?.steps?.find((step: any) => step.type === "VIDEO");
  const studyCardsStep = videoPathway.data?.steps.find((step) => step.type === "STUDY_CARDS");
  const basicExerciseStep = lesson?.steps?.find((step: any) => step.type === "BASIC_EXERCISE");
  const lessonSteps = videoPathway.data?.steps.filter((step) => ["READING", "VIDEO"].includes(step.type)) ?? [];
  const lessonComplete = lessonSteps.length > 0 && lessonSteps.every((step) => step.state === "COMPLETED");
  const completeReading = useMutation({
    mutationFn: () => api(assignmentId
      ? withAssignmentContext(`/lessons/${encodeURIComponent(id)}/steps/${readingStep!.id}/progress`, assignmentId)
      : `/open-curriculum/lessons/${encodeURIComponent(id)}/steps/${readingStep!.id}/progress`, "PUT", { action: "complete" }),
    onSuccess: (response: any) => {
      if (response.pathway) queryClient.setQueryData(["lesson-pathway", id, assignmentId], response.pathway);
      else queryClient.setQueryData(["open-curriculum-lesson", id], (previous: any) => ({ ...previous, steps: previous.steps.map((step: any) => step.id === response.step.id ? { ...step, state: "COMPLETED", progressValue: 100 } : step) }));
    },
  });
  const ebookUrl = httpsUrl(lesson?.subject?.ebookUrl);
  const ebookEdition = lesson?.ebookEditions?.find((edition: any) => httpsUrl(edition.url));

  if ((assignmentId ? videoPathway.isLoading : lessons.isLoading)) return <PageLoader message="Đang mở bài học…" />;
  if ((assignmentId ? videoPathway.error : lessons.error) && !lesson) return <><ErrorBox error={assignmentId ? videoPathway.error : lessons.error} /><Link className="text-button" to="/lessons">Quay lại thư viện</Link></>;
  if (!lesson) return <section className="panel lesson-detail-empty"><BookOpen /><h1>Không mở được bài học</h1><p>Bài học chưa được phát hành hoặc không tồn tại.</p><Link className="primary" to="/lessons">Quay lại bài học</Link></section>;

  const hasVideo = Boolean(videoMaterial || videoStep || (user.role === "STUDENT" && videoPathway.isLoading));
  const hasMaterials = Boolean(ebookUrl || lesson.materials?.length || canViewAttribution);
  const learningObjective = /dữ liệu|kiểm thử|thử nghiệm|placeholder|sample/i.test(lesson.learningObjective ?? "") ? "" : lesson.learningObjective;
  const prerequisites = /dữ liệu|kiểm thử|thử nghiệm|placeholder|sample/i.test(lesson.prerequisites ?? "") ? "" : lesson.prerequisites;
  const tabs = [
    { id: "reading" as const, label: "Nội dung bài", icon: BookOpen },
    ...(hasVideo ? [{ id: "video" as const, label: "Video bài giảng", icon: Play }] : []),
    ...(basicExerciseStep ? [{ id: "exercise" as const, label: "Bài tập luyện tập", icon: Check }] : []),
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
        {user.role === "STUDENT" && assignmentId && videoPathway.isLoading ? <p className="muted" role="status">Đang tải nội dung và tiến độ bài học…</p> : user.role === "STUDENT" && assignmentId && videoPathway.error ? <ErrorBox error={videoPathway.error} /> : <LessonBody content={readingStep?.resource?.html || lesson.content} title={lesson.title} chapter={lesson.chapter} />}
      {user.role === "STUDENT" && !assignmentId && <p className="notice">Đây là nội dung chương trình mở; tiến độ đọc và video được lưu riêng, không cần bài được giao.</p>}
      </div>
      {user.role === "STUDENT" && readingStep && readingStep.state !== "COMPLETED" && <div className="reading-completion">
        {completeReading.error && <ErrorBox error={completeReading.error} />}
        <button className="primary" type="button" disabled={completeReading.isPending || readingStep.state === "LOCKED"} onClick={() => completeReading.mutate()}>{completeReading.isPending ? "Đang lưu tiến độ…" : completeReading.error ? "Thử lưu lại" : "Hoàn thành phần đọc"}</button>
      </div>}
      {user.role === "STUDENT" && readingStep?.state === "COMPLETED" && <p className="notice" role="status">Đã hoàn thành phần đọc. Tiến độ đã được lưu.</p>}
    </section>}
    {activeTab === "video" && <section id="lesson-panel-video" role="tabpanel" aria-labelledby="lesson-tab-video" className="panel lesson-video-feature lesson-tab-panel">
      <h2 className="lesson-tab-title">Video bài giảng</h2>
      {videoStep && user.role === "STUDENT" ? <VideoLearningStep lessonId={id} step={videoStep} progressPath={assignmentId ? withAssignmentContext(`/lessons/${encodeURIComponent(id)}/steps/${videoStep.id}/progress`, assignmentId) : `/open-curriculum/lessons/${encodeURIComponent(id)}/steps/${videoStep.id}/progress`} hideTranscript={/dùng chung|kiểm thử|kiểm tra giao diện/i.test(`${videoStep.resource?.title ?? ""} ${videoStep.resource?.transcript ?? ""}`)} onReconciled={(updated: any) => updated.pathway || updated.steps ? queryClient.setQueryData(["lesson-pathway", id, assignmentId], updated.pathway ?? updated) : queryClient.setQueryData(["open-curriculum-lesson", id], (previous: any) => ({ ...previous, steps: previous.steps.map((step: any) => step.id === updated.step.id ? { ...step, state: updated.step.state, progressValue: updated.step.progressValue, lastPosition: updated.step.lastPosition } : step) }))} />
        : videoMaterial ? <video className="video-player" controls preload="metadata" src={httpsUrl(videoMaterial.url) ?? undefined} aria-label="Video bài giảng" />
          : videoPathway.isLoading ? <p className="video-placeholder" role="status">Đang tải video bài giảng…</p>
            : assignmentId && videoPathway.error ? <ErrorBox error={videoPathway.error} />
              : <p className="notice">Video bài giảng hiện chưa khả dụng.</p>}
    </section>}
    {activeTab === "exercise" && basicExerciseStep && <section id="lesson-panel-exercise" role="tabpanel" aria-labelledby="lesson-tab-exercise" className="panel lesson-tab-panel">
      <h2 className="lesson-tab-title">Bài tập luyện tập</h2>
      <BasicExercise lessonId={id} step={basicExerciseStep} onSubmitted={(result) => queryClient.setQueryData(["open-curriculum-lesson", id], (previous: any) => ({ ...previous, steps: previous.steps.map((step: any) => step.id === basicExerciseStep.id ? { ...step, state: result.passed ? "COMPLETED" : "IN_PROGRESS", exercise: result } : step) }))} />
    </section>}
    {activeTab === "materials" && materialsTab && <section id="lesson-panel-materials" role="tabpanel" aria-labelledby="lesson-tab-materials" className="panel lesson-tab-panel lesson-materials-panel">
      <h2>Tài liệu bài học</h2>
      {(ebookEdition || ebookUrl) && <Link className="lesson-material-link" to={`/ebooks/${lesson.subjectId}`} state={{ fromLessonId: lesson.id, editionId: ebookEdition?.version ?? null, ebookUrl: ebookEdition?.url, initialPhysicalPage: ebookEdition?.locator?.physicalPageIndex ?? ebookEdition?.fallbackPhysicalPage ?? 1, externalResource: true }}><BookOpen size={20} /><span><b>Sách giáo khoa · {lesson.subject.name}</b><small>Tài liệu tham khảo bên ngoài · trang in và trang PDF có thể khác nhau.</small></span><ArrowRight size={18} /></Link>}
      {lesson.materials?.filter((material: any) => material.type !== "video").map((material: any, index: number) => isAssetUrl(material.url) ? <button className="reader-material" type="button" key={`${material.url}-${index}`} onClick={() => materialOpen.mutate(material.url)}>{material.title || `Tài liệu ${index + 1}`} <ExternalLink size={14} /></button> : <a className="reader-material" key={`${material.url}-${index}`} href={httpsUrl(material.url) ?? undefined} target="_blank" rel="noopener noreferrer">{material.title || `Tài liệu ${index + 1}`} <ExternalLink size={14} /></a>)}
      <ErrorBox error={materialOpen.error} />
      {canViewAttribution && <AttributionNote value={library.data?.items?.find((item) => item.id === lesson.id)?.attribution} />}
    </section>}
    {activeTab === "reading" && user.role === "STUDENT" && studyCardsStep && <p className="lesson-reading-next-hint">Sau khi hoàn thành nội dung bài, tiếp tục với video bài giảng. Thẻ ôn tập nằm trong Class Space.</p>}
    {user.role === "STUDENT" && studyCardsStep && assignmentId && <p><Link className="secondary" to={`/classes?tab=resources&assignmentId=${encodeURIComponent(assignmentId)}`}>Mở thẻ ôn tập trong Class Space</Link></p>}
    {user.role === "STUDENT" && lessonComplete && <div className="lesson-next-action"><p>Em đã hoàn thành nội dung bài học.</p>{assignmentId && <Link className="primary" to={`/assignments/${encodeURIComponent(assignmentId)}`}>Tiếp tục bài được giao <ArrowRight size={16} /></Link>}</div>}
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
