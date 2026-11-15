/**
 * Accessible DOM mirror of the bench: every 3D action is reachable here with click-click or keyboard.
 * Buttons dispatch the same reducer actions as the 3D scene.
 */
import { useState, type Dispatch } from "react";
import { measure, observeVessel, reagentById, type ChemistryLabConfig } from "@nexalab/sim/wet-bench";
import { K2_APPARATUS, isVesselKind } from "./apparatus-manifest";
import { slotById } from "./bench-layout";
import { apparatusLabel, DROPPER_CAPACITY_MICROLITERS, POWDER_MAX_MILLIGRAMS, scaleDisplayMicrograms, validTargets, volumeLabel, type BenchAction, type BenchUiState, type Held } from "./bench-reducer";
import { formatGrams, formatMilligrams, formatMolar, formatPercent, formatPh, formatQuantity, PIECE_NAME, reagentLabel } from "./observation-log";
import { shortReagent } from "./WetBenchKitStage";

const BAND = { colourless: "không màu", light_pink: "hồng nhạt", deep_pink: "hồng đậm", unknown: "chưa xác định" } as const;
const same = (a: Held | null, b: Held) => !!a && JSON.stringify(a) === JSON.stringify(b);

const mlText = (microliters: number) => (microliters / 1000).toFixed(2).replace(".", ",");

const usesSolutions = (config: ChemistryLabConfig) => (config.solutes?.length ?? 0) > 0;

export function heldLabel(config: ChemistryLabConfig, held: Held, loadedMicroliters = 0) {
  if (held.kind === "reagent") {
    const reagent = reagentById(held.reagentId);
    if (reagent?.dispenser === "tongs") return `Kẹp gắp · ${reagentLabel(held.reagentId)}`;
    if (reagent?.dispenser === "spatula") return `Thìa · ${reagentLabel(held.reagentId)}`;
    return `Ống nhỏ giọt · ${reagentLabel(held.reagentId).replace(/^Dung dịch /, "")} · ${mlText(loadedMicroliters)} / ${mlText(DROPPER_CAPACITY_MICROLITERS)} mL`;
  }
  if (held.kind === "tool") return apparatusLabel(config, held.apparatusId);
  return apparatusLabel(config, held.vesselId);
}

function instruction(state: BenchUiState) {
  const held = state.held;
  if (!held) return "Chọn một lọ hoá chất, dụng cụ hoặc vật chứa (hoặc kéo thả trực tiếp trên bàn 3D).";
  if (held.kind === "reagent" && reagentById(held.reagentId)?.dispenser === "spatula") return "Nhập khối lượng cần lấy, rồi chọn vật chứa (cốc, ống đong hoặc bình) để cho bột vào. Cân trước để biết khối lượng.";
  if (held.kind === "reagent") return "Chọn ống nghiệm hoặc cốc để thêm. Ống nhỏ giọt vẫn cầm trên tay để nhỏ tiếp; chọn lọ khác để đổi chất; Esc để bỏ.";
  if (held.kind === "tool" && held.tool === "dropper") return "Chọn một lọ dung dịch để hút vào ống nhỏ giọt.";
  if (held.kind === "tool" && held.tool === "tongs") return "Chọn một lọ chất rắn để gắp.";
  if (held.kind === "tool" && held.tool === "spatula") return "Chọn một lọ chất bột để lấy bằng thìa.";
  if (held.kind === "tool" && held.tool === "glass_rod") return "Chọn vật chứa để khuấy bằng đũa thuỷ tinh.";
  if (held.kind === "tool") return held.tool === "stopper" ? "Chọn bình tam giác để đậy hoặc mở nút." : held.tool === "ph_meter" ? "Chọn vật chứa để cắm bút đo pH." : "Chọn vật chứa để nhúng giấy quỳ.";
  return "Chọn vật chứa khác để đổ vào, cốc thải để đổ bỏ, hoặc một vị trí trống để đặt.";
}

export function BenchHud({ state, dispatch }: { state: BenchUiState; dispatch: Dispatch<BenchAction> }) {
  const { config, held } = state;
  const now = () => Date.now();
  const targets = validTargets(state, held);
  const isTarget = (vesselId: string) => targets.some((target) => target.kind === "vessel" && target.vesselId === vesselId);
  const heldReagent = held?.kind === "reagent" ? reagentById(held.reagentId) : null;
  const showPresets = heldReagent && heldReagent.composition.kind !== "solid" && heldReagent.composition.kind !== "powder";
  const showPowder = heldReagent?.composition.kind === "powder";
  const presets = heldReagent?.composition.kind === "indicator" ? config.dispensing.liquidPresetsMicroliters.filter((value) => value <= 250) : config.dispensing.liquidPresetsMicroliters;
  const tools = config.enabledApparatus.filter((item) => K2_APPARATUS[item.kind].tool);
  const vessels = config.enabledApparatus.filter((item) => isVesselKind(item.kind));
  const slotTargets = targets.filter((target) => target.kind === "slot");

  return <section className="k2-hud" aria-label="Điều khiển bàn thí nghiệm">
    <div className="k2-hud-status">
      {held ? <div className="k2-held" role="status">
        <span className="k2-held-dot" aria-hidden="true" />
        <span>Đang cầm: <b>{heldLabel(config, held, state.loadedMicroliters)}</b></span>
        {showPresets && <div className="k2-presets" role="radiogroup" aria-label="Lượng mỗi lần nhỏ">
          {(presets.length ? presets : [config.dispensing.liquidPresetsMicroliters[0]]).map((value) => <button key={value} type="button" role="radio" aria-checked={state.presetMicroliters === value} className={state.presetMicroliters === value ? "is-on" : ""} onClick={() => dispatch({ type: "preset", microliters: value })}>{formatQuantity(value, usesSolutions(config))}</button>)}
        </div>}
        {showPowder && <div className="k2-powder" role="group" aria-label="Khối lượng mỗi lần lấy">
          <label>Khối lượng (mg) <input type="number" min={1} max={POWDER_MAX_MILLIGRAMS} step={1} inputMode="numeric" value={state.powderMilligrams} onChange={(event) => dispatch({ type: "set_powder", milligrams: Number(event.target.value) })} /></label>
          <span className="k2-small">= {formatMilligrams(state.powderMilligrams)}</span>
          {[100, 500, 1000].map((step) => <button key={step} type="button" className="k2-chip" onClick={() => dispatch({ type: "set_powder", milligrams: state.powderMilligrams + step })}>+{formatMilligrams(step).replace(" g", "")} g</button>)}
        </div>}
        <button type="button" className="text-button" onClick={() => dispatch({ type: "release" })}>Đặt về chỗ cũ</button>
      </div> : <p className="k2-hint">{instruction(state)}</p>}
      {held && <p className="k2-hint">{instruction(state)} <b>Nhấn chuột phải hoặc Esc để đặt về chỗ cũ.</b></p>}
      {state.notice && <p className="k2-notice" role="alert">{state.notice.textVi}</p>}
      {state.banner && <div className="k2-scope-banner" role="alert">
        <p><b>Ngoài phạm vi mô hình.</b> {state.banner.textVi}</p>
        {state.banner.reasonVi && <p className="k2-small">{state.banner.reasonVi}</p>}
        <div className="k2-row">
          <button type="button" className="secondary" onClick={() => dispatch({ type: "undo", now: now() })}>Hoàn tác</button>
          <button type="button" className="secondary" onClick={() => dispatch({ type: "empty", vesselId: state.banner!.vesselId, now: now() })}>Đổ {apparatusLabel(config, state.banner.vesselId).toLowerCase()} vào cốc thải</button>
          <button type="button" className="text-button" onClick={() => dispatch({ type: "dismiss_banner" })}>Đóng</button>
        </div>
      </div>}
    </div>

    <div className="k2-hud-groups">
      <div className="k2-group" role="group" aria-label="Kệ hoá chất">
        <h3>Kệ hoá chất</h3>
        <div className="k2-chips">{[...config.availableReagents].sort((a, b) => a.shelfPosition - b.shelfPosition).map((bottle) => {
          const reagent = reagentById(bottle.reagentId);
          if (!reagent) return null;
          const item: Held = { kind: "reagent", reagentId: reagent.id };
          return <button key={reagent.id} type="button" aria-pressed={same(held, item)} className={`k2-chip${same(held, item) ? " is-held" : ""}`} title={reagent.labelVi} onClick={() => dispatch({ type: "click_bottle", reagentId: reagent.id, now: now() })}>
            <i style={{ background: reagent.bottleColor }} aria-hidden="true" />{shortReagent(reagent.id)}{reagent.hazard.level === "warning" || reagent.hazard.level === "danger" ? <em aria-label="hoá chất nguy hiểm khi làm thật">!</em> : null}
          </button>;
        })}</div>
      </div>
      {tools.length > 0 && <div className="k2-group" role="group" aria-label="Dụng cụ">
        <h3>Dụng cụ</h3>
        <div className="k2-chips">{tools.map((item) => {
          const tool: Held = { kind: "tool", tool: K2_APPARATUS[item.kind].tool!, apparatusId: item.id };
          return <button key={item.id} type="button" aria-pressed={same(held, tool)} className={`k2-chip${same(held, tool) ? " is-held" : ""}`} onClick={() => dispatch({ type: "hold", held: same(held, tool) ? null : tool })}>{apparatusLabel(config, item.id)}</button>;
        })}
        {state.current.probeIn && <button type="button" className="k2-chip" onClick={() => dispatch({ type: "remove_probe", now: now() })}>Rút bút đo pH</button>}</div>
      </div>}
      {usesSolutions(config) && config.enabledApparatus.some((item) => item.kind === "electronic_scale") && <div className="k2-group" role="group" aria-label="Cân điện tử">
        <h3>Cân điện tử</h3>
        <div className="k2-chips">
          <span className="k2-lcd" aria-live="polite" data-testid="scale-reading">{formatGrams(scaleDisplayMicrograms(state))}</span>
          <button type="button" className="k2-chip" onClick={() => dispatch({ type: "tare", now: now() })}>Về 0</button>
        </div>
      </div>}
      {(config.targets?.length ?? 0) > 0 && <ConclusionPanel state={state} dispatch={dispatch} />}
      <div className="k2-group" role="group" aria-label="Vật chứa">
        <h3>Vật chứa {held ? "· chọn đích" : ""}</h3>
        <div className="k2-chips">{vessels.map((item) => {
          const vessel = state.current.bench.vessels[item.id];
          const visual = observeVessel(vessel).visual;
          const status = item.kind === "waste_beaker" ? "" : vessel.solutionMicroliters ? `${volumeLabel(config, vessel)}${visual.indicator ? ` · ${BAND[visual.indicator.band]}` : ""}` : vessel.solids.length ? "chất rắn" : "trống";
          const heldVessel = same(held, { kind: "vessel", vesselId: item.id });
          return <button key={item.id} type="button" aria-pressed={heldVessel} aria-label={`${apparatusLabel(config, item.id)}${status ? `, ${status}` : ""}${held && isTarget(item.id) ? ", chọn làm đích" : ""}`}
            className={`k2-chip k2-vessel-chip${heldVessel ? " is-held" : ""}${held && isTarget(item.id) ? " is-target" : ""}${state.banner?.vesselId === item.id ? " is-warning" : ""}`}
            onClick={() => dispatch({ type: "click_vessel", vesselId: item.id, now: now() })}>
            <b>{apparatusLabel(config, item.id)}</b>{status && <small>{status}</small>}
          </button>;
        })}</div>
      </div>
      {slotTargets.length > 0 && <div className="k2-group" role="group" aria-label="Vị trí trống">
        <h3>Đặt vào vị trí</h3>
        <div className="k2-chips">{slotTargets.map((target) => target.kind === "slot" && <button key={target.slotId} type="button" className="k2-chip is-target" onClick={() => dispatch({ type: "click_slot", slotId: target.slotId, now: now() })}>{slotById(target.slotId)?.labelVi}</button>)}</div>
      </div>}
    </div>
    <VesselInspector state={state} dispatch={dispatch} />
  </section>;
}

/** "Kết luận": the real concentration of a prepared solution, shown only when the learner asks for it. */
function ConclusionPanel({ state, dispatch }: { state: BenchUiState; dispatch: Dispatch<BenchAction> }) {
  const { config } = state;
  const candidates = config.enabledApparatus.filter((item) => isVesselKind(item.kind) && item.kind !== "waste_beaker" && item.kind !== "graduated_cylinder_100ml");
  return <div className="k2-group k2-targets" role="group" aria-label="Mục tiêu pha dung dịch">
    <h3>Mục tiêu pha dung dịch</h3>
    {(config.targets ?? []).map((target) => <TargetCard key={target.id} state={state} dispatch={dispatch} target={target} candidates={candidates.map((item) => item.id)} />)}
  </div>;
}

function TargetCard({ state, dispatch, target, candidates }: { state: BenchUiState; dispatch: Dispatch<BenchAction>; target: NonNullable<BenchUiState["config"]["targets"]>[number]; candidates: string[] }) {
  const [vesselId, setVesselId] = useState(candidates[0] ?? "");
  const conclusion = state.conclusions[target.id];
  const goal = target.kind === "molarity"
    ? `${target.volumeMicroliters / 1000} mL, ${formatMolar(target.millimolar)} ± ${formatMolar(target.toleranceMillimolar)}`
    : `${target.solutionMilligrams / 1000} g, ${formatPercent(target.tenthsPercent)} ± ${formatPercent(target.toleranceTenthsPercent)}`;
  return <div className="k2-target" data-testid={`target-${target.id}`}>
    <p><b>{target.titleVi}</b><br /><span className="k2-small">Yêu cầu: {goal}</span></p>
    <div className="k2-row">
      <label>Dung dịch ở <select value={vesselId} onChange={(event) => setVesselId(event.target.value)}>
        {candidates.map((id) => <option key={id} value={id}>{apparatusLabel(state.config, id)}</option>)}
      </select></label>
      <button type="button" className="secondary" disabled={!vesselId} onClick={() => dispatch({ type: "conclude", targetId: target.id, vesselId, now: Date.now() })}>Kết luận</button>
    </div>
    {conclusion && <p role="status" className={conclusion.result.withinTarget ? "k2-target-ok" : "k2-target-off"} data-testid={`conclusion-${target.id}`}>
      {apparatusLabel(state.config, conclusion.vesselId)}: nồng độ phần trăm <b>{formatPercent(conclusion.result.tenthsPercent)}</b>, nồng độ mol <b>{formatMolar(conclusion.result.millimolar)}</b>.{" "}
      {conclusion.result.withinTarget ? "Nằm trong dung sai của mục tiêu." : "Nằm ngoài dung sai của mục tiêu: thử lại hoặc đổ bỏ và pha lại."}
    </p>}
  </div>;
}

function VesselInspector({ state, dispatch }: { state: BenchUiState; dispatch: Dispatch<BenchAction> }) {
  const vesselId = state.focusVesselId;
  const vessel = vesselId ? state.current.bench.vessels[vesselId] : null;
  if (!vessel || vessel.kind === "waste_beaker") return null;
  const visual = observeVessel(vessel).visual;
  const added = Object.entries(vessel.added);
  const probe = state.current.probeIn === vessel.vesselId ? measure(vessel, "ph_meter") : null;
  const strip = state.current.strips[vessel.vesselId];
  const slot = slotById(state.current.positions[vessel.vesselId] ?? "");
  return <aside className="k2-inspector" aria-label={`Thông tin ${apparatusLabel(state.config, vessel.vesselId)}`}>
    <h3>{apparatusLabel(state.config, vessel.vesselId)}</h3>
    {added.length ? <ul>{added.map(([reagentId, amount]) => {
      const composition = reagentById(reagentId)?.composition;
      const quantity = amount.micrograms ? formatMilligrams(amount.micrograms / 1000) : amount.microliters ? formatQuantity(amount.microliters, usesSolutions(state.config)) : amount.drops ? `${amount.drops} giọt` : `${amount.pieces} ${composition?.kind === "solid" ? PIECE_NAME[composition.shape] : "mẩu"}`;
      return <li key={reagentId}>{quantity} · {reagentLabel(reagentId)}</li>;
    })}</ul> : <p className="k2-small">Đang trống.</p>}
    <dl>
      {vessel.solutionMicroliters > 0 && <><dt>Thể tích</dt><dd>{volumeLabel(state.config, vessel)}</dd></>}
      {Object.values(vessel.powders).some((amount) => (amount ?? 0) > 0) && <><dt>Chất rắn</dt><dd>chưa tan hết</dd></>}
      {visual.indicator && <><dt>Phenolphthalein</dt><dd>{BAND[visual.indicator.band]}</dd></>}
      {strip && <><dt>Giấy quỳ</dt><dd>{strip === "red" ? "đỏ" : strip === "blue" ? "xanh" : "tím"}</dd></>}
      {probe && <><dt>Bút đo pH</dt><dd className="k2-mono">{probe.ok && probe.kind === "ph_meter" ? `pH ${formatPh(probe.tenthsPh)}` : probe.ok ? "—" : probe.code === "NO_SOLUTION" ? "chưa có dung dịch" : "ngoài phạm vi mô hình"}</dd></>}
      {visual.precipitate && <><dt>Kết tủa</dt><dd>có</dd></>}
      {visual.stoppered && <><dt>Nút</dt><dd>đã đậy</dd></>}
      {slot?.kind === "scale" && <><dt>Vị trí</dt><dd>trên đĩa cân</dd></>}
    </dl>
    {vessel.kind === "volumetric_flask_100ml" && vessel.solutionMicroliters < vessel.capacityMicroliters && <button type="button" className="secondary" onClick={() => dispatch({ type: "fill_mark", vesselId: vessel.vesselId, now: Date.now() })}>Thêm nước đến vạch</button>}
    {(added.length > 0 || vessel.solids.length > 0) && <button type="button" className="secondary" onClick={() => dispatch({ type: "empty", vesselId: vessel.vesselId, now: Date.now() })}>Đổ vào cốc thải</button>}
  </aside>;
}
