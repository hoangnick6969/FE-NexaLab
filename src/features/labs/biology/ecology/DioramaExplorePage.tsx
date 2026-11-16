/**
 * `/labs/:id` page of kit `k8-diorama`. FL-21 removes a species from the food web, FL-20 sets the water temperature
 * of the pond. Both reuse the Guided K8 scenes: the 3D meadow / pond dioramas (`FoodWebView3D`, `PondView3D`, full
 * bleed behind the panels) and their 2D boards (`FoodWebScene`, `PondScene`, `ToleranceGraph`) as the 2D view and the
 * no-WebGL fallback. Every value drawn comes from the released models through `explore-kits`. Explore only.
 *
 * What the Explore mode adds over the Guided Labs (stories K8-FL20 / K8-FL21 of the Explore backlog), unscored:
 * - FL-21: remove any allowed species directly or through a human activity of the model's cause table; build any
 *   chain on the board (checked pair by pair by `food-web@1.0.0`) and see the energy at each level of that chain.
 * - FL-20: record your own temperature readings in a data table and bracket the limits before revealing them; compare
 *   which of the illustrative fish A, B, C can live at an import site (`import-comparison` of `ecology-tolerance`).
 */
import { useMemo, useState, type ReactNode } from "react";
import { FOOD_WEB_CAUSES, FOOD_WEB_EDGES, FOOD_WEB_PRODUCER_KJ, FOOD_WEB_SPECIES, FOOD_WEB_TRANSFER, foodWeb, foodWebChains } from "@nexalab/sim/food-web";
import { ECOLOGY_SITES, ecologyTolerance } from "@nexalab/sim/ecology-tolerance";
import type { DioramaExploreConfig } from "@nexalab/sim/explore-kits";
import { fl20ToleranceResult, fl21RemovalResult } from "@nexalab/sim/explore-kits";
import type { ExplorePageProps } from "../../runtime/explore-registry";
import { LabHeaderSlot } from "../../shared/LabSpace";
import { LabRendererToggle } from "../../shared/LabRendererToggle";
import { ExploreBenchShell, canUseWebgl } from "../../shared/explore/ExploreBenchShell";
import { ExploreStations, type ExploreStation } from "../../shared/explore/ExploreStations";
import { FoodWebScene } from "./food-web/FoodWebScene";
import { FoodWebView3D } from "./food-web/FoodWebView3D";
import { useLinkDrag } from "./food-web/use-link-drag";
import { boardFocus, type Effect, type Role, type SpeciesId } from "./food-web/fw-evidence";
import { PondScene } from "./tolerance/PondScene";
import { PondView3D, vigorAt } from "./tolerance/PondView3D";
import { ToleranceGraph, type LimitGuess } from "./tolerance/ToleranceGraph";
import { svgDrag } from "../../shared/explore/svg-drag";
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

type FwStationId = "remove" | "chain";
const FW_STATIONS: ReadonlyArray<ExploreStation<FwStationId>> = [
  { id: "remove", label: "Bỏ một loài", hint: "Bỏ một loài khỏi lưới, trực tiếp hoặc qua một hoạt động của con người, rồi xem loài nào tăng, loài nào giảm." },
  { id: "chain", label: "Dựng chuỗi & năng lượng", hint: "Bấm lần lượt các loài trên sơ đồ để dựng chuỗi thức ăn của riêng em. Mô hình kiểm từng cặp liền kề và tính năng lượng ở mỗi bậc." },
];
const CAUSE_LABEL: Record<keyof typeof FOOD_WEB_CAUSES, string> = {
  "pha-rung": "Phá rừng", "san-bat": "Săn bắt rắn", "khai-thac": "Khai thác quá mức (bắt thỏ)", "o-nhiem": "Ô nhiễm nguồn nước (ếch chết)", "trong-rung": "Trồng rừng", "bao-ton": "Lập khu bảo tồn",
};
const MAX_CHAIN = 6;
const kj = (value: number) => `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} kJ`;

/** Energy at each level of a valid chain: the producer captures the model's 10 000 kJ, each step keeps 1/10 (illustrative). */
function chainEnergy(chain: readonly SpeciesId[]) {
  const levels = [FOOD_WEB_PRODUCER_KJ];
  for (let i = 1; i < chain.length; i++) levels.push(levels[i - 1] * FOOD_WEB_TRANSFER.num / FOOD_WEB_TRANSFER.den);
  return levels;
}

function EnergyPyramid({ chain }: { chain: readonly SpeciesId[] }) {
  const levels = chainEnergy(chain);
  const top = Math.log10(FOOD_WEB_PRODUCER_KJ) + 1;
  return <figure className="fw-energy" data-testid="fw-energy">
    <ol>
      {chain.map((id, index) => ({ id, index })).reverse().map(({ id, index }) => {
        const width = Math.max(14, ((Math.log10(levels[index]) + 1) / top) * 74);
        return <li key={id}><span className="fw-energy-bar" style={{ width: `${width}%` }}><b>Bậc {index + 1}</b> {label(id)}</span><span className="explore-mono">{kj(levels[index])}</span></li>;
      })}
    </ol>
    <figcaption>Quy ước minh hoạ: mỗi bậc giữ lại 1/10 năng lượng của bậc trước, phần còn lại mất đi dưới dạng nhiệt. Thanh vẽ theo thang log.</figcaption>
  </figure>;
}

function FoodWebBench({ labId, title, config, activityId }: { labId: string; title: string; config: Extract<DioramaExploreConfig, { catalogId: "FL-21" }>; activityId: string }) {
  const allowed = config.spec.allowedRemovals as SpeciesId[];
  const [station, setStation] = useState<FwStationId>("remove");
  const [removed, setRemoved] = useState<SpeciesId | null>(null);
  const [cause, setCause] = useState<keyof typeof FOOD_WEB_CAUSES | null>(null);
  const [chain, setChain] = useState<SpeciesId[]>([]);
  const [inspected, setInspected] = useState<SpeciesId | null>(null);
  const { view, toggle } = useBenchView();
  const removing = station === "remove";
  const result = removing && removed ? fl21RemovalResult(removed) : null;
  const changes = result?.setup === "remove" ? Object.entries(result.effects).filter(([, effect]) => effect.effect !== "NO_DIRECT_EFFECT") : [];
  const effects = useMemo(() => (result?.setup === "remove"
    ? Object.fromEntries(Object.entries(result.effects).map(([id, effect]) => [id, effect.effect])) as Partial<Record<SpeciesId, Effect>>
    : null), [removed, removing]);
  const chainResult = chain.length >= 2 ? foodWeb({ setup: "chain", webId: "W1", nodes: chain }) : null;
  const checked = chainResult?.setup === "chain" ? chainResult : null;
  const fullChain = Boolean(checked && checked.valid && checked.startsWithProducer);
  // Activities of the model's cause table whose species this Lab lets the student remove, plus the protective ones.
  const causes = (Object.keys(FOOD_WEB_CAUSES) as Array<keyof typeof FOOD_WEB_CAUSES>).filter((id) => {
    const removes = FOOD_WEB_CAUSES[id].removes;
    return removes === null || allowed.includes(removes as SpeciesId);
  });
  const allChains = useMemo(() => foodWebChains(), []);

  const pickRemove = (id: SpeciesId) => { setCause(null); setRemoved((current) => (current === id ? null : id)); };
  const pickCause = (id: keyof typeof FOOD_WEB_CAUSES) => { setCause(id); setRemoved(FOOD_WEB_CAUSES[id].removes as SpeciesId | null); };
  const pickChain = (id: SpeciesId) => setChain((current) => (current.includes(id) || current.length >= MAX_CHAIN ? current : [...current, id]));
  // Direct manipulation: drag from species A to species B on the board draws "A → B" (food → eater). It extends the
  // chain when A is its last link, rewires it after A when A is already in it, and starts a new chain otherwise.
  const linkChain = (fromId: string, toId: string) => setChain((current) => {
    const a = fromId as SpeciesId, b = toId as SpeciesId;
    const base = current.includes(a) ? current.slice(0, current.indexOf(a) + 1) : [a];
    if (base.includes(b) || base.length >= MAX_CHAIN) return current;
    return [...base, b];
  });
  useLinkDrag(!removing, linkChain);
  const board = {
    names: SPECIES_LABEL, roleNames: ROLE_NAMES, effectNames: EFFECT_NAMES, removedLabel: "đã bỏ khỏi lưới",
    removed: removing ? removed : null, effects, roles: ROLES,
    chain: removing ? [] : chain, brokenAt: removing ? null : checked?.brokenAt ?? null,
    pickable: (id: SpeciesId) => (removing ? allowed.includes(id) : !chain.includes(id) && chain.length < MAX_CHAIN),
    onPick: removing ? pickRemove : pickChain,
    focus: boardFocus(inspected, []), onInspect: setInspected,
    label: removing
      ? `Lưới thức ăn đồng cỏ${removed ? `, đã bỏ ${label(removed)}` : ""}. Bấm một loài được phép để bỏ khỏi lưới.`
      : `Lưới thức ăn đồng cỏ. Chuỗi của em: ${chain.map(label).join(" → ") || "chưa có"}. Bấm một loài để nối vào chuỗi.`,
    illustrative: "Sơ đồ minh hoạ: mũi tên đi từ thức ăn tới loài ăn nó. Nấm, vi khuẩn phân giải xác của mọi loài.",
  };
  const relationText_ = inspected ? relationText(inspected)
    : removing ? (removed ? `Đã bỏ ${label(removed)}: viền xanh là loài tăng, viền đỏ là loài giảm. Bấm lại loài đó để thả về lưới.` : cause ? `${CAUSE_LABEL[cause]} không làm mất loài nào trong lưới.` : `Bấm thẳng vào ${allowed.map(label).join(", ")} trên sa bàn để bỏ loài đó khỏi lưới.`)
      : chain.length ? `Chuỗi của em: ${chain.map(label).join(" → ")}. Kéo từ một loài sang loài ăn nó để nối thêm mũi tên.` : "Bấm loài đầu tiên (nên là sinh vật sản xuất), rồi lần lượt loài ăn nó; hoặc kéo mũi tên từ loài này sang loài ăn nó ngay trên sa bàn.";
  const relation = <p className="diorama-relation" aria-live="polite" data-testid="fw-explore-relation">{relationText_}</p>;
  const legend = removing
    ? <ul className="diorama-legend" aria-label="Chú giải"><li data-tone="increase">Tăng</li><li data-tone="decrease">Giảm</li><li data-tone="removed">Đã bỏ</li></ul>
    : <ul className="diorama-legend" aria-label="Chú giải"><li data-tone="increase">Mắt xích trong chuỗi</li></ul>;
  const heading = removing ? `Lưới thức ăn${removed ? ` khi bỏ ${label(removed)}` : ""}` : `Chuỗi thức ăn của em · ${chain.length} mắt xích`;

  const scene = view === "3d"
    ? <>
        {toggle}
        <FoodWebView3D {...board} layoutKey={`explore-${station}-${removed ?? "none"}`} />
        <div className="explore-overlay" data-testid="diorama-page">
          <h2>Đồng cỏ k8-diorama · {heading}</h2>
          {relation}{legend}
        </div>
      </>
    : <div className="diorama-2d" data-testid="diorama-page">
        {toggle}
        <header className="explore-scene-head">
          <div><span className="explore-scene-eyebrow">Đồng cỏ · k8-diorama</span><h2>{heading}</h2></div>
          {legend}
        </header>
        <div className="diorama-fw-board"><FoodWebScene {...board} /></div>
        {relation}
      </div>;

  const removeControls = <>
    <fieldset className="explore-chips" data-testid="food-web-panel">
      <legend>Bỏ một loài khỏi lưới thức ăn</legend>
      {allowed.map((id) => <button type="button" key={id} className="explore-chip" aria-pressed={!cause && removed === id} onClick={() => pickRemove(id)}>{label(id)}</button>)}
    </fieldset>
    <fieldset className="explore-chips" data-testid="food-web-causes">
      <legend>Hoặc chọn một hoạt động của con người</legend>
      {causes.map((id) => <button type="button" key={id} className="explore-chip" aria-pressed={cause === id} onClick={() => pickCause(id)}>{CAUSE_LABEL[id]}</button>)}
    </fieldset>
    <button type="button" className="explore-btn explore-btn-secondary" disabled={!removed && !cause} onClick={() => { setRemoved(null); setCause(null); }}>Khôi phục lưới đầy đủ</button>
  </>;
  const chainControls = <>
    <ol className="fw-chain-list" aria-label="Chuỗi của em" data-testid="fw-chain">
      {chain.length ? chain.map((id, index) => <li key={id} data-broken={checked?.brokenAt === index || undefined}>{label(id)}</li>) : <li className="explore-field-hint">Chưa có mắt xích nào.</li>}
    </ol>
    <div className="explore-journal-actions">
      <button type="button" className="explore-btn explore-btn-secondary" disabled={!chain.length} onClick={() => setChain((current) => current.slice(0, -1))}>Bỏ mắt xích cuối</button>
      <button type="button" className="explore-btn explore-btn-secondary" disabled={!chain.length} onClick={() => setChain([])}>Dựng lại</button>
    </div>
    <details className="fw-all-chains">
      <summary>Lưới này có {allChains.length} chuỗi đầy đủ (gợi ý)</summary>
      <ul>{allChains.map((item) => <li key={item.join(">")}>{item.map(label).join(" → ")}</li>)}</ul>
    </details>
  </>;
  const controls = <>
    <ExploreStations stations={FW_STATIONS} value={station} onChange={(next) => { setStation(next); setInspected(null); }} />
    {removing ? removeControls : chainControls}
  </>;

  let readout: ReactNode;
  if (removing) {
    readout = result?.setup === "remove"
      ? <>
          <span className="explore-status" data-tone="info">{cause ? `${CAUSE_LABEL[cause]}: ` : ""}Đã bỏ {label(removed!)}</span>
          <ul data-testid="food-web-effects">
            {changes.map(([id, effect]) => <li key={id}><b>{label(id)}</b>: {effect.effect === "INCREASE" ? "tăng" : "giảm"}{effect.onlyFood ? " (mất nguồn thức ăn duy nhất)" : ""}</li>)}
            <li>Chuỗi thức ăn bị đứt: <b>{result.brokenChains}</b> / {allChains.length}</li>
          </ul>
        </>
      : cause
        ? <p className="explore-status" data-tone="ok">{CAUSE_LABEL[cause]} không làm mất loài nào: lưới giữ cân bằng.</p>
        : <p className="explore-field-hint">Chọn một loài hoặc một hoạt động để xem những loài nào tăng, giảm và bao nhiêu chuỗi thức ăn bị đứt.</p>;
  } else if (checked) {
    const status = !checked.valid
      ? `Đứt ở mắt xích ${checked.brokenAt! + 1}: ${label(chain[checked.brokenAt! - 1])} không phải thức ăn của ${label(chain[checked.brokenAt!])}`
      : !checked.startsWithProducer ? "Các cặp đều đúng, nhưng chuỗi nên bắt đầu từ sinh vật sản xuất" : `Chuỗi hợp lệ · ${checked.length} bậc dinh dưỡng`;
    readout = <>
      <span className="explore-status" data-tone={fullChain ? "ok" : "warn"} data-testid="fw-chain-status">{status}</span>
      {fullChain && <EnergyPyramid chain={chain} />}
    </>;
  } else {
    readout = <p className="explore-field-hint">Dựng ít nhất hai mắt xích để mô hình kiểm chuỗi.</p>;
  }

  const lastKJ = chainEnergy(chain)[chain.length - 1];
  const journalSummary = removing
    ? (removed ? `${cause ? `${CAUSE_LABEL[cause]} → ` : ""}${foodWebSummary(removed)}` : cause ? `${CAUSE_LABEL[cause]}: không mất loài nào` : "")
    : checked ? `Chuỗi ${chain.map(label).join(" → ")}: ${fullChain ? `hợp lệ, bậc cuối ${kj(lastKJ)}` : "chưa hợp lệ"}` : "";

  return <ExploreBenchShell labId={labId} activityId={activityId} title={title} config={config} kitItems={dioramaBench.listKitItems(config)}
    scene={scene} controls={controls} readout={readout} sceneKind={view === "3d" ? "full" : "card"} testId="diorama-bench"
    journalSummary={journalSummary} canSave={journalSummary !== ""} saveHint={removing ? "Bỏ một loài hoặc chọn một hoạt động để có trạng thái cần ghi." : "Dựng ít nhất hai mắt xích để ghi chuỗi."} />;
}

type TolStationId = "temperature" | "import";
const TOL_STATIONS: ReadonlyArray<ExploreStation<TolStationId>> = [
  { id: "temperature", label: "Đo vùng sống", hint: "Đổi nhiệt độ nước, ghi từng lần đo vào bảng và tự khoanh vùng giới hạn trước khi bật đường giới hạn." },
  { id: "import", label: "Chọn cá nhập nội", hint: "Một địa phương có nhiệt độ nước dao động trong năm. Loài cá minh hoạ A, B, C nào sống được ở đó quanh năm?" },
];
const FISH_LABEL: Record<string, string> = { "fish-a": "Cá A", "fish-b": "Cá B", "fish-c": "Cá C" };
const deci = (value: number) => `${(value / 10).toFixed(1).replace(".", ",")} °C`;
type Range = { minDeciC: number; maxDeciC: number };
type Reading = { valueDeciC: number; within: boolean };

/** Ranges on one 0–50 °C axis: the site's yearly water temperature and each fish's tolerance (illustrative data). */
function RangeBars({ site, fish, valueDeciC, revealed, onValueChange }: { site: Range; fish: ReadonlyArray<{ speciesId: string; limits: Range; suitable: boolean }>; valueDeciC: number; revealed: boolean; onValueChange?: (deciC: number) => void }) {
  const x = (deciC: number) => 92 + (deciC / 500) * 490;
  const drag = onValueChange ? svgDrag((point) => onValueChange(Math.min(500, Math.max(0, Math.round(((point.x - 92) / 490) * 50) * 10)))) : null;
  const rows = [{ id: "site", name: "Nước địa phương", range: site, tone: "site" }, ...fish.map((item) => ({ id: item.speciesId, name: FISH_LABEL[item.speciesId] ?? item.speciesId, range: item.limits, tone: revealed ? (item.suitable ? "ok" : "bad") : "fish" }))];
  const aria = `Khoảng nhiệt độ: nước địa phương ${deci(site.minDeciC)} đến ${deci(site.maxDeciC)}; ${fish.map((item) => `${FISH_LABEL[item.speciesId]} ${deci(item.limits.minDeciC)} đến ${deci(item.limits.maxDeciC)}`).join("; ")}.`;
  return <figure className="eco-range-bars" data-testid="eco-range-bars">
    <svg viewBox="0 0 600 220" role="img" aria-label={aria}>
      {[0, 100, 200, 300, 400, 500].map((tick) => <g key={tick} className="eco-range-tick"><line x1={x(tick)} x2={x(tick)} y1={18} y2={190} /><text x={x(tick)} y={208} textAnchor="middle">{tick / 10} °C</text></g>)}
      <rect className="eco-range-site-band" x={x(site.minDeciC)} y={18} width={x(site.maxDeciC) - x(site.minDeciC)} height={172} />
      {rows.map((row, index) => <g key={row.id} className="eco-range-row" data-tone={row.tone}>
        <text x={4} y={44 + index * 42} className="eco-range-name">{row.name}</text>
        <rect x={x(row.range.minDeciC)} y={30 + index * 42} width={x(row.range.maxDeciC) - x(row.range.minDeciC)} height={20} rx={10} />
      </g>)}
      <line className="eco-range-now" x1={x(valueDeciC)} x2={x(valueDeciC)} y1={12} y2={194} />
      {drag && <rect className="eco-axis-grip" x={80} y={10} width={514} height={190} data-testid="eco-range-drag" aria-hidden="true" {...drag} />}
    </svg>
    <figcaption>Số liệu minh hoạ (không phải số liệu SGK). Vạch dọc là nhiệt độ đang thử; dải nhạt là khoảng nhiệt độ nước của địa phương.</figcaption>
  </figure>;
}

function ToleranceBench({ labId, title, config, activityId }: { labId: string; title: string; config: Extract<DioramaExploreConfig, { catalogId: "FL-20" }>; activityId: string }) {
  const speciesId = config.spec.allowedSpecies[0];
  const [station, setStation] = useState<TolStationId>("temperature");
  const [value, setValue] = useState(250);
  const [showLimits, setShowLimits] = useState(false);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [prediction, setPrediction] = useState<string[]>([]);
  const [checkedImport, setCheckedImport] = useState(false);
  // The student's own bracket of the tolerance range, dragged on the graph (direct manipulation).
  const [guess, setGuess] = useState<LimitGuess>({ minDeciC: 100, maxDeciC: 400 });
  const { view, toggle } = useBenchView();
  const raw = fl20ToleranceResult(speciesId, value);
  if (raw.setup !== "tolerance") throw new Error("FL-20: mô hình không trả về kết quả giới hạn chịu đựng");
  const result = raw;
  const siteId = Object.keys(ECOLOGY_SITES)[0] as keyof typeof ECOLOGY_SITES;
  const importRaw = useMemo(() => ecologyTolerance({ setup: "import-comparison", siteId, factor: "TEMPERATURE" }), [siteId]);
  const comparison = importRaw.setup === "import-comparison" ? importRaw : null;
  const importing = station === "import";
  const fish = result.canPersist ? "persists" as const : "gone" as const;
  const zoneText = result.zone === "WITHIN" ? "trong vùng sống" : result.zone === "BELOW_MIN" ? "dưới giới hạn dưới" : "trên giới hạn trên";
  const valueLabel = deci(value);
  const pondLabel = `Ao nuôi ${label(speciesId)} ở ${valueLabel}: ${result.canPersist ? "cá vẫn sống được" : "cá không tồn tại được"}.`;

  // What the student's own readings already say: the lowest and highest "lives" readings and the nearest "dies"
  // readings beyond them. Each limit lies in between.
  const sorted = [...readings].sort((a, b) => a.valueDeciC - b.valueDeciC);
  const lives = sorted.filter((item) => item.within);
  const lowLive = lives[0];
  const highLive = lives[lives.length - 1];
  const coldDead = lowLive ? sorted.filter((item) => !item.within && item.valueDeciC < lowLive.valueDeciC).pop() : undefined;
  const hotDead = highLive ? sorted.find((item) => !item.within && item.valueDeciC > highLive.valueDeciC) : undefined;
  const record = () => setReadings((prev) => [...prev.filter((item) => item.valueDeciC !== value), { valueDeciC: value, within: result.canPersist }]);
  const suitable = comparison ? comparison.candidates.filter((item) => item.suitable).map((item) => item.speciesId).sort().join() : "";
  const predictionOk = suitable === [...prediction].sort().join();

  const graph = <ToleranceGraph limits={result.limits} valueDeciC={value} showLimits={showLimits}
    labels={{ title: `Giới hạn chịu đựng nhiệt độ của ${label(speciesId)}`, curve: "Mức sống", lower: "Giới hạn dưới", upper: "Giới hạn trên", illustrative: "Kéo vạch cam để khoanh vùng em nghĩ cá sống được; kéo trên trục để đổi nhiệt độ. Đường cong chỉ minh hoạ hình dạng." }}
    onValueChange={setValue} guess={guess} onGuessChange={setGuess} />;
  const bars = comparison ? <RangeBars site={comparison.site} fish={comparison.candidates} valueDeciC={value} revealed={checkedImport} onValueChange={setValue} /> : null;
  const fishAt = (limits: Range) => value >= limits.minDeciC && value <= limits.maxDeciC;

  const heading = importing ? `Chọn cá nhập nội · nước ở ${valueLabel}` : `Ao thí nghiệm · ${label(speciesId)} ở ${valueLabel}`;
  const scene = view === "3d"
    ? <>
        {toggle}
        <PondView3D valueDeciC={value} fish={importing ? "persists" : fish} vigor={importing ? 1 : vigorAt(value, result)} label={importing ? `Ao thử ở ${valueLabel}` : pondLabel} valueLabel={valueLabel} layoutKey="explore-pond" onValueChange={setValue} />
        <div className="explore-overlay diorama-graph-card" data-testid="diorama-page">
          <h2>{heading}</h2>
          {importing ? bars : graph}
        </div>
      </>
    : <div className="diorama-2d" data-testid="diorama-page">
        {toggle}
        <header className="explore-scene-head">
          <div><span className="explore-scene-eyebrow">Ao thí nghiệm · k8-diorama</span><h2>{heading}</h2></div>
          {!importing && <span className="explore-status" data-tone={result.canPersist ? "ok" : "warn"}>{zoneText}</span>}
        </header>
        {importing ? bars : <><div className="diorama-pond"><PondScene valueDeciC={value} fish={fish} label={pondLabel} onValueChange={setValue} /></div>{graph}</>}
      </div>;

  const slider = <label className="explore-field">
    <span className="explore-field-row"><span>Nhiệt độ nước</span><span className="explore-field-value" data-testid="tolerance-value">{valueLabel}</span></span>
    <input className="explore-range" type="range" min={0} max={500} step={10} value={value} onChange={(event) => setValue(Number(event.target.value))} aria-valuetext={valueLabel} />
    <span className="explore-range-scale" aria-hidden="true"><span>0 °C</span><span>25 °C</span><span>50 °C</span></span>
  </label>;
  const temperatureControls = <div className="explore-controls" data-testid="tolerance-panel">
    {slider}
    <div className="explore-journal-actions">
      <button type="button" className="explore-btn" onClick={record} data-testid="tolerance-record">Ghi lần đo này vào bảng</button>
      <button type="button" className="explore-btn explore-btn-secondary" disabled={!readings.length} onClick={() => setReadings([])}>Xoá bảng</button>
    </div>
    <label className="explore-check">
      <input type="checkbox" checked={showLimits} onChange={(event) => setShowLimits(event.target.checked)} />
      <span>Hiện giới hạn chịu đựng trên đồ thị (sau khi em đã tự khoanh vùng)</span>
    </label>
  </div>;
  const importControls = <div className="explore-controls" data-testid="import-panel">
    {slider}
    <fieldset className="explore-chips">
      <legend>Em dự đoán loài nào sống được quanh năm ở địa phương?</legend>
      {comparison?.candidates.map((item) => <button type="button" key={item.speciesId} className="explore-chip" aria-pressed={prediction.includes(item.speciesId)}
        onClick={() => { setCheckedImport(false); setPrediction((prev) => prev.includes(item.speciesId) ? prev.filter((id) => id !== item.speciesId) : [...prev, item.speciesId]); }}>{FISH_LABEL[item.speciesId]}</button>)}
    </fieldset>
    <div className="explore-journal-actions">
      <button type="button" className="explore-btn" onClick={() => setCheckedImport(true)} data-testid="import-check">Kiểm tra bằng mô hình</button>
    </div>
  </div>;
  const controls = <>
    <ExploreStations stations={TOL_STATIONS} value={station} onChange={setStation} />
    {importing ? importControls : temperatureControls}
  </>;

  const readingTable = readings.length > 0 ? <table className="explore-table" data-testid="tolerance-readings">
    <thead><tr><th>Nhiệt độ</th><th>{label(speciesId)}</th></tr></thead>
    <tbody>{sorted.map((item) => <tr key={item.valueDeciC}><td className="explore-mono">{deci(item.valueDeciC)}</td><td data-tone={item.within ? "ok" : "warn"}>{item.within ? "sống được" : "không sống được"}</td></tr>)}</tbody>
  </table> : null;
  const coldText = lowLive ? (coldDead ? `giữa ${deci(coldDead.valueDeciC)} và ${deci(lowLive.valueDeciC)}` : `ở ${deci(lowLive.valueDeciC)} hoặc thấp hơn (chưa đo điểm cá chết phía lạnh)`) : "";
  const hotText = highLive ? (hotDead ? `giữa ${deci(highLive.valueDeciC)} và ${deci(hotDead.valueDeciC)}` : `ở ${deci(highLive.valueDeciC)} hoặc cao hơn (chưa đo điểm cá chết phía nóng)`) : "";
  const bracket = lowLive && highLive
    ? <p className="explore-field-hint" data-testid="tolerance-bracket">Theo bảng của em: giới hạn dưới nằm {coldText}; giới hạn trên nằm {hotText}.</p>
    : readings.length > 0 ? <p className="explore-field-hint">Ghi thêm ít nhất một điểm cá sống được để bắt đầu khoanh vùng.</p> : null;

  let readout: ReactNode;
  if (importing && comparison) {
    readout = <>
      <p className="explore-field-hint">Nước ở địa phương: từ {deci(comparison.site.minDeciC)} đến {deci(comparison.site.maxDeciC)} trong năm.</p>
      <table className="explore-table" data-testid="import-table">
        <thead><tr><th>Loài</th><th>Giới hạn</th><th>Ở {valueLabel}</th>{checkedImport && <th>Quanh năm</th>}</tr></thead>
        <tbody>{comparison.candidates.map((item) => <tr key={item.speciesId}>
          <td>{FISH_LABEL[item.speciesId]}</td>
          <td className="explore-mono">{deci(item.limits.minDeciC)} – {deci(item.limits.maxDeciC)}</td>
          <td data-tone={fishAt(item.limits) ? "ok" : "warn"}>{fishAt(item.limits) ? "sống" : "chết"}</td>
          {checkedImport && <td data-tone={item.suitable ? "ok" : "warn"}>{item.suitable ? "phù hợp" : item.failsOn === "COLD" ? "chết khi lạnh" : item.failsOn === "HEAT" ? "chết khi nóng" : "chết cả lạnh và nóng"}</td>}
        </tr>)}</tbody>
      </table>
      {checkedImport && <p className="explore-feedback" data-tone={predictionOk ? "ok" : "warn"} data-testid="import-verdict">
        {predictionOk ? "Dự đoán của em khớp với mô hình." : "Dự đoán chưa khớp. Đặt nhiệt độ ở mức thấp nhất và cao nhất của địa phương để xem loài nào chết."}
      </p>}
    </>;
  } else {
    readout = <>
      <span className="explore-status" data-tone={result.canPersist ? "ok" : "warn"} data-testid="tolerance-zone">{label(speciesId)} {zoneText}</span>
      {readingTable ?? <p className="explore-field-hint">Đặt một nhiệt độ rồi bấm “Ghi lần đo này vào bảng”. Đo vài điểm ở hai phía để tự tìm giới hạn.</p>}
      {bracket}
      <p className="explore-field-hint" data-testid="tolerance-guess">Vùng em khoanh trên đồ thị: {deci(guess.minDeciC)} – {deci(guess.maxDeciC)}{showLimits
        ? ` (lệch ${deci(Math.abs(guess.minDeciC - result.limits.minDeciC))} ở dưới, ${deci(Math.abs(guess.maxDeciC - result.limits.maxDeciC))} ở trên).`
        : ". Bật đường giới hạn để so."}</p>
      {showLimits && <dl>
        <dt>Giới hạn dưới</dt><dd>{deci(result.limits.minDeciC)}</dd>
        <dt>Giới hạn trên</dt><dd>{deci(result.limits.maxDeciC)}</dd>
      </dl>}
    </>;
  }

  const fishNames = (ids: string[]) => ids.map((id) => FISH_LABEL[id]).join(", ") || "không loài nào";
  const journalSummary = importing
    ? (checkedImport && comparison ? `Nhập nội (${deci(comparison.site.minDeciC)}–${deci(comparison.site.maxDeciC)}): phù hợp ${fishNames(comparison.candidates.filter((item) => item.suitable).map((item) => item.speciesId))}; em dự đoán ${fishNames(prediction)}` : "")
    : readings.length ? `${toleranceSummary(speciesId, value)}; em khoanh ${deci(guess.minDeciC)}–${deci(guess.maxDeciC)}; bảng đo ${readings.length} điểm${lowLive && highLive ? `, sống từ ${deci(lowLive.valueDeciC)} đến ${deci(highLive.valueDeciC)}` : ""}` : toleranceSummary(speciesId, value);

  return <ExploreBenchShell labId={labId} activityId={activityId} title={title} config={config} kitItems={dioramaBench.listKitItems(config)}
    scene={scene} controls={controls} readout={readout} sceneKind={view === "3d" ? "full" : "card"} testId="diorama-bench"
    journalSummary={journalSummary} canSave={journalSummary !== ""} saveHint="Bấm “Kiểm tra bằng mô hình” trước khi lưu." />;
}

export default function DioramaExplorePage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as DioramaExploreConfig;
  return config.catalogId === "FL-21"
    ? <FoodWebBench labId={labId} title={title || config.title} config={config} activityId={activity.id} />
    : <ToleranceBench labId={labId} title={title || config.title} config={config} activityId={activity.id} />;
}
