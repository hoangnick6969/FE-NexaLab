import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { simulate } from "@nexalab/sim";
import { Link, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Bookmark,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, useAuth } from "../api";
import { Badge, ErrorBox, useAction, verdictLabel } from "../ui";
import { Circuit, defaultCircuit } from "./circuit";
import { Chemistry } from "./chemistry";
const Eye = lazy(() => import("./eye"));
export default function Lab() {
  const { id = "circuit" } = useParams();
  const location = useLocation();
  const user = useAuth((s) => s.user)!;
  const qc = useQueryClient();
  const [state, setState] = useState<any>({});
  const preview = useMemo(() => {
    try { return simulate(id, state) as any; } catch { return null; }
  }, [id, state]);
  const [attempt, setAttempt] = useState<any>(null);
  const [hint, setHint] = useState<any>(null);
  const [started, setStarted] = useState(Date.now());
  const [resetKey, setResetKey] = useState(0);
  const [saved, setSaved] = useState(false);
  const tutorStatus = useQuery({
    queryKey: ["tutor-status"],
    queryFn: () => api("/tutor/status"),
  });
  const labs = useQuery({ queryKey: ["labs"], queryFn: () => api("/labs") });
  const lab = labs.data?.find((l: any) => l.id === id);
  useEffect(() => {
    setState(
      location.state?.labState ??
        (id === "circuit"
          ? defaultCircuit()
          : id === "chemistry"
            ? { reactionId: "mg-hcl", molesA: 0.1, molesB: 0.2 }
            : { answers: {} }),
    );
    setAttempt(null);
    setHint(null);
    setSaved(false);
    setStarted(Date.now());
    setResetKey((k) => k + 1);
  }, [id, location.key]);
  const run = useAction(async () => {
    const r = await api(
      user.role === "STUDENT" ? "/attempts" : "/simulate/" + id,
      "POST",
      user.role === "STUDENT"
        ? {
            challengeId: id + "_001",
            labState: state,
            durationMs: Date.now() - started,
          }
        : state,
    );
    setAttempt(
      user.role === "STUDENT" ? r : { simulationResult: r, verdict: r.verdict },
    );
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
  const change = (next: any) => {
    setState(next);
    setAttempt(null);
    setHint(null);
    setSaved(false);
  };
  if (!["circuit", "eye", "chemistry"].includes(id))
    return <p>Không tìm thấy phòng lab.</p>;
  return (
    <>
      <Link className="back-link" to="/labs">
        <ArrowLeft size={15} /> Phòng thí nghiệm
      </Link>
      <div className="page-heading lab-heading">
        <div>
          <Badge>
            {id === "circuit"
              ? "VẬT LÝ"
              : id === "eye"
                ? "SINH HỌC"
                : "HÓA HỌC"}{" "}
            · LỚP 8–9
          </Badge>
          <h1>{lab?.title ?? "Phòng thực hành"}</h1>
          <p className="muted">{lab?.learningObjective}</p>
        </div>
        <Badge tone="outline">
          {user.role === "TEACHER"
            ? "Giáo viên · Xem trước"
            : "Thực hành tự do"}
        </Badge>
      </div>
      <ErrorBox error={labs.error} />
      {preview && id !== "eye" && <div className="preview-strip">Xem trước trên thiết bị: {id === "circuit" ? `${preview.currentMa ?? '∞'} mA · ${preview.status}` : `${Number(preview.extent.toFixed(6))} mol sản phẩm`} · Chạy thí nghiệm để lưu và chấm chính thức trên server.</div>}
      <div className="lab-layout">
        <section className="lab-workspace">
          <div className="workspace-toolbar">
            <b>{id === "eye" ? "Mô hình cấu tạo mắt" : "Bàn thực hành"}</b>
            <button
              className="text-button"
              onClick={() => {
                change(
                  id === "circuit"
                    ? defaultCircuit()
                    : id === "chemistry"
                      ? { reactionId: "mg-hcl", molesA: 0.1, molesB: 0.2 }
                      : { answers: {} },
                );
                setResetKey((k) => k + 1);
                setStarted(Date.now());
              }}
            >
              <RotateCcw size={14} />
              Làm lại
            </button>
          </div>
          {id === "circuit" ? (
            <Circuit
              key={resetKey}
              initial={state.nodes ? state : defaultCircuit()}
              onChange={change}
            />
          ) : id === "chemistry" ? (
            <Chemistry state={state} onChange={change} result={result} />
          ) : (
            <Suspense fallback={<p>Đang tải mô hình 3D…</p>}>
              <Eye key={resetKey} state={state} onChange={change} />
            </Suspense>
          )}
          <div className="lab-actions">
            <span>Engine khoa học · v1.0.0</span>
            <button
              className="primary"
              onClick={() => run.mutate(null)}
              disabled={run.isPending || !lab}
            >
              <Play size={15} />
              {run.isPending
                ? "Đang tính…"
                : id === "eye"
                  ? "Chấm tên bộ phận"
                  : "Chạy thí nghiệm"}
            </button>
          </div>
          <ErrorBox error={run.error} />
        </section>
        <aside className="lab-aside">
          <section className="panel challenge-panel">
            <Badge tone="gold">THỬ THÁCH 01</Badge>
            <h3>
              {id === "circuit"
                ? "LED sáng, dòng điện an toàn"
                : id === "eye"
                  ? "Em hiểu đôi mắt đến đâu?"
                  : "Cân bằng lượng chất"}
            </h3>
            <p>
              {id === "circuit"
                ? "Tạo mạch kín chứa nguồn, LED và điện trở. Giữ dòng qua mỗi LED từ 1 đến 20 mA."
                : id === "eye"
                  ? "Chuyển sang kiểm tra, nhập tên của 8 bộ phận rồi chấm."
                  : "Chọn một phản ứng và điều chỉnh số mol để hai chất phản ứng vừa đủ."}
            </p>
            <ul className="checklist">
              <li>
                <CheckCircle2 size={15} />
                Quan sát trước khi thay đổi
              </li>
              <li>
                <CheckCircle2 size={15} />
                Chạy để kiểm chứng dự đoán
              </li>
              <li>
                <CheckCircle2 size={15} />
                Thử lại để hiểu rõ hơn
              </li>
            </ul>
          </section>
          <section className="panel result-panel">
            <h3>Kết quả mô phỏng</h3>
            {result ? (
              <>
                <Badge tone={attempt.verdict}>
                  {verdictLabel(attempt.verdict)}
                </Badge>
                {id === "circuit" ? (
                  <>
                    <div className="result-value">
                      {result.currentMa ?? "∞"}
                      <small>mA · dòng tổng</small>
                    </div>
                    <p>
                      LED: {result.ledState} · {result.status}
                    </p>
                    <p className="tiny muted">
                      Ngưỡng được kiểm tra trên từng nhánh, không phải dòng tổng
                      của các nhánh song song.
                    </p>
                  </>
                ) : id === "chemistry" ? (
                  <>
                    <b>{result.equation}</b>
                    <p>{result.phenomenon}</p>
                    <p>Sản phẩm: {Number(result.extent.toFixed(6))} mol</p>
                    <p>
                      Dư {result.a}: {Number(result.remainingA.toFixed(6))} mol
                      <br />
                      Dư {result.b}: {Number(result.remainingB.toFixed(6))} mol
                    </p>
                  </>
                ) : (
                  <div className="result-value">
                    {result.score}
                    <small>/ 100 điểm</small>
                  </div>
                )}
                {user.role === "STUDENT" && (
                  <button
                    className="secondary wide"
                    disabled={save.isPending || saved}
                    onClick={() => save.mutate(null)}
                  >
                    <Bookmark size={15} />
                    {saved ? "Đã lưu vào hồ sơ" : "Lưu thí nghiệm"}
                  </button>
                )}
                <ErrorBox error={save.error} />
              </>
            ) : (
              <p className="muted">
                Kết quả xuất hiện sau khi em chạy thí nghiệm.
              </p>
            )}
          </section>
          {user.role === "STUDENT" && (
            <section className="panel tutor-panel">
              <h3>
                <HelpCircle size={18} />
                Gợi ý học tập
              </h3>
              <span className="tiny muted">
                {tutorStatus.data?.provider === "anthropic"
                  ? "AI + hướng dẫn từ engine"
                  : "Gợi ý theo luật · chưa cấu hình AI"}
              </span>
              {hint ? (
                <div className="hint">
                  <Badge>MỨC {hint.level} / 4</Badge>
                  <p>{hint.content}</p>
                </div>
              ) : (
                <p>Chưa tìm ra câu trả lời? Bắt đầu từ một câu hỏi nhỏ.</p>
              )}
              <button
                className="secondary wide"
                disabled={!attempt || hintAction.isPending || !!hint}
                onClick={() => hintAction.mutate(null)}
              >
                Nhận gợi ý
              </button>
              <ErrorBox error={hintAction.error} />
              <small>
                Chỉ mở mức gợi ý tiếp theo sau khi em thực sự thử lại.
              </small>
            </section>
          )}
        </aside>
      </div>
      <p className="tiny muted">
        Mô hình lý tưởng dùng cho học tập. Kết quả chính thức được tính trên máy
        chủ; không áp dụng để thiết kế mạch hoặc thao tác hóa chất thật.
      </p>
    </>
  );
}
