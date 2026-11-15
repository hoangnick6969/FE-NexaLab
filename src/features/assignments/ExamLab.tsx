import { Suspense, useMemo, useState } from "react";
import { ErrorBox } from "../../components/ui";
import { useAuth } from "../../lib/api";
import { labRenderer } from "../labs/runtime/activity-renderers";
import { useLabRunHost } from "../labs/runtime/lab-run-host";
import { loadLabActivity } from "../labs/runtime/lazy-lab-activity";

const MassConservation = loadLabActivity(() => import("../labs/chemistry/wet-bench/MassConservationActivity").then((m) => ({ default: m.MassConservationActivity })));
const Lever = loadLabActivity(() => import("../labs/physics/mechanics/LeverInvestigationActivity").then((m) => ({ default: m.LeverInvestigationActivity })));
const Thermal = loadLabActivity(() => import("../labs/physics/thermal/ThermalEnergyActivity").then((m) => ({ default: m.ThermalEnergyActivity })));
const emptyState = {};

export type ExamLabItem = { id: string; labId: string; challengeId: string; prompt: string; points: number };

export function ExamLab({ item, assignmentId, sessionId, saved, disabled }: {
  item: ExamLabItem; assignmentId: string; sessionId: string; saved: boolean; disabled: boolean;
}) {
  const userId = useAuth((s) => s.user!.id);
  const initialState = useMemo(() => labRenderer(item.labId)?.defaultState() ?? emptyState, [item.labId]);
  const [state, setState] = useState<unknown>(initialState);
  const run = useLabRunHost({
    enabled: !disabled, userId, labId: item.labId, challengeId: item.challengeId,
    exam: { assignmentId, sessionId, itemId: item.id }, state, initialState, onStateChange: setState,
  });
  const renderer = labRenderer(run.rendererKey);
  const launch = run.launch;
  const runProps = launch && {
    runId: launch.runId,
    onSubmit: () => { if (!disabled) void run.submit(); },
    onNewRun: () => { if (!disabled) void run.open(); },
    attempt: run.attempt,
    pendingSubmit: disabled || run.pending,
    examMode: true,
  };
  return (
    <fieldset className="exam-lab" disabled={disabled}>
      <legend>Thử thách Phòng Lab · {item.points.toLocaleString("vi-VN")} điểm</legend>
      <p>{item.prompt}</p>
      {(run.attempt || saved) && <p role="status">Đã lưu lần chạy Lab trong phiên thi.</p>}
      <ErrorBox error={run.error} />
      {(!launch || !renderer || !runProps) ? (
        <button type="button" className="secondary" disabled={run.pending} onClick={() => void run.open()}>
          {run.pending ? "Đang mở Lab…" : "Mở Lab trong bài thi"}
        </button>
      ) : (
        <Suspense fallback={<p role="status">Đang tải mô phỏng…</p>}>
          {run.restoreCandidate && <button type="button" className="secondary" onClick={run.restoreDraft}>Khôi phục trạng thái Lab đã lưu</button>}
          {renderer.key === "mass-conservation" ? <MassConservation key={launch.runId} {...runProps} state={state} onChange={run.change} />
            : renderer.key === "lever-bench" ? <Lever key={launch.runId} {...runProps} />
            : renderer.key === "thermal-bench" ? <Thermal key={launch.runId} {...runProps} />
            : <>
                <renderer.Activity state={state} onChange={run.change} resetKey={0} runtimeParams={launch.runtimeParams ?? null} runtimeConfig={launch.runtimeConfig} />
                <button type="button" className="secondary" disabled={run.pending || !!run.attempt || (renderer.guided != null && !renderer.guided.ready(state))} onClick={runProps.onSubmit}>Chạy mô phỏng và lưu kết quả</button>
                {run.attempt && <button type="button" className="secondary" onClick={runProps.onNewRun}>Mở lượt chạy khác</button>}
              </>}
          {run.attempt && ["mass-conservation", "lever-bench", "thermal-bench"].includes(renderer.key) && (
            <button type="button" className="secondary" onClick={runProps.onNewRun}>Mở lượt chạy khác</button>
          )}
        </Suspense>
      )}
    </fieldset>
  );
}
