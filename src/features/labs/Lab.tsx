import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { simulate } from "@nexalab/sim";
import { Link, useParams, useLocation, useSearchParams } from "react-router-dom";
import {
  Play,
  RotateCcw,
  Bookmark,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, useAuth } from "../../lib/api";
import { Badge, ErrorBox, useAction, verdictLabel, InlineLoader } from "../../components/ui";
import { Circuit, defaultCircuit } from "./physics/electricity/Circuit";
import { checkpointViewForModel, checkpointViewForRenderer } from "./runtime/checkpoint-views";
import { defaultEmEvidence } from "./physics/electricity/induction/em-evidence";
import { Chemistry } from "./chemistry/Chemistry";
import { useLabRunHost } from "./runtime/lab-run-host";
import { defineText } from "../../i18n";
import { lessonLabSection, relatedLessonHref, type RelatedLesson } from "./pathways/lesson-lab-navigation";
import { LabSpace } from "./shared/LabSpace";

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
    loadingEye: "Đang nạp mô hình 3D giải phẫu mắt…",
    engine: "Engine khoa học · v1.0.0",
    computing: "Đang tính…",
    gradeParts: "Chấm tên bộ phận",
    run: "Chạy thí nghiệm",
    challenge: "THỬ THÁCH 01",
    circuitGoal: "LED sáng, dòng điện an toàn",
    bulbGoal: "Quan sát mạch điện đóng và mở",
    bulbTask: "Dự đoán trạng thái bóng đèn khi đóng và mở công tắc, rồi giải thích kết quả.",
    bulbPredict: "Dự đoán trước khi xem kết quả", bulbSubmit: "Nộp kết quả",
    bulbExplanation: "Xem lại câu giải thích",
    bulbPassed: "Em đã hoàn thành tốt hoạt động này.", bulbNeedsPractice: "Hãy xem lại phản hồi rồi thử lại từ đầu.",
    bulbAssessment: "Kết quả được chấm trên máy chủ", bulbWaiting: "Hoàn thành các bước trong sơ đồ để nộp bài.",
    bulbResult: "Kết quả bài làm",
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
    guide: "Người bạn hướng dẫn",
    aiGuide: "AI + hướng dẫn từ engine",
    ruleGuide: "Gợi ý theo luật · chưa cấu hình AI",
    level: (n: number) => `MỨC ${n} / 4`,
    stuck: "Chưa tìm ra câu trả lời? Bắt đầu từ một câu hỏi nhỏ.",
    getHint: "Nhận gợi ý",
    hintRule: "Chỉ mở mức gợi ý tiếp theo sau khi em thực sự thử lại.",
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
    loadingEye: "Loading the 3D eye anatomy model…",
    engine: "Science engine · v1.0.0",
    computing: "Computing…",
    gradeParts: "Check the part names",
    run: "Run the experiment",
    challenge: "CHALLENGE 01",
    circuitGoal: "LED on, safe current",
    bulbGoal: "Observe open and closed circuits",
    bulbTask: "Predict the bulb state with the switch closed and open, then explain the result.",
    bulbPredict: "Predict before seeing the result", bulbSubmit: "Submit results",
    bulbExplanation: "Review the explanation",
    bulbPassed: "You completed this activity successfully.", bulbNeedsPractice: "Review the feedback, then try the activity again.",
    bulbAssessment: "Result assessed by the server", bulbWaiting: "Complete the diagram steps to submit your work.",
    bulbResult: "Activity feedback",
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
    guide: "Your guide",
    aiGuide: "AI + engine guidance",
    ruleGuide: "Rule-based hints · AI not configured",
    level: (n: number) => `LEVEL ${n} / 4`,
    stuck: "Not there yet? Start with a small question.",
    getHint: "Get a hint",
    hintRule: "The next hint level opens only after you really try again.",
    disclaimer: "An idealised model for learning. Official results are computed on the server; do not use it to design real circuits or handle real chemicals.",
  },
});
const t = text();
const Eye = lazy(() => import("./biology/anatomy/Eye"));
const initialLabState = (id: string) => id === "circuit"
  ? defaultCircuit()
  : id === "chemistry"
    ? { reactionId: "mg-hcl", molesA: 0.1, molesB: 0.2 }
    : id === "em-induction"
      ? defaultEmEvidence()
      : { answers: {} };

export default function Lab() {
  const { id = "circuit" } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get("assignmentId") || undefined;
  const user = useAuth((s) => s.user)!;
  const qc = useQueryClient();
  const [state, setState] = useState<any>({});
  const preview = useMemo(() => {
    try { return simulate(id, state) as any; } catch { return null; }
  }, [id, state]);
  const [teacherAttempt, setTeacherAttempt] = useState<any>(null);
  const [hint, setHint] = useState<any>(null);
  const [resetKey, setResetKey] = useState(0);
  const [saved, setSaved] = useState(false);
  const tutorStatus = useQuery({
    queryKey: ["tutor-status"],
    queryFn: () => api("/tutor/status"),
  });
  const labs = useQuery({ queryKey: ["labs"], queryFn: () => api("/labs") });
  const assignment = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: () => api(`/assignments/${encodeURIComponent(assignmentId!)}`),
    enabled: user.role === "STUDENT" && Boolean(assignmentId),
  });
  const publicLab = labs.data?.find((item: any) => item.id === id);
  const assignedLab = assignment.data?.contentType === "lab" && assignment.data.content?.id === id
    ? assignment.data.content
    : null;
  const lab = assignedLab ?? publicLab;
  const relatedLessons: RelatedLesson[] = publicLab?.lessonLinks ?? [];
  const originLessonId = searchParams.get("lessonId");
  const originLesson = originLessonId ? relatedLessons.find((lesson) => lesson.lessonId === originLessonId) : relatedLessons[0];
  const requestedSection = searchParams.get("sectionId");
  const mappedSection = originLesson ? lessonLabSection(originLesson.lessonId, id) : undefined;
  const returnSection = originLessonId === originLesson?.lessonId && requestedSection === mappedSection ? mappedSection : undefined;
  const returnAssignment = originLessonId === originLesson?.lessonId ? searchParams.get("lessonAssignmentId") || undefined : undefined;
  const returnToLesson = originLesson ? relatedLessonHref(originLesson.lessonId, returnSection ? "reading" : "labs", returnAssignment, returnSection) : undefined;
  const challengeId = assignedLab?.challengeId ?? publicLab?.challenges?.[0]?.id ?? null;
  const fallbackState = useMemo(
    () => location.state?.labState ?? (user.role === "TEACHER" && checkpointViewForModel(lab?.simulationModelRef) ? checkpointViewForModel(lab?.simulationModelRef)!.defaultEvidence() : initialLabState(id)),
    [id, location.key, location.state?.labState, user.role, lab?.simulationModelRef],
  );
  const labRun = useLabRunHost({
    enabled: user.role === "STUDENT" && Boolean(lab),
    userId: user.id,
    labId: id,
    challengeId,
    assignmentId,
    releaseId: searchParams.get("releaseId") || undefined,
    state,
    initialState: fallbackState,
    onStateChange: setState,
  });
  const checkpointView = checkpointViewForRenderer(labRun.rendererKey) ?? (user.role === "TEACHER" ? checkpointViewForModel(lab?.simulationModelRef) : null);
  const isCheckpoint = Boolean(checkpointView);
  const attempt = user.role === "STUDENT" ? labRun.attempt : teacherAttempt;
  useEffect(() => {
    setState(fallbackState);
    setTeacherAttempt(null);
    setHint(null);
    setSaved(false);
    setResetKey((k) => k + 1);
  }, [fallbackState]);
  const teacherRun = useAction(async () => {
    const r = await api("/simulate/" + id, "POST", state);
    setTeacherAttempt({ simulationResult: r, verdict: r.verdict });
    setHint(null);
    setSaved(false);
    return r;
  });
  const hintAction = useAction(async () => {
    const h = await api("/attempts/" + attempt.id + "/hint", "POST");
    setHint(h);
    return h;
  });
  const save = useAction(async () => {
    await api("/saved", "POST", {
      attemptId: attempt.id,
      note: lab?.title ?? id,
    });
    setSaved(true);
  });
  const result = attempt?.simulationResult;
  const runtimeReady = user.role === "TEACHER" || Boolean(labRun.launch && labRun.rendererKey);
  const change = (next: any) => {
    if (user.role === "STUDENT") labRun.change(next);
    else {
      setState(next);
      setTeacherAttempt(null);
    }
    setHint(null);
    setSaved(false);
  };
  const exitTo = returnToLesson ?? (assignmentId ? `/assignments/${encodeURIComponent(assignmentId)}` : "/labs");
  const space = (content: React.ReactNode) => <LabSpace title={lab?.title ?? t.discoveryRoom} exitTo={exitTo}>{content}</LabSpace>;
  if (!["circuit", "eye", "chemistry", "em-induction"].includes(id))
    return space(<p>{t.notFound}</p>);
  if (user.role === "STUDENT" && assignmentId && assignment.isSuccess && !assignedLab)
    return space(<section className="panel"><h1>{t.notFound}</h1><Link className="primary" to="/assignments">{t.backToList}</Link></section>);
  if (user.role === "STUDENT" && !assignmentId && labs.isSuccess && !publicLab)
    return space(<section className="panel"><h1>{t.notPublished}</h1><p>{t.notInCurriculum}</p><Link className="primary" to="/labs">{t.backToList}</Link></section>);
  return space(
    <>
      <ErrorBox error={assignmentId ? assignment.error : labs.error} />
      {runtimeReady && preview && !isCheckpoint && id !== "eye" && <div className="preview-strip">{t.devicePreview} {id === "circuit" ? `${preview.currentMa ?? '∞'} mA · ${preview.status}` : t.product(Number(preview.extent.toFixed(6)))} · {t.runToSave}</div>}
      <div className="lab-layout">
        <section className="lab-workspace">
          {runtimeReady && <div className="workspace-toolbar">
            <b>{id === "eye" ? t.eyeModel : t.bench}</b>
            <button
              className="text-button"
              onClick={() => {
                const next = checkpointView ? checkpointView.defaultEvidence() : initialLabState(id);
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
          {runtimeReady && checkpointView ? (
            <checkpointView.Activity state={state} onChange={change} />
          ) : runtimeReady && (labRun.rendererKey ?? id) === "circuit" ? (
            <Circuit
              key={resetKey}
              initial={state.nodes ? state : defaultCircuit()}
              onChange={change}
            />
          ) : runtimeReady && (labRun.rendererKey ?? id) === "chemistry" ? (
            <Chemistry state={state} onChange={change} result={result} />
          ) : runtimeReady && (labRun.rendererKey ?? id) === "eye" ? (
            <Suspense fallback={<InlineLoader message={t.loadingEye} />}>
              <Eye key={resetKey} state={state} onChange={change} />
            </Suspense>
          ) : null}
          {runtimeReady && !(isCheckpoint && user.role === "TEACHER") && <div className="lab-actions">
            <span>{isCheckpoint ? t.bulbAssessment : labRun.launch ? `${labRun.launch.modelRef} · ${labRun.launch.engineVersion}` : t.engine}</span>
            <button
              className="primary"
              data-testid="lab-run-submit"
              onClick={() => user.role === "STUDENT" ? void labRun.submit() : teacherRun.mutate(null)}
              disabled={(user.role === "STUDENT" ? labRun.pending : teacherRun.isPending) || !lab || Boolean(attempt) || (checkpointView !== null && !checkpointView.ready(state))}
            >
              <Play size={15} />
              {(user.role === "STUDENT" ? labRun.pending : teacherRun.isPending)
                ? t.computing
                : isCheckpoint ? t.bulbSubmit : id === "eye"
                  ? t.gradeParts
                  : t.run}
            </button>
          </div>}
          <ErrorBox error={user.role === "STUDENT" ? labRun.error : teacherRun.error} />
        </section>
        {runtimeReady && <aside className="lab-aside"><details className="lab-space-results" open={Boolean(result)}><summary>{isCheckpoint ? t.bulbResult : t.result}</summary>
          {runtimeReady && !isCheckpoint && <section className="panel challenge-panel">
            <span className="eyebrow">{t.challenge}</span>
            <h3>
              {isCheckpoint ? t.bulbGoal : id === "circuit"
                ? t.circuitGoal
                : id === "eye"
                  ? t.eyeGoal
                  : t.chemGoal}</h3>
            <p>
              {isCheckpoint ? t.bulbTask : id === "circuit"
                ? t.circuitTask
                : id === "eye"
                  ? t.eyeTask
                  : t.chemTask}
            </p>
            <ul className="checklist">
              <li>
                <CheckCircle2 size={15} />
                {isCheckpoint ? t.bulbPredict : t.observe}
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
            <h3>{isCheckpoint ? t.bulbResult : t.result}</h3>
            {result ? (
              <>
                <Badge tone={attempt.verdict}>
                  {verdictLabel(attempt.verdict)}
                </Badge>
                {isCheckpoint ? (
                  <>
                    <p className="bulb-result-message">{attempt.verdict === "passed" ? t.bulbPassed : t.bulbNeedsPractice}</p>
                    <p className="bulb-result-score">{result.assessment?.score} / {result.assessment?.maximumScore}<small>{t.bulbAssessment}</small></p>
                    <ul>
                      {result.observations?.map((item: any) => (
                        <li key={item.id}>
                          {checkpointView!.describeResult(item)}
                        </li>
                      ))}
                      {result.assessment?.unmetCriteria?.includes("explanation") && <li>{t.bulbExplanation}</li>}
                    </ul>
                  </>
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
                  <button type="button" className="secondary wide" onClick={() => checkpointView ? labRun.reset(checkpointView.defaultEvidence()) : labRun.retry()}>
                    <RotateCcw size={15} /> {t.tryAgain}
                  </button>
                )}
              </>
            ) : (
              <p className="muted">
                {isCheckpoint ? t.bulbWaiting : t.resultAfterRun}
              </p>
            )}
          </section>
          {user.role === "STUDENT" && runtimeReady && !isCheckpoint && (
            <section className="panel tutor-panel">
              <h3>
                <Sparkles size={19} />
                {t.guide}
              </h3>
              <span className="tiny muted">
                {tutorStatus.data?.provider === "anthropic"
                  ? t.aiGuide
                  : t.ruleGuide}
              </span>
              {hint ? (
                <div className="hint">
                  <Badge>{t.level(hint.level)}</Badge>
                  <p>{hint.content}</p>
                </div>
              ) : (
                <p>{t.stuck}</p>
              )}
              <button
                className="secondary wide"
                disabled={!attempt || hintAction.isPending || !!hint}
                onClick={() => hintAction.mutate(null)}
              >
                {t.getHint}
              </button>
              <ErrorBox error={hintAction.error} />
              <small>
                {t.hintRule}
              </small>
            </section>
          )}
        </details></aside>}
      </div>
      {runtimeReady && !isCheckpoint && <p className="tiny muted">{t.disclaimer}</p>}
    </>
  );
}
