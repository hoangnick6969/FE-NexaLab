import { K3Hud } from "../kit";
import { EXPLORATION_SPECIMENS, useBuoyancyStore, type BuoyancyStep } from "./useBuoyancyStore";

const steps: Array<{ id: BuoyancyStep; label: string; instruction: string }> = [
  { id: "air", label: "1 · Đo P₀", instruction: "Đo trọng lượng mẫu vật ngoài không khí bằng lực kế." },
  { id: "partial", label: "2 · Nhúng một phần", instruction: "Hạ mẫu vào bình tràn và đọc lực kế khi chìm một phần." },
  { id: "full", label: "3 · Nhúng hoàn toàn", instruction: "Nhúng chìm toàn bộ mẫu và đọc số chỉ lực kế." },
  { id: "verify", label: "4 · Kiểm chứng", instruction: "Đo nước tràn và so sánh F_A = P₀ − F_lực kế = ρgV." },
];

export function BuoyancyHud() {
  const state = useBuoyancyStore();
  const samples = [...state.config.specimens, ...EXPLORATION_SPECIMENS];
  const specimen = samples.find((item) => item.id === state.specimenId)!;
  const weightN = specimen.massG / 1000 * state.config.gravity;
  const buoyantN = state.config.fluidDensityKgM3 * state.config.gravity * state.submergedVolumeMl / 1e6;
  const index = steps.findIndex((item) => item.id === state.step);
  return <K3Hud title="FL-05 · Lực đẩy Ác-si-mét" stations={steps} current={state.step} onSelect={(id) => state.setStep(id as BuoyancyStep)} step={{ index, total: steps.length }} instruction={steps[index].instruction}
    readout={`Lực kế: ${state.springForceN.toFixed(3)} N · Nước tràn: ${state.overflowMl.toFixed(1)} mL`}
    telemetry={<><span>P₀: {weightN.toFixed(3)} N</span><span>F_A: {buoyantN.toFixed(3)} N</span><span>V chìm: {state.submergedVolumeMl.toFixed(1)} mL</span></>}
    formulaLatex={String.raw`F_A=P_0-F_{spring}=\rho gV_{submerged}`}
    actions={<>
      <label className="k3-range">Độ hạ lực kế · {Math.round(state.targetHoistHeight * 100)}%
        <input aria-label="Độ hạ lực kế" data-testid="buoyancy-hoist-slider" type="range" min={0} max={100} step={.5} value={state.targetHoistHeight * 100} onChange={event => state.setHoistHeight(Number(event.target.value) / 100)} />
        <span className="buoyancy-hoist-scale"><span>Không khí</span><span>Chạm nước 30%</span><span>Chìm 75%</span></span>
      </label>
      <p className="buoyancy-drag-hint">Kéo lực kế, tay kẹp hoặc mẫu vật lên xuống ngay trên bàn.</p>
      <label>Mẫu vật <select aria-label="Mẫu vật" value={state.specimenId} onChange={(event) => state.selectSpecimen(event.target.value)}>{samples.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <button type="button" className="secondary" onClick={() => state.setStep("air")}>Đo P₀ ngoài không khí</button>
      <button type="button" className="secondary" onClick={() => state.setStep("partial")}>Nhúng vào bình tràn</button>
      <button type="button" className="secondary" onClick={() => state.setStep("full")}>Nhúng chìm hoàn toàn</button>
      <button type="button" className="secondary buoyancy-record" onClick={state.recordReading}>Ghi số liệu vào bảng ({state.records.length})</button>
      {!state.config.specimens.some(item => item.id === state.specimenId) && <p className="buoyancy-drag-hint">Mẫu khám phá · dùng Sắt hoặc Sỏi để nộp bài. Với gỗ, dây chùng khi lực đẩy lớn hơn trọng lượng.</p>}
    </>}
  />;
}
