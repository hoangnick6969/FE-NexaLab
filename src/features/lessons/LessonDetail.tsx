import { useEffect, useRef, useState } from "react";
import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";
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
import { youtubeEmbedUrl, youtubeVideoId } from "./youtube";
import { isCredibleContinuousAdvance, stepForVideo } from "./video-progress";

declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void; }
}

let youtubeApiPromise: Promise<any> | null = null;
function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youtubeApiPromise) youtubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT); };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return youtubeApiPromise;
}

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
  const attachedVideos = [...(lesson?.videos ?? []), ...(lesson?.sections ?? []).flatMap((section: any) => section.videos ?? [])];
  const readingStep = videoPathway.data?.steps.find((step) => step.type === "READING") ?? lesson?.steps?.find((step: any) => step.type === "READING");
  const videoSteps = (videoPathway.data?.steps ?? lesson?.steps ?? []).filter((step: any) => step.type === "VIDEO");
  const videoStep = videoSteps[0];
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

  const hasVideo = Boolean(videoMaterial || attachedVideos.length || videoStep || (user.role === "STUDENT" && videoPathway.isLoading));
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
        const allVideosComplete = videoSteps.length > 0 && videoSteps.every((step: any) => step.state === "COMPLETED");
        return <button key={tab.id} ref={(element) => { tabRefs.current[index] = element; }} type="button" role="tab" id={`lesson-tab-${tab.id}`} aria-selected={activeTab === tab.id} aria-controls={`lesson-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => changeTabByKeyboard(event, index)}><Icon size={16} />{tab.label}{((tab.id === "reading" && readingStep?.state === "COMPLETED") || (tab.id === "video" && allVideosComplete)) && <Check size={15} aria-label="Đã hoàn thành" />}</button>;
      })}
    </div>
    {activeTab === "reading" && <section id="lesson-panel-reading" role="tabpanel" aria-labelledby="lesson-tab-reading" className="panel lesson-detail-reading lesson-tab-panel">
      <div className="lesson-reading-scroll" role="region" aria-label="Nội dung bài đọc có thể cuộn" tabIndex={0}>
        {(learningObjective || prerequisites) && <div className="lesson-objective">{learningObjective && <><span className="eyebrow">MỤC TIÊU BÀI HỌC</span><p>{learningObjective}</p></>}{prerequisites && <small>Kiến thức nền · {prerequisites}</small>}</div>}
        {lesson.sgkReference && <SgkReference value={lesson.sgkReference} />}
        {user.role === "STUDENT" && assignmentId && videoPathway.isLoading ? <p className="muted" role="status">Đang tải nội dung và tiến độ bài học…</p> : user.role === "STUDENT" && assignmentId && videoPathway.error ? <ErrorBox error={videoPathway.error} /> : <LessonBody content={user.role === "STUDENT" && !assignmentId ? lesson.content : (readingStep?.resource?.html || lesson.content)} title={lesson.title} chapter={lesson.chapter} />}
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
      {attachedVideos.length ? <div className="lesson-attached-videos">{attachedVideos.map((video: any, index: number) => <AttachedVideo key={video.id || `${video.url}-${index}`} video={video} lessonId={id} assignmentId={assignmentId} videoStep={stepForVideo(video, videoSteps)} onReconciled={(updated: any) => {
        if (updated.pathway || updated.steps) queryClient.setQueryData(["lesson-pathway", id, assignmentId], updated.pathway ?? updated);
        else if (updated.step) queryClient.setQueryData(["open-curriculum-lesson", id], (previous: any) => previous ? ({ ...previous, steps: previous.steps.map((step: any) => step.id === updated.step.id ? { ...step, state: updated.step.state, progressValue: updated.step.progressValue, lastPosition: updated.step.lastPosition, videoEvidence: updated.step.videoEvidence ?? step.videoEvidence } : step) }) : previous);
      }} />)}</div>
        : videoStep && user.role === "STUDENT" ? <VideoLearningStep lessonId={id} step={videoStep} progressPath={assignmentId ? withAssignmentContext(`/lessons/${encodeURIComponent(id)}/steps/${videoStep.id}/progress`, assignmentId) : `/open-curriculum/lessons/${encodeURIComponent(id)}/steps/${videoStep.id}/progress`} hideTranscript={/dùng chung|kiểm thử|kiểm tra giao diện/i.test(`${videoStep.resource?.title ?? ""} ${videoStep.resource?.transcript ?? ""}`)} onReconciled={(updated: any) => updated.pathway || updated.steps ? queryClient.setQueryData(["lesson-pathway", id, assignmentId], updated.pathway ?? updated) : queryClient.setQueryData(["open-curriculum-lesson", id], (previous: any) => ({ ...previous, steps: previous.steps.map((step: any) => step.id === updated.step.id ? { ...step, state: updated.step.state, progressValue: updated.step.progressValue, lastPosition: updated.step.lastPosition } : step) }))} />
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

type AttachedVideoValue = { id?: string; title?: string; url: string; provider?: "YOUTUBE" | "DIRECT"; providerVideoId?: string; transcript?: string; captionUrl?: string };

function AttachedVideo({ video, lessonId, assignmentId, videoStep, onReconciled }: { video: AttachedVideoValue; lessonId: string; assignmentId?: string; videoStep?: any; onReconciled: (updated: any) => void }) {
  const playerHost = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const sessionRef = useRef<{ id: string; sequence: number } | null>(null);
  const continuousRef = useRef<{ from: number; position: number; wallAt: number; rate: number } | null>(null);
  const sendingRef = useRef(false);
  const [coverage, setCoverage] = useState(videoStep?.videoEvidence?.coveragePercent ?? videoStep?.progressValue ?? 0);
  const [saveError, setSaveError] = useState("");
  const embed = youtubeEmbedUrl(video.url);

  const startSession = async (durationSeconds: number) => {
    if (!videoStep || sessionRef.current) return sessionRef.current;
    const query = assignmentId ? `?assignmentId=${encodeURIComponent(assignmentId)}` : "";
    const providerVideoId = video.providerVideoId || youtubeVideoId(video.url) || video.id || videoStep.resource?.providerVideoId;
    const result = await api<any>(`/lessons/${encodeURIComponent(lessonId)}/steps/${encodeURIComponent(videoStep.id)}/video-sessions${query}`, "POST", {
      clientSessionId: crypto.randomUUID(),
      provider: video.provider || (embed ? "YOUTUBE" : "DIRECT"),
      providerVideoId,
      durationSeconds: Math.max(1, Math.floor(durationSeconds)),
    });
    sessionRef.current = { id: result.sessionId, sequence: 0 };
    setCoverage(result.coveragePercent ?? 0);
    return sessionRef.current;
  };

  const flushObservation = async (position: number, state: "PLAYING" | "PAUSED" | "ENDED") => {
    const continuous = continuousRef.current;
    const session = sessionRef.current;
    if (!continuous || !session || sendingRef.current) return;
    const fromSecond = Math.floor(continuous.from);
    const toSecond = Math.floor(position);
    continuousRef.current = state === "PLAYING" ? { ...continuous, from: position, position, wallAt: Date.now() } : null;
    if (toSecond <= fromSecond) return;
    sendingRef.current = true;
    try {
      const result = await api<any>(`/video-sessions/${encodeURIComponent(session.id)}/observations`, "PUT", {
        sequence: ++session.sequence,
        fromSecond,
        toSecond,
        observedMediaSeconds: Math.min(30, toSecond - fromSecond),
        playbackRate: continuous.rate,
        playerState: state,
        clientObservedAt: new Date().toISOString(),
      });
      setCoverage(result.coveragePercent ?? 0);
      setSaveError("");
      onReconciled({
        step: {
          id: videoStep.id,
          state: result.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
          progressValue: result.coveragePercent ?? 0,
          lastPosition: result.lastPosition ?? toSecond,
          videoEvidence: result,
        },
      });
    } catch (error) {
      session.sequence -= 1;
      setSaveError(error instanceof Error ? error.message : "Không lưu được tiến độ video");
    } finally {
      sendingRef.current = false;
    }
  };

  const sampleContinuous = (position: number, rate: number, playing: boolean) => {
    const now = Date.now();
    const previous = continuousRef.current;
    if (!playing) {
      if (previous) void flushObservation(position, "PAUSED");
      return;
    }
    if (!previous) {
      continuousRef.current = { from: position, position, wallAt: now, rate };
      return;
    }
    const elapsed = (now - previous.wallAt) / 1000;
    const advance = position - previous.position;
    if (!isCredibleContinuousAdvance(previous.position, position, elapsed, Math.max(rate, previous.rate))) {
      continuousRef.current = { from: position, position, wallAt: now, rate };
      return;
    }
    continuousRef.current = { ...previous, position, wallAt: now, rate };
    if (position - previous.from >= 10) void flushObservation(position, "PLAYING");
  };

  useEffect(() => {
    const id = youtubeVideoId(video.url);
    if (!embed || !id || !videoStep || !playerHost.current) return;
    let active = true;
    let interval: number | undefined;
    loadYoutubeApi().then((YT) => {
      if (!active || !playerHost.current) return;
      playerRef.current = new YT.Player(playerHost.current, {
        videoId: id,
        playerVars: { origin: window.location.origin, rel: 0 },
        events: {
          onReady: async (event: any) => {
            try {
              const started = await startSession(event.target.getDuration?.() ?? 0);
              const resumeAt = videoStep.videoEvidence?.lastPosition ?? videoStep.lastPosition ?? 0;
              if (started && resumeAt > 0) event.target.seekTo(resumeAt, true);
              interval = window.setInterval(() => {
                const state = event.target.getPlayerState?.();
                sampleContinuous(event.target.getCurrentTime?.() ?? 0, event.target.getPlaybackRate?.() ?? 1, state === YT.PlayerState.PLAYING);
              }, 1000);
            } catch (error) { setSaveError(error instanceof Error ? error.message : "Không tạo được phiên xem video"); }
          },
          onStateChange: (event: any) => {
            const position = event.target.getCurrentTime?.() ?? 0;
            if (event.data === YT.PlayerState.PAUSED) void flushObservation(position, "PAUSED");
            if (event.data === YT.PlayerState.ENDED) void flushObservation(position, "ENDED");
          },
        },
      });
    });
    const onVisibility = () => { if (document.hidden && playerRef.current) void flushObservation(playerRef.current.getCurrentTime?.() ?? 0, "PAUSED"); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { active = false; document.removeEventListener("visibilitychange", onVisibility); if (interval) window.clearInterval(interval); if (playerRef.current) void flushObservation(playerRef.current.getCurrentTime?.() ?? 0, "PAUSED"); playerRef.current?.destroy?.(); playerRef.current = null; sessionRef.current = null; };
  }, [embed, lessonId, video.url, videoStep?.id]);

  const directEvents = embed || !videoStep ? {} : {
    onLoadedMetadata: async (event: React.SyntheticEvent<HTMLVideoElement>) => {
      try {
        const started = await startSession(event.currentTarget.duration);
        const resumeAt = videoStep.videoEvidence?.lastPosition ?? videoStep.lastPosition ?? 0;
        if (started && resumeAt > 0 && resumeAt < event.currentTarget.duration) event.currentTarget.currentTime = resumeAt;
      } catch (error) { setSaveError(error instanceof Error ? error.message : "Không tạo được phiên xem video"); }
    },
    onTimeUpdate: (event: React.SyntheticEvent<HTMLVideoElement>) => sampleContinuous(event.currentTarget.currentTime, event.currentTarget.playbackRate, !event.currentTarget.paused),
    onSeeking: (event: React.SyntheticEvent<HTMLVideoElement>) => { continuousRef.current = { from: event.currentTarget.currentTime, position: event.currentTarget.currentTime, wallAt: Date.now(), rate: event.currentTarget.playbackRate }; },
    onPause: (event: React.SyntheticEvent<HTMLVideoElement>) => void flushObservation(event.currentTarget.currentTime, "PAUSED"),
    onEnded: (event: React.SyntheticEvent<HTMLVideoElement>) => void flushObservation(event.currentTarget.currentTime, "ENDED"),
  };
  return <article className="attached-video"><h3>{video.title || "Video bài học"}</h3>{embed ? <div className="video-embed" ref={playerHost} aria-label={video.title || "Video bài học"} /> : <video className="video-player" controls preload="metadata" src={httpsUrl(video.url) ?? video.url} aria-label={video.title || "Video bài học"} {...directEvents} />}{videoStep && <p className="muted" role="status">Đã xem {coverage}% theo dữ liệu phát liên tục được máy chủ xác nhận.</p>}{!videoStep && <p className="notice">Video này chưa có bước học độc lập nên chưa thể lưu tiến độ.</p>}{saveError && <p className="notice" role="alert">{saveError}</p>}{video.transcript && <details className="video-transcript"><summary>Transcript / phụ đề</summary><p>{video.transcript}</p></details>}{video.captionUrl && <a href={httpsUrl(video.captionUrl) ?? video.captionUrl} target="_blank" rel="noopener noreferrer">Mở phụ đề WebVTT</a>}</article>;
}

function SgkReference({ value }: { value: any }) {
  const pdf = value.pdfPageRange;
  const printed = value.printedPageRange;
  return <aside className="lesson-sgk-reference" aria-label="Đối chiếu sách giáo khoa">
    <strong>Đối chiếu SGK</strong>
    <p>{value.bookTitle || value.bookKey || "Sách giáo khoa"}{value.bookVersion || value.version ? ` · ${value.bookVersion || value.version}` : ""}</p>
    <small>{value.chapterTitle || value.chapterId || value.sourceLessonTitle || value.sourceLessonId}{printed?.start ? ` · trang in ${printed.start}${printed.end && printed.end !== printed.start ? `–${printed.end}` : ""}` : ""}{pdf?.start ? ` · PDF ${pdf.start}${pdf.end && pdf.end !== pdf.start ? `–${pdf.end}` : ""}` : ""}</small>
  </aside>;
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
  const htmlTags = /<\s*\/?\s*(?:h[1-6]|p|div|ul|ol|li|table|thead|tbody|tr|th|td|blockquote|img|figure|figcaption|aside|br|strong|em)\b/i;
  if (htmlTags.test(content)) {
    const sanitized = DOMPurify.sanitize(content)
      .replace(/<h1(?=[\s>])/gi, "<h2").replace(/<\/h1\s*>/gi, "</h2>")
      .replace(/<h[4-6](?=[\s>])/gi, "<h3").replace(/<\/h[4-6]\s*>/gi, "</h3>");
    return <RenderedLessonHtml html={sanitized} />;
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

function RenderedLessonHtml({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    renderMathInElement(ref.current, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    });
  }, [html]);
  return <div ref={ref} className="lesson-content" dangerouslySetInnerHTML={{ __html: html }} />;
}
