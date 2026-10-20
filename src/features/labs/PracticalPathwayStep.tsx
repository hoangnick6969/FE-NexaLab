import { lazy, Suspense, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, RotateCcw } from "lucide-react";
import { api } from "../../lib/api";
import { Badge, ErrorBox, InlineLoader, verdictLabel } from "../../components/ui";
import { CircuitPathwayStep } from "./CircuitPathwayStep";
import { Chemistry } from "./Chemistry";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    opening: "Đang mở phòng thực hành…",
    openFailed: "Không mở được phòng thực hành",
    retry: "Thử lại",
    phArea: "Khu vực thực hành đo pH",
    eyeArea: "Khu vực thực hành cấu tạo mắt",
    passed: "Đã đạt",
    todo: "Cần hoàn thành",
    requirement: "Yêu cầu của thử thách:",
    eyeHint: "Bấm “Kiểm tra tên gọi”, chọn từng bộ phận rồi nhập tên của nó.",
    loadingEye: "Đang nạp mô hình 3D giải phẫu mắt…",
    reset: "Làm lại",
    grading: "Đang chấm…",
    gradeParts: "Chấm tên bộ phận",
    checkResult: "Kiểm tra kết quả",
    run: "Chạy thí nghiệm",
    resend: "Gửi lại",
    partsCorrect: (n: number) => `Đúng ${n}% tên bộ phận.`,
  },
  en: {
    opening: "Opening the lab…",
    openFailed: "The lab could not be opened",
    retry: "Try again",
    phArea: "pH measurement practice area",
    eyeArea: "Eye structure practice area",
    passed: "Passed",
    todo: "To complete",
    requirement: "Challenge requirement:",
    eyeHint: "Press “Check the names”, select each part and type its name.",
    loadingEye: "Loading the 3D eye anatomy model…",
    reset: "Reset",
    grading: "Grading…",
    gradeParts: "Check the part names",
    checkResult: "Check the result",
    run: "Run the experiment",
    resend: "Send again",
    partsCorrect: (n: number) => `${n}% of part names correct.`,
  },
});
const t = text();

const Eye = lazy(() => import("./Eye"));

type Props = { lessonId: string; assignmentId: string; step: any; onReconciled?: (pathway: any) => void };

const initialState = (labId: string) => (labId === "chemistry" ? { samples: {} } : { answers: {} });

/**
 * LAB/CHALLENGE step of an assigned lesson. The server names the model and the
 * challenge (including a teacher variant), so each lab gets its own workspace.
 */
export function PracticalPathwayStep({ lessonId, assignmentId, step, onReconciled }: Props) {
  // The step resource names the model: LAB carries labId, CHALLENGE a `${labId}_…` challenge ID.
  const labId: string = step.resource?.labId ?? String(step.resource?.challengeId ?? "circuit").split("_")[0];
  if (labId === "circuit") return <CircuitPathwayStep lessonId={lessonId} assignmentId={assignmentId} step={step} onReconciled={onReconciled} />;
  return <ModelWorkspace lessonId={lessonId} assignmentId={assignmentId} step={step} onReconciled={onReconciled} labId={labId} />;
}

function ModelWorkspace({ lessonId, assignmentId, step, onReconciled, labId }: Props & { labId: string }) {
  const workspace = useQuery({
    queryKey: ["step-lab", lessonId, step.id, assignmentId],
    queryFn: () => api(`/lessons/${lessonId}/steps/${step.id}/lab?assignmentId=${encodeURIComponent(assignmentId)}`),
  });
  if (workspace.isLoading) return <InlineLoader message={t.opening} />;
  if (workspace.error || !workspace.data)
    return (
      <div className="load-error">
        <ErrorBox error={workspace.error ?? t.openFailed} />
        <button type="button" onClick={() => workspace.refetch()}>
          {t.retry}
        </button>
      </div>
    );
  return <ModelPracticalStep lessonId={lessonId} assignmentId={assignmentId} step={step} onReconciled={onReconciled} labId={labId} workspace={workspace.data} />;
}

function ModelPracticalStep({ lessonId, assignmentId, step, onReconciled, labId, workspace }: Props & { labId: string; workspace: any }) {
  const [labState, setLabState] = useState<any>(() => initialState(labId));
  const [attempt, setAttempt] = useState<any>(null);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [newRun, setNewRun] = useState(false);
  const started = useRef(Date.now());
  const idempotencyKey = useRef(crypto.randomUUID());

  const change = (next: any) => {
    setLabState(next);
    setNewRun(true);
    if (attempt) {
      // A changed setup is a new attempt; the workspace itself is preserved.
      setAttempt(null);
      idempotencyKey.current = crypto.randomUUID();
    }
  };
  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await api("/attempts", "POST", {
        challengeId: workspace.challengeId,
        lessonStepId: step.id,
        assignmentId,
        labState,
        durationMs: Math.max(1000, Date.now() - started.current),
        idempotencyKey: idempotencyKey.current,
      });
      setAttempt({ ...(response.attempt ?? response), retryGuidance: response.retryGuidance ?? null });
      if (response.pathway && onReconciled) onReconciled(response.pathway);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };
  const retry = () => {
    setAttempt(null);
    setError(null);
    started.current = Date.now();
    idempotencyKey.current = crypto.randomUUID();
  };
  const result = attempt?.simulationResult;
  const passed = attempt ? attempt.verdict === "passed" : step.state === "COMPLETED" && !newRun;

  return (
    <section className="practical-step" aria-label={labId === "chemistry" ? t.phArea : t.eyeArea}>
      <div className="circuit-challenge-card practical-card">
        <div className="practical-card-head">
          <h4>{workspace.title}</h4>
          <Badge tone={passed ? "passed" : "outline"}>{passed ? t.passed : t.todo}</Badge>
        </div>
        <p className="muted">{workspace.instruction}</p>
        {step.type === "CHALLENGE" && workspace.targetObjective && (
          <p className="notice">
            <b>{t.requirement}</b> {workspace.targetObjective}
          </p>
        )}
        {labId === "eye" && <p className="tiny muted">{t.eyeHint}</p>}
      </div>
      {labId === "chemistry" ? (
        <Chemistry key={resetKey} state={labState} onChange={change} result={result} />
      ) : (
        <Suspense fallback={<InlineLoader message={t.loadingEye} />}>
          <Eye key={resetKey} state={labState} onChange={change} />
        </Suspense>
      )}
      <div className="lab-actions">
        <button
          type="button"
          className="text-button"
          onClick={() => {
            change(initialState(labId));
            started.current = Date.now();
            idempotencyKey.current = crypto.randomUUID();
            setResetKey((k) => k + 1);
          }}
        >
          <RotateCcw size={14} /> {t.reset}
        </button>
        {attempt && !passed ? (
          <button type="button" className="primary" onClick={retry}>
            {t.retry}
          </button>
        ) : (
          <button type="button" className="primary" onClick={submit} disabled={pending || passed}>
            <Play size={15} /> {pending ? t.grading : labId === "eye" ? t.gradeParts : labId === "chemistry" ? t.checkResult : t.run}
          </button>
        )}
      </div>
      {error ? (
        <div className="load-error">
          <ErrorBox error={error} />
          <button type="button" onClick={submit}>
            {t.resend}
          </button>
        </div>
      ) : null}
      {attempt && (
        <div className="practical-result" role="status">
          <Badge tone={attempt.verdict}>{verdictLabel(attempt.verdict)}</Badge>
          {labId === "chemistry" && result && (
            <p>
              {result.phenomenon}
            </p>
          )}
          {labId === "eye" && result && <p>{t.partsCorrect(result.score)}</p>}
          {attempt.retryGuidance && <p className="notice">{attempt.retryGuidance}</p>}
        </div>
      )}
    </section>
  );
}
