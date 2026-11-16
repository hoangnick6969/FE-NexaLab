/**
 * `/labs/:id` page of kit `k8-diorama`. FL-21 removes a species from the food web, FL-20 sets the water temperature
 * of the pond. Both reuse the Guided K8 scenes: the 3D meadow / pond dioramas (`FoodWebView3D`, `PondView3D`, full
 * bleed behind the panels) and their 2D boards (`FoodWebScene`, `PondScene`, `ToleranceGraph`) as the 2D view and the
 * no-WebGL fallback. Every value drawn comes from the released models through `explore-kits`. Explore only.
 */
import { useMemo, useState } from "react";
import { FOOD_WEB_EDGES, FOOD_WEB_SPECIES } from "@nexalab/sim";
import type { DioramaExploreConfig } from "@nexalab/sim/explore-kits";
import { fl20ToleranceResult, fl21RemovalResult } from "@nexalab/sim/explore-kits";
import type { ExplorePageProps } from "../../runtime/explore-registry";
import { LabHeaderSlot } from "../../shared/LabSpace";
import { LabRendererToggle } from "../../shared/LabRendererToggle";
import { ExploreBenchShell, canUseWebgl } from "../../shared/explore/ExploreBenchShell";
import { FoodWebScene } from "./food-web/FoodWebScene";
import { FoodWebView3D } from "./food-web/FoodWebView3D";
import { boardFocus, type Effect, type Role, type SpeciesId } from "./food-web/fw-evidence";
import { PondScene } from "./tolerance/PondScene";
import { PondView3D, vigorAt } from "./tolerance/PondView3D";
import { ToleranceGraph } from "./tolerance/ToleranceGraph";
import { dioramaBench, foodWebSummary, toleranceSummary } from "./diorama-bench";
import "./food-web/FoodWebActivity.css";
import "./tolerance/EcologyToleranceActivity.css";
import "./diorama-explore.css";

const SPECIES_LABEL: Record<SpeciesId, string> = { co: "Cỏ", "cay-xanh": "Cây xanh", "chau-chau": "Châu chấu", sau: "Sâu", tho: "Thỏ", ech: "Ếch", "chim-sau": "Chim sâu", ran: "Rắn", cao: "Cáo", "dai-bang": "Đại bàng", "nam-vi-khuan": "Nấm, vi khuẩn" };
const label = (id: string) => (SPECIES_LABEL as Record<string, string>)[id] ?? (id === "ca-ro-phi" ? "Cá rô phi" : id);
const ROLE_NAMES: Record<Role, string> = { PRODUCER: "Sinh vật sản xuất", CONSUMER: "Sinh vật tiêu thụ", DECOMPOSER: "Sinh vật phân giải" };
const EFFECT_NAMES: Record<Effect, string> = { INCREASE: "tăng", DECREASE: "giảm", NO_DIRECT_EFFECT: "không đổi trực tiếp" };
const ROLES = Object.fromEntries(Object.entries(FOOD_WEB_SPECIES).map(([id, item]) => [id, item.role])) as Record<SpeciesId, Role>;

/** 3D where the browser can draw it, 2D otherwise; the toggle sits in the Lab Space header. */
function useBenchView() {
  const [can3d] = useState(canUseWebgl);
  const [view, setView] = useState<"3d" | "2d">(can3d ? "3d" : "2d");
  const toggle = can3d ? <LabHeaderSlot><LabRendererToggle mode={view} onChange={setView} /></LabHeaderSlot> : null;
  return { view: can3d ? view : "2d" as const, toggle };
}

function relationText(id: SpeciesId) {
  const eats = FOOD_WEB_EDGES.filter(([, eater]) => eater === id).map(([food]) => label(food));
  const eatenBy = FOOD_WEB_EDGES.filter(([food]) => food === id).map(([, eater]) => label(eater));
  return `${label(id)} (${ROLE_NAMES[ROLES[id]].toLowerCase()}): ăn ${eats.length ? eats.join(", ") : "không loài nào trong lưới"}; bị ăn bởi ${eatenBy.length ? eatenBy.join(", ") : "không loài nào"}.`;
}

function FoodWebBench({ labId, title, config, activityId }: { labId: string; title: string; config: Extract<DioramaExploreConfig, { catalogId: "FL-21" }>; activityId: string }) {
  const allowed = config.spec.allowedRemovals as SpeciesId[];
  const [removed, setRemoved] = useState<SpeciesId | null>(null);
  const [inspected, setInspected] = useState<SpeciesId | null>(null);
  const { view, toggle } = useBenchView();
  const result = removed ? fl21RemovalResult(removed) : null;
  const changes = result?.setup === "remove" ? Object.entries(result.effects).filter(([, effect]) => effect.effect !== "NO_DIRECT_EFFECT") : [];
  const effects = useMemo(() => (result?.setup === "remove"
    ? Object.fromEntries(Object.entries(result.effects).map(([id, effect]) => [id, effect.effect])) as Partial<Record<SpeciesId, Effect>>
    : null), [removed]);
  const pick = (id: SpeciesId) => setRemoved((current) => (current === id ? null : id));
  const board = {
    names: SPECIES_LABEL, roleNames: ROLE_NAMES, effectNames: EFFECT_NAMES, removedLabel: "đã bỏ khỏi lưới",
    removed, effects, roles: ROLES, pickable: (id: SpeciesId) => allowed.includes(id), onPick: pick,
    focus: boardFocus(inspected, []), onInspect: setInspected,
    label: `Lưới thức ăn đồng cỏ${removed ? `, đã bỏ ${label(removed)}` : ""}. Bấm một loài để bỏ khỏi lưới.`,
    illustrative: "Sơ đồ minh hoạ: mũi tên đi từ thức ăn tới loài ăn nó. Nấm, vi khuẩn phân giải xác của mọi loài.",
  };
  const relation = <p className="diorama-relation" aria-live="polite" data-testid="fw-explore-relation">
    {inspected ? relationText(inspected) : removed ? `Đã bỏ ${label(removed)}: viền xanh là loài tăng, viền đỏ là loài giảm.` : "Di chuột hoặc chọn một loài để xem nó ăn gì và bị loài nào ăn."}
  </p>;
  const legend = <ul className="diorama-legend" aria-label="Chú giải">
    <li data-tone="increase">Tăng</li><li data-tone="decrease">Giảm</li><li data-tone="removed">Đã bỏ</li>
  </ul>;

  const scene = view === "3d"
    ? <>
        {toggle}
        <FoodWebView3D {...board} layoutKey={`explore-${removed ?? "none"}`} />
        <div className="explore-overlay" data-testid="diorama-page">
          <h2>Đồng cỏ k8-diorama · lưới thức ăn</h2>
          {relation}{legend}
        </div>
      </>
    : <div className="diorama-2d" data-testid="diorama-page">
        {toggle}
        <header className="explore-scene-head">
          <div><span className="explore-scene-eyebrow">Đồng cỏ · k8-diorama</span><h2>Lưới thức ăn{removed ? ` khi bỏ ${label(removed)}` : ""}</h2></div>
          {legend}
        </header>
        <div className="diorama-fw-board"><FoodWebScene {...board} /></div>
        {relation}
      </div>;

  const controls = <>
    <fieldset className="explore-chips" data-testid="food-web-panel">
      <legend>Bỏ một loài khỏi lưới thức ăn</legend>
      {allowed.map((id) => <button type="button" key={id} className="explore-chip" aria-pressed={removed === id} onClick={() => pick(id)}>{label(id)}</button>)}
    </fieldset>
    <button type="button" className="explore-btn explore-btn-secondary" disabled={!removed} onClick={() => setRemoved(null)}>Khôi phục lưới đầy đủ</button>
  </>;
  const readout = result?.setup === "remove"
    ? <>
        <span className="explore-status" data-tone="info">Đã bỏ {label(removed!)}</span>
        <ul data-testid="food-web-effects">
          {changes.map(([id, effect]) => <li key={id}><b>{label(id)}</b>: {effect.effect === "INCREASE" ? "tăng" : "giảm"}{effect.onlyFood ? " (mất nguồn thức ăn duy nhất)" : ""}</li>)}
          <li>Chuỗi thức ăn bị đứt: <b>{result.brokenChains}</b></li>
        </ul>
      </>
    : <p className="explore-field-hint">Chọn một loài để xem những loài nào tăng, giảm và bao nhiêu chuỗi thức ăn bị đứt.</p>;

  return <ExploreBenchShell labId={labId} activityId={activityId} title={title} config={config} kitItems={dioramaBench.listKitItems(config)}
    scene={scene} controls={controls} readout={readout} sceneKind={view === "3d" ? "full" : "card"} testId="diorama-bench"
    journalSummary={removed ? foodWebSummary(removed) : ""} canSave={removed !== null} saveHint="Bỏ một loài khỏi lưới để có trạng thái cần ghi." />;
}

function ToleranceBench({ labId, title, config, activityId }: { labId: string; title: string; config: Extract<DioramaExploreConfig, { catalogId: "FL-20" }>; activityId: string }) {
  const speciesId = config.spec.allowedSpecies[0];
  const [value, setValue] = useState(250);
  const [showLimits, setShowLimits] = useState(false);
  const { view, toggle } = useBenchView();
  const raw = fl20ToleranceResult(speciesId, value);
  if (raw.setup !== "tolerance") throw new Error("FL-20: mô hình không trả về kết quả giới hạn chịu đựng");
  const result = raw;
  const fish = result.canPersist ? "persists" as const : "gone" as const;
  const zoneText = result.zone === "WITHIN" ? "trong vùng sống" : result.zone === "BELOW_MIN" ? "dưới giới hạn dưới" : "trên giới hạn trên";
  const valueLabel = `${(value / 10).toFixed(1).replace(".", ",")} °C`;
  const pondLabel = `Ao nuôi ${label(speciesId)} ở ${valueLabel}: ${result.canPersist ? "cá vẫn sống được" : "cá không tồn tại được"}.`;
  const graph = <ToleranceGraph limits={result.limits} valueDeciC={value} showLimits={showLimits}
    labels={{ title: `Giới hạn chịu đựng nhiệt độ của ${label(speciesId)}`, curve: "Mức sống", lower: "Giới hạn dưới", upper: "Giới hạn trên", illustrative: "Đường cong minh hoạ hình dạng, không phải số liệu đo." }} />;

  const scene = view === "3d"
    ? <>
        {toggle}
        <PondView3D valueDeciC={value} fish={fish} vigor={vigorAt(value, result)} label={pondLabel} valueLabel={valueLabel} layoutKey="explore-pond" />
        <div className="explore-overlay diorama-graph-card" data-testid="diorama-page">
          <h2>Ao thí nghiệm · {label(speciesId)} ở {valueLabel}</h2>
          {graph}
        </div>
      </>
    : <div className="diorama-2d" data-testid="diorama-page">
        {toggle}
        <header className="explore-scene-head">
          <div><span className="explore-scene-eyebrow">Ao thí nghiệm · k8-diorama</span><h2>{label(speciesId)} ở {valueLabel}</h2></div>
          <span className="explore-status" data-tone={result.canPersist ? "ok" : "warn"}>{zoneText}</span>
        </header>
        <div className="diorama-pond"><PondScene valueDeciC={value} fish={fish} label={pondLabel} /></div>
        {graph}
      </div>;

  const controls = <div className="explore-controls" data-testid="tolerance-panel">
    <label className="explore-field">
      <span className="explore-field-row"><span>Nhiệt độ nước</span><span className="explore-field-value" data-testid="tolerance-value">{valueLabel}</span></span>
      <input className="explore-range" type="range" min={0} max={500} step={10} value={value} onChange={(event) => setValue(Number(event.target.value))} aria-valuetext={valueLabel} />
      <span className="explore-range-scale" aria-hidden="true"><span>0 °C</span><span>25 °C</span><span>50 °C</span></span>
    </label>
    <label className="explore-check">
      <input type="checkbox" checked={showLimits} onChange={(event) => setShowLimits(event.target.checked)} />
      <span>Hiện giới hạn chịu đựng trên đồ thị</span>
    </label>
  </div>;
  const readout = <>
    <span className="explore-status" data-tone={result.canPersist ? "ok" : "warn"} data-testid="tolerance-zone">{label(speciesId)} {zoneText}</span>
    <p className="explore-field-hint">{result.canPersist ? "Cá rô phi sống và bơi được ở nhiệt độ này." : "Ở nhiệt độ này cá rô phi không tồn tại được."}</p>
    {showLimits && <dl>
      <dt>Giới hạn dưới</dt><dd>{(result.limits.minDeciC / 10).toFixed(1).replace(".", ",")} °C</dd>
      <dt>Giới hạn trên</dt><dd>{(result.limits.maxDeciC / 10).toFixed(1).replace(".", ",")} °C</dd>
    </dl>}
  </>;

  return <ExploreBenchShell labId={labId} activityId={activityId} title={title} config={config} kitItems={dioramaBench.listKitItems(config)}
    scene={scene} controls={controls} readout={readout} sceneKind={view === "3d" ? "full" : "card"} testId="diorama-bench"
    journalSummary={toleranceSummary(speciesId, value)} canSave />;
}

export default function DioramaExplorePage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as DioramaExploreConfig;
  return config.catalogId === "FL-21"
    ? <FoodWebBench labId={labId} title={title || config.title} config={config} activityId={activity.id} />
    : <ToleranceBench labId={labId} title={title || config.title} config={config} activityId={activity.id} />;
}
