import { lazy, Suspense, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, RotateCcw } from "lucide-react";
import { api } from "../api";
import { Badge, ErrorBox, InlineLoader, verdictLabel } from "../ui";
import { CircuitPathwayStep } from "./CircuitPathwayStep";
import { Chemistry } from "./chemistry";

const Eye = lazy(() => import("./eye"));

type Props = { lessonId: string; step: any; onReconciled?: (pathway: any) => void };

const initialState = (labId: string) => (labId === "chemistry" ? { reactionId: "mg-hcl", molesA: 0.1, molesB: 0.2 } : { answers: {} });

/**
 * LAB/CHALLENGE step of an assigned lesson. The server names the model and the
 * challenge (including a teacher variant), so each lab gets its own workspace.
 */
export function PracticalPathwayStep({ lessonId, step, onReconciled }: Props) {
  // The step resource names the model: LAB carries labId, CHALLENGE a `${labId}_…` challenge ID.
  const labId: string = step.resource?.labId ?? String(step.resource?.challengeId ?? "circuit").split("_")[0];
  if (labId === "circuit") return <CircuitPathwayStep lessonId={lessonId} step={step} onReconciled={onReconciled} />;
  return <ModelWorkspace lessonId={lessonId} step={step} onReconciled={onReconciled} labId={labId} />;
}

function ModelWorkspace({ lessonId, step, onReconciled, labId }: Props & { labId: string }) {
  const workspace = useQuery({
    queryKey: ["step-lab", lessonId, step.id],
    queryFn: () => api(`/lessons/${lessonId}/steps/${step.id}/lab`),
  });
  if (workspace.isLoading) return <InlineLoader message="Đang mở phòng thực hành…" />;
  if (workspace.error || !workspace.data)
    return (
      <div className="load-error">
        <ErrorBox error={workspace.error ?? "Không mở được phòng thực hành"} />
        <button type="button" onClick={() => workspace.refetch()}>
          Thử lại
        </button>
      </div>
    );
  return <ModelPracticalStep lessonId={lessonId} step={step} onReconciled={onReconciled} labId={labId} workspace={workspace.data} />;
}

function ModelPracticalStep({ lessonId, step, onReconciled, labId, workspace }: Props & { labId: string; workspace: any }) {
  const [labState, setLabState] = useState<any>(() => initialState(labId));
  const [attempt, setAttempt] = useState<any>(null);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const started = useRef(Date.now());
  const idempotencyKey = useRef(crypto.randomUUID());

  const change = (next: any) => {
    setLabState(next);
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
  const passed = attempt?.verdict === "passed";

  return (
    <section className="practical-step" aria-label={labId === "chemistry" ? "Khu vực thực hành phản ứng hóa học" : "Khu vực thực hành cấu tạo mắt"}>
      <div className="circuit-challenge-card practical-card">
        <div className="practical-card-head">
          <h4>{workspace.title}</h4>
          <Badge tone={passed ? "passed" : "outline"}>{passed ? "Đã đạt" : "Cần hoàn thành"}</Badge>
        </div>
        <p className="muted">{workspace.instruction}</p>
        {step.type === "CHALLENGE" && workspace.targetObjective && (
          <p className="notice">
            <b>Yêu cầu của thử thách:</b> {workspace.targetObjective}
          </p>
        )}
        {labId === "eye" && <p className="tiny muted">Bấm “Kiểm tra tên gọi”, chọn từng bộ phận rồi nhập tên của nó.</p>}
      </div>
      {labId === "chemistry" ? (
        <Chemistry state={labState} onChange={change} result={result} />
      ) : (
        <Suspense fallback={<InlineLoader message="Đang nạp mô hình 3D giải phẫu mắt…" />}>
          <Eye key={resetKey} state={labState} onChange={change} />
        </Suspense>
      )}
      <div className="lab-actions">
        <button
          type="button"
          className="text-button"
          onClick={() => {
            change(initialState(labId));
            setResetKey((k) => k + 1);
          }}
        >
          <RotateCcw size={14} /> Làm lại
        </button>
        {attempt && !passed ? (
          <button type="button" className="primary" onClick={retry}>
            Thử lại
          </button>
        ) : (
          <button type="button" className="primary" onClick={submit} disabled={pending || passed}>
            <Play size={15} /> {pending ? "Đang chấm…" : labId === "eye" ? "Chấm tên bộ phận" : "Chạy thí nghiệm"}
          </button>
        )}
      </div>
      {error ? (
        <div className="load-error">
          <ErrorBox error={error} />
          <button type="button" onClick={submit}>
            Gửi lại
          </button>
        </div>
      ) : null}
      {attempt && (
        <div className="practical-result" role="status">
          <Badge tone={attempt.verdict}>{verdictLabel(attempt.verdict)}</Badge>
          {labId === "chemistry" && result && (
            <p>
              {result.equation}: sản phẩm {Number(result.extent.toFixed(6))} mol · dư {result.a} {Number(result.remainingA.toFixed(6))} mol · dư{" "}
              {result.b} {Number(result.remainingB.toFixed(6))} mol
            </p>
          )}
          {labId === "eye" && result && <p>Đúng {result.score}% tên bộ phận.</p>}
          {attempt.retryGuidance && <p className="notice">{attempt.retryGuidance}</p>}
        </div>
      )}
    </section>
  );
}
