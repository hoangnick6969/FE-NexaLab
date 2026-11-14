import { lazy, Suspense, useEffect, useState, useMemo, useRef } from "react";
import "../classes/class-resource-preview.css";
import { simulate } from "@nexalab/sim";
import { Link, useParams, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Play,
  RotateCcw,
  Bookmark,
  CheckCircle2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, idempotencyKey, mutate, useAuth } from "../../lib/api";
import { Badge, ErrorBox, useAction, verdictLabel } from "../../components/ui";
import { useLabRunHost } from "./runtime/lab-run-host";
import { CheckpointHintPanel, FloatingCheckpointHint } from "./runtime/CheckpointHintPanel";
import { VerdictExplanationPanel } from "./runtime/VerdictExplanationPanel";
import { RunHintPanel } from "./runtime/RunHintPanel";
import { LegacyHintPanel } from "./runtime/LegacyHintPanel";
import { TutorChat } from "../student-ai/TutorChat";
import { StepPickerHint } from "./runtime/StepPickerHint";
import { LabWhatIf } from "./runtime/LabWhatIf";
import { WHAT_IF_BY_RENDERER } from "./runtime/what-if-labs";
import { checkpointViewForRenderer } from "./runtime/checkpoint-views";
import { hasLabRenderer, labRenderer, previewLabRenderer } from "./runtime/activity-renderers";
import { defineText } from "../../i18n";
import { lessonLabSection, relatedLessonHref, type RelatedLesson } from "./pathways/lesson-lab-navigation";
import { LabSpace } from "./shared/LabSpace";
import { labInfo } from "./lab-info";
import { buoyancyStepQuestions } from "./physics/fluid/buoyancy/buoyancy-questions";
import { toLocalInput } from "../classes/class-ui";
import { StudentClassLabAdditionalResponses } from "../classes/ClassLabAdditionalResponses";

import { loadLabActivity } from "./runtime/lazy-lab-activity";
import { isExploreLab } from "./runtime/explore-labs";

const ExploreLabPage = lazy(() => import("./chemistry/wet-bench/kit/ExploreLabPage"));

const MassConservationActivity = loadLabActivity(() => import("./chemistry/wet-bench/MassConservationActivity").then((module) => ({ default: module.MassConservationActivity })));
const ThermalEnergyActivity = loadLabActivity(() => import("./physics/thermal/ThermalEnergyActivity").then((module) => ({ default: module.ThermalEnergyActivity })));
const LeverInvestigationActivity = loadLabActivity(() => import("./physics/mechanics/LeverInvestigationActivity").then((module) => ({ default: module.LeverInvestigationActivity })));

const text = defineText({
  vi: {
    notFound: "Không tìm thấy phòng lab.",
    notPublished: "Phòng thực hành chưa được phát hành",
    notInCurriculum: "Nội dung này chưa có trong chương trình nền tảng đã duyệt.",
    backToList: "Quay lại danh sách",
    labs: "Phòng thí nghiệm",
    relatedLesson: "Bài học liên quan",
    backToLesson: "Quay lại phần bài học",
    physics: "VẬT LÝ",
    biology: "SINH HỌC",
    chemistry: "HÓA HỌC",
    grades: "LỚP 8–9",
    discoveryRoom: "Phòng khám phá",
    teacherPreview: "Giáo viên · Xem trước",
    teacherInstructions: "Hướng dẫn của giáo viên",
    customSupplement: "Hướng dẫn này bổ sung cho hoạt động và checkpoints đã duyệt.",
    unscoredClassPractice: "Luyện tập chung không chấm điểm.",
    pinnedSourcePreview: "Xem trước hoạt động nguồn đã ghim",
    advisoryPreview: "Mô phỏng xem trước chỉ mang tính tham khảo; không tạo phiên chạy, bài nộp hoặc điểm học sinh.",
    loadingActivity: "Đang tải hoạt động…",
    previewUnavailable: "Chưa có giao diện tương thích với mô hình nguồn đã ghim.",
    freePractice: "Thực hành tự do",
    assignedPractice: "Bài thực hành được giao",
    startSession: "Bắt đầu phiên thực hành",
    startingSession: "Đang mở phiên thực hành…",
    sessionHelp: "Phiên này cố định phiên bản mô hình và cách chấm trên máy chủ.",
    restoreTitle: "Khôi phục bản nháp?",
    restoreBody: "Có một bản ráp dở tương thích từ lần mở trước. Bản nháp chưa được tính là kết quả học tập.",
    restore: "Khôi phục",
    discard: "Bỏ bản nháp",
    devicePreview: "Xem trước trên thiết bị:",
    product: (n: number) => `${n} mol sản phẩm`,
    runToSave: "Chạy thí nghiệm để lưu và chấm chính thức trên server.",
    eyeModel: "Mô hình cấu tạo mắt",
    bench: "Bàn thực hành",
    reset: "Làm lại",
    engine: "Engine khoa học · v1.0.0",
    computing: "Đang tính…",
    gradeParts: "Chấm tên bộ phận",
    run: "Chạy thí nghiệm",
    challenge: "THỬ THÁCH 01",
    circuitGoal: "LED sáng, dòng điện an toàn",
    eyeGoal: "Em hiểu đôi mắt đến đâu?",
    chemGoal: "Cân bằng lượng chất",
    circuitTask: "Tạo mạch kín chứa nguồn, LED và điện trở. Giữ dòng qua mỗi LED từ 1 đến 20 mA.",
    eyeTask: "Chuyển sang kiểm tra, nhập tên của 8 bộ phận rồi chấm.",
    chemTask: "Chọn một phản ứng và điều chỉnh số mol để hai chất phản ứng vừa đủ.",
    sampleLabel: (n: number) => `Lọ ${n}`,
    acid: "Axit", neutral: "Trung tính", base: "Bazơ", unclassified: "Chưa phân loại",
    sampleCorrect: "Xác định đúng", sampleIncorrect: "Cần xem lại",
    observe: "Quan sát trước khi thay đổi",
    runToCheck: "Chạy để kiểm chứng dự đoán",
    tryAgain: "Thử lại để hiểu rõ hơn",
    result: "Kết quả mô phỏng",
    totalCurrent: "mA · dòng tổng",
    branchNote: "Ngưỡng được kiểm tra trên từng nhánh, không phải dòng tổng của các nhánh song song.",
    productLabel: "Sản phẩm:",
    excess: (s: string) => `Dư ${s}:`,
    outOf100: "/ 100 điểm",
    savedToRecord: "Đã lưu vào hồ sơ",
    save: "Lưu thí nghiệm",
    resultAfterRun: "Kết quả xuất hiện sau khi em chạy thí nghiệm.",
    disclaimer: "Mô hình lý tưởng dùng cho học tập. Kết quả chính thức được tính trên máy chủ; không áp dụng để thiết kế mạch hoặc thao tác hóa chất thật.",
  },
  en: {
    notFound: "Lab not found.",
    notPublished: "This lab is not published yet",
    notInCurriculum: "This content is not in the approved foundation curriculum yet.",
    backToList: "Back to the list",
    labs: "Labs",
    relatedLesson: "Related lesson",
    backToLesson: "Back to the lesson section",
    physics: "PHYSICS",
    biology: "BIOLOGY",
    chemistry: "CHEMISTRY",
    grades: "GRADES 8–9",
    discoveryRoom: "Discovery room",
    teacherPreview: "Teacher · Preview",
    teacherInstructions: "Teacher instructions",
    customSupplement: "These instructions supplement the approved activity and checkpoints.",
    unscoredClassPractice: "Shared practice is unscored.",
    pinnedSourcePreview: "Pinned source activity preview",
    advisoryPreview: "Preview simulation is advisory; it creates no student run, submission or grade.",
    loadingActivity: "Loading activity…",
    previewUnavailable: "No compatible renderer is installed for the pinned source model.",
    freePractice: "Free practice",
    assignedPractice: "Assigned practice",
    startSession: "Start practice session",
    startingSession: "Opening practice session…",
    sessionHelp: "This session pins the server model and assessment versions.",
    restoreTitle: "Restore draft?",
    restoreBody: "A compatible unfinished setup is available. A draft is not learning evidence.",
    restore: "Restore",
    discard: "Discard draft",
    devicePreview: "On-device preview:",
    product: (n: number) => `${n} mol of product`,
    runToSave: "Run the experiment to save it and get the official result from the server.",
    eyeModel: "Eye structure model",
    bench: "Practice bench",
    reset: "Reset",
    engine: "Science engine · v1.0.0",
    computing: "Computing…",
    gradeParts: "Check the part names",
    run: "Run the experiment",
    challenge: "CHALLENGE 01",
    circuitGoal: "LED on, safe current",
    eyeGoal: "How well do you know the eye?",
    chemGoal: "Balance the amounts",
    circuitTask: "Build a closed circuit with a source, LED and resistor. Keep the current through each LED between 1 and 20 mA.",
    eyeTask: "Switch to the check, type the names of the 8 parts, then grade.",
    chemTask: "Choose a reaction and adjust the moles so both reactants are used up exactly.",
    sampleLabel: (n: number) => `Jar ${n}`,
    acid: "Acid", neutral: "Neutral", base: "Base", unclassified: "Unclassified",
    sampleCorrect: "Correctly identified", sampleIncorrect: "Review this answer",
    observe: "Observe before changing",
    runToCheck: "Run to test your prediction",
    tryAgain: "Try again to understand better",
    result: "Simulation result",
    totalCurrent: "mA · total current",
    branchNote: "Limits are checked on each branch, not on the total current of parallel branches.",
    productLabel: "Product:",
    excess: (s: string) => `Excess ${s}:`,
    outOf100: "/ 100 points",
    savedToRecord: "Saved to your record",
    save: "Save experiment",
    resultAfterRun: "Results appear after you run the experiment.",
    disclaimer: "An idealised model for learning. Official results are computed on the server; do not use it to design real circuits or handle real chemicals.",
  },
});
const t = text();
/** Station Labs with after-submit hints (SAI-01A step 2); checkpoint Labs are covered by their envelope. */
const STATION_HINT_RENDERERS = new Set(["density-bench", "gene-expression", "eye-anatomy-optics", "buoyancy-bench"]);

/** Explore-first K2 Labs open the kit directly; every other Lab keeps the guided LabRun flow below. */
export default function Lab() {
  const { id } = useParams();
  if (isExploreLab(id)) return <Suspense fallback={<p role="status" className="panel">Đang mở bàn thí nghiệm…</p>}><ExploreLabPage key={`explore:${id}`} labId={id!} /></Suspense>;
  return <GuidedLab key="guided" />;
}

function GuidedLab() {
  const { id = "circuit" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get("assignmentId") || undefined;
  const resourceId = searchParams.get("resourceId") || undefined;
  const classId = searchParams.get("classId") || undefined;
  const labDraft = searchParams.get("customize") === "1" ? location.state?.labDraft : null;
  const user = useAuth((s) => s.user)!;
  const qc = useQueryClient();
  const [state, setState] = useState<any>({});
  const [customParams, setCustomParams] = useState<Record<string, number>>(labDraft?.content?.customParams ?? {});
  const [draftSource, setDraftSource] = useState<any>(labDraft?.content?.source);
  const [draftTitle, setDraftTitle] = useState(labDraft?.title ?? "");
  const [draftLessonId, setDraftLessonId] = useState(labDraft?.lessonId ?? "");
  const [draftInstructions, setDraftInstructions] = useState(labDraft?.content?.instructions ?? "");
  const [draftPrompts, setDraftPrompts] = useState<string[]>(id === "buoyancy" && labDraft ? buoyancyStepQuestions.map((question, index) => labDraft.content?.reportPrompts?.[index] ?? question) : labDraft?.content?.reportPrompts ?? []);
  const [showAllLessons, setShowAllLessons] = useState(false);
  const [lessonSearch, setLessonSearch] = useState("");
  const [draftDueDate, setDraftDueDate] = useState(labDraft?.assignment?.dueDate ? toLocalInput(labDraft.assignment.dueDate) : "");
  const [publishedForRetry, setPublishedForRetry] = useState(false);
  const saveProgress = useRef<{ resourceId?: string; published: boolean }>({ resourceId: labDraft?.resourceId, published: false });
  const resourceKey = useRef(idempotencyKey());
  const assignmentKey = useRef(idempotencyKey());
  useEffect(() => {
    setCustomParams(labDraft?.content?.customParams ?? {});
    setDraftSource(labDraft?.content?.source);
    setDraftTitle(labDraft?.title ?? "");
    setDraftLessonId(labDraft?.lessonId ?? "");
    setDraftInstructions(labDraft?.content?.instructions ?? "");
    setDraftPrompts(id === "buoyancy" && labDraft ? buoyancyStepQuestions.map((question, index) => labDraft.content?.reportPrompts?.[index] ?? question) : labDraft?.content?.reportPrompts ?? []);
    setDraftDueDate(labDraft?.assignment?.dueDate ? toLocalInput(labDraft.assignment.dueDate) : "");
    setPublishedForRetry(false);
    saveProgress.current = { resourceId: labDraft?.resourceId, published: false };
    resourceKey.current = idempotencyKey();
    assignmentKey.current = idempotencyKey();
  }, [location.key]);
  const preview = useMemo(() => {
    try { return simulate(id, state) as any; } catch { return null; }
  }, [id, state]);
  const [teacherAttempt, setTeacherAttempt] = useState<any>(null);
  // SAI-01: level of the last legacy hint in this session, so the panel can say why a level stayed.
  const [lastHintLevel, setLastHintLevel] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [saved, setSaved] = useState(false);
  const tutorStatus = useQuery({
    queryKey: ["tutor-status"],
    queryFn: () => api("/tutor/status"),
  });
  const labs = useQuery({ queryKey: ["labs"], queryFn: () => api("/labs") });
  const tuningLabs = useQuery<{ lessons: Array<{ id: string; title: string; grade: number; labId?: string | null; subject: { id: string } }>; labs: Array<{ id: string; title: string; grade: number; subject: { id: string }; lessonIds: string[]; challenges: Array<{ id: string }>; release: { id: string }; previewConfig?: unknown; ranges: Record<string, { min: number; max: number; step?: number; unit?: string }>; effectiveParams: Record<string, Record<string, number | string> | null> }> }>({ queryKey: ["class-resource-lessons", classId], queryFn: () => api(`/classes/${classId}/assignable-content`), enabled: Boolean(labDraft && classId) });
  const activeTuningLab = tuningLabs.data?.labs.find((entry) => entry.id === id);
  const tuningSource = activeTuningLab?.release.id === draftSource?.releaseId ? activeTuningLab : undefined;
  const tuningRanges = tuningSource?.ranges ?? {};
  const tuningChallenge = draftSource?.challengeId ?? "";
  const tuningBase = tuningSource?.effectiveParams?.[tuningChallenge] ?? {};
  const matchingLessons = tuningLabs.data?.lessons.filter((lesson) => tuningSource?.lessonIds.length ? tuningSource.lessonIds.includes(lesson.id) : lesson.grade === tuningSource?.grade && lesson.subject.id === tuningSource?.subject.id && (lesson.title.toLocaleLowerCase("vi").includes(tuningSource.title.toLocaleLowerCase("vi")) || tuningSource.title.toLocaleLowerCase("vi").includes(lesson.title.toLocaleLowerCase("vi")))) ?? [];
  const relatedTuningLessons = showAllLessons || !matchingLessons.length ? tuningLabs.data?.lessons.filter((lesson) => lesson.grade === tuningSource?.grade && lesson.subject.id === tuningSource?.subject.id) ?? [] : matchingLessons;
  const visibleTuningLessons = relatedTuningLessons.filter((lesson) => lesson.title.toLocaleLowerCase("vi").includes(lessonSearch.trim().toLocaleLowerCase("vi")));
  useEffect(() => { if (!draftLessonId && matchingLessons.length === 1) setDraftLessonId(matchingLessons[0].id); }, [draftLessonId, matchingLessons]);
  const assignment = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: () => api(`/assignments/${encodeURIComponent(assignmentId!)}`),
    enabled: user.role === "STUDENT" && Boolean(assignmentId),
  });
  const publicLab = labs.data?.find((item: any) => item.id === id);
  const classResource = useQuery<any>({ queryKey: ["class-resource", classId, resourceId], queryFn: () => api(`/classes/${encodeURIComponent(classId!)}/resources/${encodeURIComponent(resourceId!)}`), enabled: Boolean(resourceId && classId) });
  const assignedLab = assignment.data?.contentType === "lab" && assignment.data.content?.id === id
    ? assignment.data.content
    : null;
  const lab = assignedLab ?? (classResource.data?.kind === "LAB" && classResource.data.content.source.labId === id ? { ...publicLab, id, title: classResource.data.title } : publicLab);
  const relatedLessons: RelatedLesson[] = publicLab?.lessonLinks ?? [];
  const originLessonId = searchParams.get("lessonId");
  const originLesson = originLessonId ? relatedLessons.find((lesson) => lesson.lessonId === originLessonId) : relatedLessons[0];
  const requestedSection = searchParams.get("sectionId");
  const mappedSection = originLesson ? lessonLabSection(originLesson.lessonId, id) : undefined;
  const returnSection = originLessonId === originLesson?.lessonId && requestedSection === mappedSection ? mappedSection : undefined;
  const returnAssignment = originLessonId === originLesson?.lessonId ? searchParams.get("lessonAssignmentId") || undefined : undefined;
  const returnToLesson = originLesson ? relatedLessonHref(originLesson.lessonId, returnSection ? "reading" : "labs", returnAssignment, returnSection) : undefined;
  const challengeId = assignedLab?.challengeId ?? classResource.data?.content?.source?.challengeId ?? publicLab?.challenges?.[0]?.id ?? null;
  // Before a run resolves its renderer, students see the Lab's legacy view; teachers preview the configured model.
  const startRenderer = user.role === "TEACHER" ? previewLabRenderer(id, classResource.data?.content?.execution?.modelRef ?? lab?.simulationModelRef) : labRenderer(id);
  const fallbackState = useMemo(
    () => location.state?.labState ?? startRenderer?.defaultState() ?? {},
    [id, location.key, location.state?.labState, startRenderer],
  );
  const labRun = useLabRunHost({
    enabled: user.role === "STUDENT" && Boolean(lab),
    userId: user.id,
    labId: id,
    challengeId,
    assignmentId,
    resourceId,
    releaseId: searchParams.get("releaseId") || undefined,
    state,
    initialState: fallbackState,
    onStateChange: setState,
  });
  const renderer = (user.role === "STUDENT" ? labRenderer(labRun.rendererKey) : null) ?? startRenderer;
  const guided = renderer?.guided ?? null;
  const guidedCopy = guided?.copy();
  const attempt = user.role === "STUDENT" ? labRun.attempt : teacherAttempt;
  useEffect(() => {
    setState(fallbackState);
    setTeacherAttempt(null);
    setSaved(false);
    setResetKey((k) => k + 1);
  }, [fallbackState]);
  const teacherRun = useAction(async () => {
    const r = await api("/simulate/" + id, "POST", state);
    setTeacherAttempt({ simulationResult: r, verdict: r.verdict });
    setSaved(false);
    return r;
  });
  const save = useAction(async () => {
    await api("/saved", "POST", {
      attemptId: attempt.id,
      note: lab?.title ?? id,
    });
    setSaved(true);
  });
  const saveTuning = useAction(async () => {
    if (!classId || !labDraft || !tuningSource || !draftTitle.trim() || !draftLessonId || !draftInstructions.trim()) throw new Error("Cần tên đề bài, bài học, hướng dẫn và nguồn Lab hợp lệ trước khi lưu.");
    if (id === "buoyancy" && (draftPrompts.length !== 4 || draftPrompts.some((prompt) => !prompt.trim()))) throw new Error("FL-05 cần đủ bốn câu hỏi theo bốn bước thí nghiệm.");
    const body = { kind: "LAB", title: draftTitle.trim(), lessonId: draftLessonId, content: { ...labDraft.content, source: draftSource, instructions: draftInstructions.trim(), reportPrompts: draftPrompts.map((prompt) => prompt.trim()).filter(Boolean), customParams } };
    if (labDraft.assignment && saveProgress.current.resourceId && !saveProgress.current.published) {
      const current = await api<any>(`/classes/${encodeURIComponent(classId)}/resources/${encodeURIComponent(saveProgress.current.resourceId)}`);
      if (current.status === "PUBLISHED") { saveProgress.current.published = true; setPublishedForRetry(true); }
    }
    const resource = saveProgress.current.published ? { id: saveProgress.current.resourceId } : saveProgress.current.resourceId
      ? await api(`/classes/${encodeURIComponent(classId)}/resources/${encodeURIComponent(saveProgress.current.resourceId)}`, "PUT", body)
      : await mutate(`/classes/${encodeURIComponent(classId)}/resources`, "POST", body, resourceKey.current);
    saveProgress.current.resourceId = resource.id;
    if (labDraft.assignment) {
      if (!saveProgress.current.published) {
        await api(`/classes/${encodeURIComponent(classId)}/resources/${encodeURIComponent(resource.id)}/publish`, "POST", {});
        saveProgress.current.published = true;
        setPublishedForRetry(true);
      }
      await mutate(`/classes/${encodeURIComponent(classId)}/assignments`, "POST", { contentType: "lab", contentId: id, classLabResourceId: resource.id, title: draftTitle.trim(), dueDate: draftDueDate ? new Date(draftDueDate).toISOString() : null, studentIds: labDraft.assignment.studentIds }, assignmentKey.current);
      await qc.invalidateQueries({ queryKey: ["class-assignments", classId] });
    }
    await qc.invalidateQueries({ queryKey: ["class-resources", classId] });
    navigate(`/classes/${encodeURIComponent(classId)}?tab=${labDraft.assignment ? "work" : "resources"}`);
  });
  const result = attempt?.simulationResult;
  const runtimeReady = user.role === "TEACHER" || Boolean(labRun.launch && labRun.rendererKey);
  const change = (next: any) => {
    if (user.role === "STUDENT") labRun.change(next);
    else {
      setState(next);
      setTeacherAttempt(null);
    }
    setSaved(false);
  };
  const pedagogy = labRun.launch?.classLabSnapshot ?? assignment.data?.classLabSnapshot ?? (classResource.data?.kind === "LAB" ? classResource.data.content : null);
  const responseClassId = classId ?? assignment.data?.classId ?? assignment.data?.classroom?.id;
  const responseResourceId = resourceId ?? pedagogy?.resourceId;
  const exitTo = responseClassId && (responseResourceId || labDraft) ? `/classes/${encodeURIComponent(responseClassId)}?tab=${labDraft?.assignment ? "work" : "resources"}` : returnToLesson ?? (assignmentId ? `/assignments/${encodeURIComponent(assignmentId)}` : "/labs");
  const space = (content: React.ReactNode) => <LabSpace title={lab?.title ?? t.discoveryRoom} exitTo={exitTo}>{user.role === "STUDENT" && pedagogy && <section className="panel class-lab-instructions"><h2>{t.teacherInstructions}</h2><b>{pedagogy.learningObjective}</b><p className="resource-plain-text">{pedagogy.instructions}</p>{id !== "buoyancy" && pedagogy.reportPrompts?.length > 0 && <ol>{pedagogy.reportPrompts.map((prompt: string, index: number) => <li key={index}>{prompt}</li>)}</ol>}<p className="tiny muted">{t.customSupplement}{responseResourceId ? ` ${t.unscoredClassPractice}` : ""}</p></section>}{user.role === "STUDENT" && responseClassId && responseResourceId && pedagogy?.reportPrompts?.length > 0 && <StudentClassLabAdditionalResponses classId={responseClassId} resourceId={responseResourceId} assignmentId={assignmentId} prompts={pedagogy.reportPrompts} />}<ErrorBox error={classResource.error} />{content}</LabSpace>;
  const tuningPanel = labDraft && user.role === "TEACHER" && <section className="panel" aria-label="Tùy biến thông số Lab">
    <h2>Thiết kế đề bài trong phòng thí nghiệm</h2>
    <p className="tiny muted">Chọn nội dung cho lớp. Mô hình và cách chấm của Lab nguồn vẫn được ghim.</p>
    <label className="field"><span>Tên đề bài</span><input required maxLength={160} value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} /></label>
    {relatedTuningLessons.length > 8 && <label className="field"><span>Tìm bài học phù hợp</span><input value={lessonSearch} onChange={(event) => setLessonSearch(event.target.value)} placeholder="Nhập tên bài học" /></label>}
    <label className="field"><span>Bài học liên kết</span><select required value={draftLessonId} onChange={(event) => setDraftLessonId(event.target.value)}>
      <option value="">Chọn bài học phù hợp</option>
      {draftLessonId && !visibleTuningLessons.some((lesson) => lesson.id === draftLessonId) && <option value={draftLessonId}>{tuningLabs.data?.lessons.find((lesson) => lesson.id === draftLessonId)?.title ?? "Bài học đã liên kết"}</option>}
      {visibleTuningLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
    </select></label>
    {matchingLessons.length > 0 && !showAllLessons && <button type="button" className="text-button" onClick={() => setShowAllLessons(true)}>Chọn bài học khác</button>}
    {!tuningLabs.isLoading && relatedTuningLessons.length === 0 && <p className="notice">Chưa có bài học phù hợp với Lab này trong lớp.</p>}
    <label className="field"><span>Hướng dẫn học sinh</span><textarea required maxLength={10000} value={draftInstructions} onChange={(event) => setDraftInstructions(event.target.value)} /></label>
    {labDraft.assignment && <label className="field"><span>Hạn nộp bản mới (không bắt buộc)</span><input type="datetime-local" value={draftDueDate} onChange={(event) => setDraftDueDate(event.target.value)} /></label>}
    <fieldset className="field"><legend>Câu hỏi hiển thị trong Lab Space</legend><p className="tiny muted">Giáo viên sửa lời hỏi; tiêu chí chấm và mô hình khoa học giữ nguyên.</p>
      {draftPrompts.map((prompt, index) => <label className="field" key={index}><span>{id === "buoyancy" ? `Bước ${index + 1}` : `Câu ${index + 1}`}</span><input maxLength={1000} value={prompt} onChange={(event) => setDraftPrompts((previous) => previous.map((item, i) => i === index ? event.target.value : item))} />{id !== "buoyancy" && <button type="button" className="text-button" onClick={() => setDraftPrompts((previous) => previous.filter((_, i) => i !== index))}>Xóa câu</button>}</label>)}
      {id !== "buoyancy" && draftPrompts.length < 20 && <button type="button" className="secondary" onClick={() => setDraftPrompts((previous) => [...previous, ""])}>Thêm câu hỏi</button>}
    </fieldset>
    {tuningLabs.isLoading && <p role="status">Đang tải giới hạn…</p>}
    <ErrorBox error={tuningLabs.error} />
    {activeTuningLab && !tuningSource && <p className="notice">Lab nguồn có release mới. Bản cũ vẫn giữ nguyên; chọn nâng cấp để tạo đề bài mới từ release hiện hành. <button type="button" className="secondary" onClick={() => { setDraftSource({ labId: id, releaseId: activeTuningLab.release.id, challengeId: activeTuningLab.challenges.some((item) => item.id === draftSource?.challengeId) ? draftSource.challengeId : activeTuningLab.challenges[0]?.id }); setCustomParams({}); }}>Dùng release hiện hành</button></p>}
    {!tuningLabs.isLoading && !activeTuningLab && <p>Không tìm thấy Lab đã chọn cho lớp.</p>}
    {tuningSource && !Object.keys(tuningRanges).length && <p className="notice">Lab này chưa có thông số tùy biến được duyệt. Bạn vẫn có thể sửa hướng dẫn và câu hỏi báo cáo của lớp.</p>}
    {Object.entries(tuningRanges).map(([key, range]) => {
      const current = customParams[key] ?? (typeof tuningBase?.[key] === "number" ? tuningBase[key] as number : range.min);
      return <label className="field" key={key}><span>{key}: {current} {range.unit ?? ""}</span><input type="range" min={range.min} max={range.max} step={range.step ?? 1} value={current} onChange={(event) => { const value = Number(event.target.value); setCustomParams((previous) => ({ ...previous, [key]: value })); if (key in state) change({ ...state, [key]: value }); }} /><small>{range.min} – {range.max} {range.unit ?? ""}</small></label>;
    })}
    <ErrorBox error={saveTuning.error} />
    {publishedForRetry && <p className="notice">Đề bài đã được lưu và xuất bản. Nếu giao bài lỗi, bấm lại để chỉ thử giao bài; nội dung đã lưu không đổi.</p>}
    <button type="button" className="primary" disabled={!tuningSource || saveTuning.isPending} onClick={() => saveTuning.mutate(null)}>{publishedForRetry ? "Thử giao bài lại" : labDraft.assignment ? "Lưu và giao bài cho lớp" : "Lưu đề bài vào Lớp"}</button>
  </section>;
  if (user.role === "TEACHER" && !labDraft && resourceId) {
    const pinned = classResource.data?.content?.execution;
    const compatible = pinned && renderer?.modelRefs.includes(pinned.modelRef);
    return space(<section className="panel"><h2>{t.pinnedSourcePreview}</h2><p>{t.advisoryPreview}</p>{classResource.isLoading ? <p role="status">{t.loadingActivity}</p> : compatible && renderer && id === "buoyancy" ? <><p>{pinned.modelRef} / {classResource.data.content.source.challengeId}</p><renderer.Activity state={state} onChange={change} resetKey={resetKey} runtimeParams={pinned.effectiveParams?.[challengeId ?? ""] ?? null} runtimeConfig={pinned.template?.buoyancy} displayQuestions={classResource.data.content.reportPrompts} authoring /></> : <>{labInfo.find((item) => item.id === id)?.thumbnail && <img className="resource-lab-thumbnail" src={labInfo.find((item) => item.id === id)!.thumbnail} alt={lab?.title ?? id} />}{classResource.data?.content?.reportPrompts?.length > 0 && <ol>{classResource.data.content.reportPrompts.map((prompt: string, index: number) => <li key={index}>{prompt}</li>)}</ol>}</>}</section>);
  }
  if (labDraft && user.role === "TEACHER") return space(<div className="teacher-lab-authoring">{tuningPanel}<section className="panel teacher-lab-preview"><h2>Xem trước phòng thí nghiệm</h2>{renderer && id === "buoyancy" ? <renderer.Activity state={state} onChange={change} resetKey={resetKey} runtimeParams={{ ...tuningBase, ...customParams }} runtimeConfig={tuningSource?.previewConfig} displayQuestions={draftPrompts} authoring onDisplayQuestionChange={(index, value) => setDraftPrompts((previous) => previous.map((item, i) => i === index ? value : item))} /> : <>{labInfo.find((item) => item.id === id)?.thumbnail && <img className="resource-lab-thumbnail" src={labInfo.find((item) => item.id === id)!.thumbnail} alt={lab?.title ?? id} />}<ol>{draftPrompts.filter((prompt) => prompt.trim()).map((prompt, index) => <li key={index}>{prompt}</li>)}</ol><p>Mô hình nguồn và cách chấm không thay đổi.</p></>}</section></div>);
  if (user.role === "TEACHER") return space(<section className="panel"><h2>Xem Lab nguồn</h2>{labInfo.find((item) => item.id === id)?.thumbnail && <img className="resource-lab-thumbnail" src={labInfo.find((item) => item.id === id)!.thumbnail} alt={lab?.title ?? id} />}<p>Để tạo hoặc sửa đề bài của lớp, mở Lab từ mục Giao lab hoặc từ bản nháp Class Lab. Chế độ giáo viên không có phần nộp bài của học sinh.</p><Link className="secondary" to="/class-labs">Quản lý Class Lab</Link></section>);
  if (!hasLabRenderer(id))
    return space(<p>{t.notFound}</p>);
  if (user.role === "STUDENT" && assignmentId && assignment.isSuccess && !assignedLab)
    return space(<section className="panel"><h1>{t.notFound}</h1><Link className="primary" to="/assignments">{t.backToList}</Link></section>);
  if (user.role === "STUDENT" && !assignmentId && !resourceId && labs.isSuccess && !publicLab)
    return space(<section className="panel"><h1>{t.notPublished}</h1><p>{t.notInCurriculum}</p><Link className="primary" to="/labs">{t.backToList}</Link></section>);
  // SAI-01A step 3 + B2: event-scored Labs render their own result, so the explanation and hint float beside it.
  const eventHint = user.role === "STUDENT" && labRun.attempt?.id && labRun.attempt.verdict
    ? <FloatingCheckpointHint key={labRun.attempt.id} attemptId={labRun.attempt.id} passed={labRun.attempt.verdict === "passed"}
        whatIf={id === "lever-equilibrium" ? "lever" : id === "thermal-energy" ? "thermal" : undefined} />
    // While working (no attempt yet): moment-A hints on a step the learner picks.
    : user.role === "STUDENT" && labRun.launch && !labRun.attempt ? <StepPickerHint key={labRun.launch.runId} runId={labRun.launch.runId} placement="floating" /> : null;
  if (id === "mass-conservation") return space(user.role !== "STUDENT"
    ? <section className="panel"><p>FL-10 cần phiên LabRun của học sinh để ghi dự đoán trước khi mở số cân.</p></section>
    : !labRun.launch || !labRun.rendererKey
      ? <div className="lab-session-gate"><div className="lab-session-card"><p>Bắt đầu hoạt động bảo toàn khối lượng. Số cân chỉ mở sau khi em ghi dự đoán.</p><button className="primary" disabled={labRun.pending || !lab || !challengeId} onClick={() => void labRun.open()}>{labRun.pending ? "Đang mở…" : "Bắt đầu thí nghiệm"}</button><ErrorBox error={labRun.error} /></div></div>
      : <><MassConservationActivity runId={labRun.launch.runId} state={state} onChange={change}
          onSubmit={() => void labRun.submit()} onNewRun={() => void labRun.open()}
          attempt={labRun.attempt} pendingSubmit={labRun.pending} />{eventHint}</>);
  if (id === "lever-equilibrium") return space(user.role !== "STUDENT"
    ? <section className="panel"><p>FL-06 cần phiên LabRun của học sinh để lưu dự đoán trước khi quan sát.</p></section>
    : !labRun.launch || !labRun.rendererKey
      ? <div className="lab-session-gate"><div className="lab-session-card"><p>Bắt đầu bài thực hành đòn bẩy. Dự đoán được ghi trước khi mở kết quả.</p><button className="primary" disabled={labRun.pending || !lab || !challengeId} onClick={() => void labRun.open()}>{labRun.pending ? "Đang mở…" : "Bắt đầu thí nghiệm"}</button><ErrorBox error={labRun.error} /></div></div>
      : <><LeverInvestigationActivity runId={labRun.launch.runId} onSubmit={() => void labRun.submit()} onNewRun={() => void labRun.open()} attempt={labRun.attempt} pendingSubmit={labRun.pending} />{eventHint}</>);
  if (id === "thermal-energy") return space(user.role !== "STUDENT"
    ? <section className="panel"><p>FL-07 cần phiên LabRun của học sinh để lưu dự đoán trước khi quan sát.</p></section>
    : !labRun.launch || !labRun.rendererKey
      ? <div className="lab-session-gate"><div className="lab-session-card"><p>Bắt đầu bài thực hành năng lượng nhiệt.</p><button className="primary" disabled={labRun.pending || !lab || !challengeId} onClick={() => void labRun.open()}>{labRun.pending ? "Đang mở…" : "Bắt đầu thí nghiệm"}</button><ErrorBox error={labRun.error} /></div></div>
      : <><ThermalEnergyActivity runId={labRun.launch.runId} onSubmit={() => void labRun.submit()} onNewRun={() => void labRun.open()} attempt={labRun.attempt} pendingSubmit={labRun.pending} submissionError={labRun.error} />{eventHint}</>);
  return space(
    <>
      <ErrorBox error={assignmentId ? assignment.error : labs.error} />
      {runtimeReady && preview && !guided && (id === "circuit" || typeof preview.extent === "number") && <div className="preview-strip">{t.devicePreview} {id === "circuit" ? `${preview.currentMa ?? '∞'} mA · ${preview.status}` : t.product(Number(preview.extent.toFixed(6)))} · {t.runToSave}</div>}
      <div className="lab-layout">
        <section className="lab-workspace">
          {runtimeReady && <div className="workspace-toolbar">
            <b>{id === "eye" ? t.eyeModel : t.bench}</b>
            <button
              className="text-button"
              onClick={() => {
                const next = renderer?.defaultState() ?? {};
                if (user.role === "STUDENT") labRun.reset(next);
                else change(next);
                setResetKey((k) => k + 1);
              }}
            >
              <RotateCcw size={14} />
              {t.reset}
            </button>
          </div>}
          {user.role === "STUDENT" && !runtimeReady ? (
            <div className="lab-session-gate" role="status" data-testid="lab-session-gate">
              <div className="lab-session-card">
                <div className="lab-session-meta">
                  <span className="lab-session-dot" aria-hidden="true" />
                  <span className="lab-session-help">{t.sessionHelp}</span>
                </div>
                <button
                  type="button"
                  className="primary lab-session-btn"
                  data-testid="lab-session-start"
                  onClick={() => void labRun.open()}
                  disabled={labRun.pending || !lab || !challengeId}
                >
                  <Play size={16} /> {labRun.pending ? t.startingSession : t.startSession}
                </button>
              </div>
            </div>
          ) : null}
          {runtimeReady && labRun.restoreCandidate && (
            <div className="lab-draft-backdrop" role="dialog" aria-modal="true" aria-labelledby="lab-draft-restore-title">
              <div className="notice lab-draft-modal" role="status" data-testid="lab-draft-restore">
                <b id="lab-draft-restore-title">{t.restoreTitle}</b>
                <p>{t.restoreBody}</p>
                <div className="lab-actions">
                  <button type="button" className="secondary" onClick={labRun.discardDraft}>{t.discard}</button>
                  <button type="button" className="primary" onClick={() => { labRun.restoreDraft(); setResetKey((key) => key + 1); }}>{t.restore}</button>
                </div>
              </div>
            </div>
          )}
          {runtimeReady && renderer && <renderer.Activity state={state} onChange={change} result={result} resetKey={resetKey} runtimeParams={labRun.launch?.runtimeParams ?? null} runtimeConfig={labRun.launch?.runtimeConfig} displayQuestions={pedagogy?.reportPrompts} />}
          {runtimeReady && <div className="lab-actions">
            <span>{guidedCopy ? guidedCopy.assessment : labRun.launch ? `${labRun.launch.modelRef} · ${labRun.launch.engineVersion}` : t.engine}</span>
            {user.role === "STUDENT" && runtimeReady && labRun.launch && !attempt && renderer?.envelope === "checkpoints" && (() => {
              const view = checkpointViewForRenderer(renderer.key);
              if (!view) return null;
              const step = view.hintStep(state);
              return <RunHintPanel key={`${step.ask?.criterion ?? ""}|${step.reflect?.criterion ?? ""}`} runId={labRun.launch.runId} step={step}
                labelOf={(criterion) => view.stepLabel(criterion.replace(/^prediction:/, ""))} />;
            })()}
            {user.role === "STUDENT" && runtimeReady && labRun.launch && !attempt && renderer && STATION_HINT_RENDERERS.has(renderer.key) && (
              <StepPickerHint key={labRun.launch.runId} runId={labRun.launch.runId} />
            )}

            <button
              className="primary"
              data-testid="lab-run-submit"
              onClick={() => user.role === "STUDENT" ? void labRun.submit() : teacherRun.mutate(null)}
              disabled={(user.role === "STUDENT" ? labRun.pending : teacherRun.isPending) || !lab || Boolean(attempt) || (guided !== null && !guided.ready(state))}
            >
              <Play size={15} />
              {(user.role === "STUDENT" ? labRun.pending : teacherRun.isPending)
                ? t.computing
                : guidedCopy ? guidedCopy.submit : id === "eye"
                  ? t.gradeParts
                  : t.run}
            </button>
          </div>}
          <ErrorBox error={user.role === "STUDENT" ? labRun.error : teacherRun.error} />
        </section>
        {runtimeReady && <aside className="lab-aside"><details className="lab-space-results" open={Boolean(result)}><summary>{guidedCopy ? guidedCopy.resultTitle : t.result}</summary>
          {runtimeReady && !guided && <section className="panel challenge-panel">
            <span className="eyebrow">{t.challenge}</span>
            <h3>
              {id === "circuit"
                ? t.circuitGoal
                : id === "eye"
                  ? t.eyeGoal
                  : t.chemGoal}</h3>
            <p>
              {id === "circuit"
                ? t.circuitTask
                : id === "eye"
                  ? t.eyeTask
                  : t.chemTask}
            </p>
            <ul className="checklist">
              <li>
                <CheckCircle2 size={15} />
                {t.observe}
              </li>
              <li>
                <CheckCircle2 size={15} />
                {t.runToCheck}
              </li>
              <li>
                <CheckCircle2 size={15} />
                {t.tryAgain}
              </li>
            </ul>
          </section>}
          <section className="panel result-panel">
            <h3>{guidedCopy ? guidedCopy.resultTitle : t.result}</h3>
            {result ? (
              <>
                <Badge tone={attempt.verdict}>
                  {verdictLabel(attempt.verdict)}
                </Badge>
                {guided ? (
                  <guided.Result result={result} verdict={attempt.verdict} />
                ) : id === "circuit" ? (
                  <>
                    <div className="result-value">
                      {result.currentMa ?? "∞"}
                      <small>{t.totalCurrent}</small>
                    </div>
                    <p>
                      LED: {result.ledState} · {result.status}
                    </p>
                    <p className="tiny muted">
                      {t.branchNote}
                    </p>
                  </>
                ) : id === "chemistry" && result.experiment === "ph" ? (
                  <>
                    <p>{result.phenomenon}</p>
                    <ul>
                      {result.samples?.map((sample: any, index: number) => (
                        <li key={sample.id}>
                          {t.sampleLabel(index + 1)}: {sample.type === "acid" ? t.acid : sample.type === "neutral" ? t.neutral : sample.type === "base" ? t.base : t.unclassified}
                          {" · "}{sample.correct ? t.sampleCorrect : t.sampleIncorrect}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : id === "chemistry" ? (
                  <>
                    <b>{result.equation}</b>
                    <p>{result.phenomenon}</p>
                    <p>{t.productLabel} {Number(result.extent.toFixed(6))} mol</p>
                    <p>
                      {t.excess(result.a)} {Number(result.remainingA.toFixed(6))} mol
                      <br />
                      {t.excess(result.b)} {Number(result.remainingB.toFixed(6))} mol
                    </p>
                  </>
                ) : (
                  <div className="result-value">
                    {result.score}
                    <small>{t.outOf100}</small>
                  </div>
                )}
                {user.role === "STUDENT" && (
                  <button
                    className="secondary wide"
                    disabled={save.isPending || saved}
                    onClick={() => save.mutate(null)}
                  >
                    <Bookmark size={15} />
                    {saved ? t.savedToRecord : t.save}
                  </button>
                )}
                <ErrorBox error={save.error} />
                {user.role === "STUDENT" && attempt.verdict !== "passed" && (
                  <button type="button" className="secondary wide" onClick={() => guided && renderer ? labRun.reset(renderer.defaultState()) : labRun.retry()}>
                    <RotateCcw size={15} /> {t.tryAgain}
                  </button>
                )}
              </>
            ) : (
              <p className="muted">
                {guidedCopy ? guidedCopy.waiting : t.resultAfterRun}
              </p>
            )}
          </section>
          {user.role === "STUDENT" && guided && renderer && (renderer.envelope === "checkpoints" || STATION_HINT_RENDERERS.has(renderer.key)) && attempt?.id && result && (
            <>
              <VerdictExplanationPanel key={"why-" + attempt.id} attemptId={attempt.id} passed={attempt.verdict === "passed"} />
              {attempt.verdict !== "passed" && <CheckpointHintPanel key={attempt.id} attemptId={attempt.id} />}
              {/* B3: station Labs offer what-ifs only after a pass, so no answer can help a retry. */}
              {attempt.verdict === "passed" && WHAT_IF_BY_RENDERER[renderer.key] && <section className="panel"><LabWhatIf kind={WHAT_IF_BY_RENDERER[renderer.key]} /></section>}
            </>
          )}
          {user.role === "STUDENT" && runtimeReady && !guided && (
            <LegacyHintPanel key={attempt?.id ?? "none"} attempt={attempt ?? null} llmEnabled={Boolean(tutorStatus.data?.llmEnabled)}
              previousLevel={lastHintLevel} onHint={(next) => setLastHintLevel(next.level)} />
          )}
          {user.role === "STUDENT" && runtimeReady && <TutorChat contextKind="LAB" contextId={id} />}
        </details></aside>}
      </div>
      {!guided && <p className="tiny muted">{t.disclaimer}</p>}
    </>
  );
}
