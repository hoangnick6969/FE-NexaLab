import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { simulate } from "@nexalab/sim";
import {
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { Circuit, defaultCircuit } from "./Circuit";
import { api } from "../../lib/api";
import { Badge, ErrorBox } from "../../components/ui";

export interface CircuitPathwayStepProps {
  lessonId: string;
  step: any;
  onReconciled?: (pathway: any) => void;
}

export function CircuitPathwayStep({
  lessonId,
  step,
  onReconciled,
}: CircuitPathwayStepProps) {
  // 1. Initial State from existing step or default
  const [labState, setLabState] = useState<any>(() => {
    return step.resource?.defaultState ?? defaultCircuit();
  });

  const [loading, setLoading] = useState(false);
  const [slowLoadWarning, setSlowLoadWarning] = useState(false);
  const [attempt, setAttempt] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  // A teacher challenge variant carries its own objective (B1-T4); the lab step uses the model default.
  const workspace = useQuery({
    queryKey: ["step-lab", lessonId, step.id],
    queryFn: () => api(`/lessons/${lessonId}/steps/${step.id}/lab`),
    enabled: step.type === "CHALLENGE",
  });

  // 2. Client-side preview parity calculation using @nexalab/sim
  const preview = useMemo(() => {
    try {
      return simulate("circuit", labState) as any;
    } catch {
      return null;
    }
  }, [labState]);

  // >4s slow load detection timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setSlowLoadWarning(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // 3. Submit attempt to backend
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    const durationMs = Math.max(1000, Date.now() - startTimeRef.current);

    const payload = {
      lessonStepId: step.id,
      challengeId: step.resource?.challengeId ?? "circuit_001",
      labState,
      durationMs,
      idempotencyKey: idempotencyKeyRef.current,
    };

    try {
      const response = await api("/attempts", "POST", payload);
      const attemptData = response.attempt
        ? {
            ...response.attempt,
            retryGuidance: response.retryGuidance ?? response.attempt.retryGuidance ?? null,
          }
        : response;
      setAttempt(attemptData);
      if (response.pathway && onReconciled) {
        onReconciled(response.pathway);
      }
    } catch (err: any) {
      setError(err?.message || "Lỗi khi lưu kết quả bài tập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Retry handler: Preserve circuit canvas, generate fresh idempotency key
  const handleRetry = () => {
    setAttempt(null);
    setError(null);
    startTimeRef.current = Date.now();
    idempotencyKeyRef.current = crypto.randomUUID();
    // Notice: labState is strictly PRESERVED (Zero State Loss)
  };

  const verdict = attempt?.verdict;
  const isPassed = verdict === "passed";

  return (
    <section
      className="circuit-pathway-container"
      aria-label="Khu vực thực hành mạch điện"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        marginTop: "1rem",
      }}
    >
      {/* Slow loading warning if initial load takes > 4s */}
      {slowLoadWarning && !preview && (
        <div
          role="status"
          className="notice warning"
          style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(255,180,0,0.1)" }}
        >
          <HelpCircle size={16} /> Quá trình tải mô phỏng đang mất nhiều thời gian hơn bình thường. Bạn vẫn có thể thao tác với các linh kiện bên dưới.
        </div>
      )}

      {/* Challenge Instructions */}
      <div
        className="circuit-challenge-card"
        style={{
          padding: "1rem 1.25rem",
          background: "var(--card, #1c1d22)",
          borderRadius: "12px",
          border: "1px solid var(--border, #2e3039)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>
            {step.resource?.title ?? "Thử thách: Mạch điện thắp sáng đèn LED"}
          </h4>
          <Badge tone={isPassed ? "passed" : "outline"}>
            {isPassed ? "Đã đạt" : "Cần hoàn thành"}
          </Badge>
        </div>
        <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--muted, #9e9ea7)" }}>
          {step.resource?.instruction ??
            "Hãy kéo thả nguồn điện, điện trở thích hợp và công tắc để nối kín mạch điện làm đèn LED sáng an toàn."}
        </p>
        {step.type === "CHALLENGE" && workspace.data?.targetObjective && (
          <p className="notice" style={{ margin: "0.5rem 0 0" }}>
            <b>Yêu cầu của thử thách:</b> {workspace.data.targetObjective}
          </p>
        )}

        {preview && (
          <div
            style={{
              marginTop: "0.75rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              background: "rgba(0,0,0,0.25)",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Sparkles size={15} color="#e5a93c" />
            <span>
              Xem trước: <b>{preview.currentMa ?? 0} mA</b> · {preview.status === "lit" ? "Đèn sáng" : "Đèn chưa sáng"}
            </span>
          </div>
        )}
      </div>

      {/* Circuit Interactive Workspace (>= 70vh) */}
      <div
        className="circuit-workspace-wrapper"
        data-testid="circuit-workspace"
        style={{
          minHeight: "480px",
          height: "70vh",
          position: "relative",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid var(--border, #2e3039)",
          background: "#121316",
        }}
      >
        <Circuit initial={labState} onChange={setLabState} />
      </div>

      {/* Error Box */}
      {error && <ErrorBox error={error} />}

      {/* Official Verdict & Feedback Banner (When submitted) */}
      {attempt && (
        <div
          className={`circuit-verdict-banner circuit-verdict--${verdict}`}
          data-testid="circuit-verdict-banner"
          style={{
            padding: "1.25rem",
            borderRadius: "12px",
            border: `1px solid ${
              isPassed
                ? "rgba(46, 213, 115, 0.4)"
                : verdict === "partial"
                ? "rgba(255, 171, 0, 0.4)"
                : "rgba(100, 150, 255, 0.4)"
            }`,
            background: isPassed
              ? "rgba(46, 213, 115, 0.08)"
              : verdict === "partial"
              ? "rgba(255, 171, 0, 0.08)"
              : "rgba(100, 150, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            {isPassed ? (
              <CheckCircle2 size={24} color="#2ed573" />
            ) : (
              <AlertCircle size={24} color={verdict === "partial" ? "#ffab00" : "#70a1ff"} />
            )}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <b style={{ fontSize: "1.05rem" }}>
                  {isPassed
                    ? "Xuất sắc! Mạch điện đã hoạt động an toàn"
                    : verdict === "partial"
                    ? "Mạch điện cần điều chỉnh thêm"
                    : "Mạch chưa hoàn thiện"}
                </b>
                {attempt.attemptNumber && (
                  <Badge tone="outline">
                    Lượt #{attempt.attemptNumber}
                  </Badge>
                )}
              </div>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.9rem", color: "var(--muted, #a0a0aa)" }}>
                {attempt.simulationResult?.message ??
                  (isPassed
                    ? "Đèn LED sáng đúng định mức. Em đã hoàn thành phần thực hành!"
                    : "Em hãy xem gợi ý bên dưới và điều chỉnh lại mạch điện.")}
              </p>
            </div>
          </div>

          {/* Supportive Guidance (Pedagogical feedback) */}
          {attempt.retryGuidance && (
            <div
              style={{
                fontSize: "0.88rem",
                padding: "0.6rem 0.8rem",
                borderRadius: "6px",
                background: "rgba(0,0,0,0.2)",
                borderLeft: "3px solid #ffab00",
              }}
            >
              💡 <b>Gợi ý:</b> {attempt.retryGuidance}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem" }}>
            {!isPassed && (
              <button
                type="button"
                className="primary"
                onClick={handleRetry}
                data-testid="circuit-retry-button"
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <RotateCcw size={16} /> Thử lại (giữ nguyên mạch)
              </button>
            )}
            {isPassed && (
              <span style={{ fontSize: "0.9rem", color: "#2ed573", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <CheckCircle2 size={16} /> Bước thực hành đã được lưu vào tiến độ học tập.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Primary Action Button (Submit) */}
      {!isPassed && !attempt && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="primary"
            onClick={handleSubmit}
            disabled={loading}
            data-testid="circuit-submit-button"
            style={{
              padding: "0.75rem 1.75rem",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            {loading ? <Loader2 size={18} className="spin" /> : <Play size={18} />}
            {loading ? "Đang thẩm định kết quả…" : "Chạy thí nghiệm & Nộp bài"}
          </button>
        </div>
      )}
    </section>
  );
}
