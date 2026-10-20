import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { simulate } from "@nexalab/sim";
import { Link, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Bookmark,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, useAuth } from "../../lib/api";
import { Badge, ErrorBox, useAction, verdictLabel, InlineLoader } from "../../components/ui";
import { Circuit, defaultCircuit } from "./Circuit";
import { Chemistry } from "./Chemistry";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    notFound: "Không tìm thấy phòng lab.",
    notPublished: "Phòng thực hành chưa được phát hành",
    notInCurriculum: "Nội dung này chưa có trong chương trình nền tảng đã duyệt.",
    backToList: "Quay lại danh sách",
    labs: "Phòng thí nghiệm",
    physics: "VẬT LÝ",
    biology: "SINH HỌC",
    chemistry: "HÓA HỌC",
    grades: "LỚP 8–9",
    discoveryRoom: "Phòng khám phá",
    teacherPreview: "Giáo viên · Xem trước",
    freePractice: "Thực hành tự do",
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
    eyeGoal: "Em hiểu đôi mắt đến đâu?",
    chemGoal: "Cân bằng lượng chất",
    circuitTask: "Tạo mạch kín chứa nguồn, LED và điện trở. Giữ dòng qua mỗi LED từ 1 đến 20 mA.",
    eyeTask: "Chuyển sang kiểm tra, nhập tên của 8 bộ phận rồi chấm.",
    chemTask: "Chọn một phản ứng và điều chỉnh số mol để hai chất phản ứng vừa đủ.",
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
    physics: "PHYSICS",
    biology: "BIOLOGY",
    chemistry: "CHEMISTRY",
    grades: "GRADES 8–9",
    discoveryRoom: "Discovery room",
    teacherPreview: "Teacher · Preview",
    freePractice: "Free practice",
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
    eyeGoal: "How well do you know the eye?",
    chemGoal: "Balance the amounts",
    circuitTask: "Build a closed circuit with a source, LED and resistor. Keep the current through each LED between 1 and 20 mA.",
    eyeTask: "Switch to the check, type the names of the 8 parts, then grade.",
    chemTask: "Choose a reaction and adjust the moles so both reactants are used up exactly.",
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
const Eye = lazy(() => import("./Eye"));
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
    return <p>{t.notFound}</p>;
  if (user.role === "STUDENT" && labs.isSuccess && !lab)
    return <section className="panel"><h1>{t.notPublished}</h1><p>{t.notInCurriculum}</p><Link className="primary" to="/labs">{t.backToList}</Link></section>;
  return (
    <>
      <Link className="back-link" to="/labs">
        <ArrowLeft size={15} /> {t.labs}
      </Link>
      <div className="page-heading lab-heading">
        <div>
          <Badge>
            {id === "circuit"
              ? t.physics
              : id === "eye"
                ? t.biology
                : t.chemistry}{" "}
            · {t.grades}
          </Badge>
          <h1>{lab?.title ?? t.discoveryRoom}</h1>
          <p className="muted">{lab?.learningObjective}</p>
        </div>
        <Badge tone="outline">
          {user.role === "TEACHER"
            ? t.teacherPreview
            : t.freePractice}
        </Badge>
      </div>
      <ErrorBox error={labs.error} />
      {preview && id !== "eye" && <div className="preview-strip">{t.devicePreview} {id === "circuit" ? `${preview.currentMa ?? '∞'} mA · ${preview.status}` : t.product(Number(preview.extent.toFixed(6)))} · {t.runToSave}</div>}
      <div className="lab-layout">
        <section className="lab-workspace">
          <div className="workspace-toolbar">
            <b>{id === "eye" ? t.eyeModel : t.bench}</b>
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
              {t.reset}
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
            <Suspense fallback={<InlineLoader message={t.loadingEye} />}>
              <Eye key={resetKey} state={state} onChange={change} />
            </Suspense>
          )}
          <div className="lab-actions">
            <span>{t.engine}</span>
            <button
              className="primary"
              onClick={() => run.mutate(null)}
              disabled={run.isPending || !lab}
            >
              <Play size={15} />
              {run.isPending
                ? t.computing
                : id === "eye"
                  ? t.gradeParts
                  : t.run}
            </button>
          </div>
          <ErrorBox error={run.error} />
        </section>
        <aside className="lab-aside">
          <section className="panel challenge-panel">
            <Badge tone="gold">{t.challenge}</Badge>
            <h3>
              {id === "circuit"
                ? t.circuitGoal
                : id === "eye"
                  ? t.eyeGoal
                  : t.chemGoal}
            </h3>
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
          </section>
          <section className="panel result-panel">
            <h3>{t.result}</h3>
            {result ? (
              <>
                <Badge tone={attempt.verdict}>
                  {verdictLabel(attempt.verdict)}
                </Badge>
                {id === "circuit" ? (
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
              </>
            ) : (
              <p className="muted">
                {t.resultAfterRun}
              </p>
            )}
          </section>
          {user.role === "STUDENT" && (
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
        </aside>
      </div>
      <p className="tiny muted">
        {t.disclaimer}
      </p>
    </>
  );
}
