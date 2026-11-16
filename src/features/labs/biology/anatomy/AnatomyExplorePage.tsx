/**
 * `/labs/:id` page of kit `anatomy` (FL-16 Studio, Kit bổ trợ). Story EX-FL16 of the Explore backlog: "studio tách
 * lớp/mặt cắt, kéo thẻ tên vào bộ phận, đèn chiếu tia vào mắt", state `visibleLayers`, `cutPlane`, `selectedPartId`,
 * `labelsPlaced`, `accommodation`. The Guided eye-optics Lab walks fixed stations with a rubric; this studio leaves
 * every one of those open and unscored:
 * - Cấu tạo: cut the eye open or close it, peel the outer layers, pick any part and read what it does.
 * - Gắn thẻ tên: the studio lights one part, the student tags it; as many tries as they like, nothing is sent.
 * - Đèn chiếu: the released scenarios, plus a free mode where the student picks the eye and moves the object anywhere
 *   from 10 cm to infinity, then sets the lens and glasses. The power the eye needs is `requiredPowerD` of
 *   `eye-optics@1.0.0`; "on the retina" uses the rubric tolerance.
 * 3D reuses the Guided studio (`AnatomyStage`, `EyeModel`, `OpticsRays`); 2D is `EyeParts2D` and the ray diagram.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { DISTANCE_RANGE_M, EYE_OPTICS_SCENARIOS, GLASSES_POWER_RANGE_D, LENS_POWER_RANGE_D, POWER_STEP_D, requiredPowerD } from "@nexalab/sim/eye-optics";
import { eyeParts } from "@nexalab/sim/eye-parts";
import type { AnatomyExploreConfig } from "@nexalab/sim/explore-kits";
import type { ExplorePageProps } from "../../runtime/explore-registry";
import { LabHeaderSlot } from "../../shared/LabSpace";
import { LabRendererToggle } from "../../shared/LabRendererToggle";
import { ExploreBenchShell, canUseWebgl } from "../../shared/explore/ExploreBenchShell";
import { ExploreStations, type ExploreStation } from "../../shared/explore/ExploreStations";
import { AnatomyStage } from "./kit/AnatomyStage";
import { EyeModel, MM } from "./kit/EyeModel";
import { EYE_PART_IDS, type EyePartId } from "./kit/eye-parts";
import { accommodationFromLensPower } from "./kit/eye-geometry";
import { CORNEA_POWER_D, EQUIVALENT_SURFACE_Y_MM, FOCUS_TOLERANCE_D, traceEye } from "./kit/optics";
import { EYE_CENTRE, EYE_ROTATION, OpticsRays } from "./eye-optics/EyeOpticsActivity";
import { EyeRayDiagram2D, type ObjectRail } from "./EyeRayDiagram2D";
import { EyeParts2D } from "./EyeParts2D";
import { anatomyBench } from "./anatomy-bench";
import "./eye-optics/eye-optics.css";
import "./anatomy-explore.css";

type StationId = "structure" | "labels" | "optics";
const STATIONS: ReadonlyArray<ExploreStation<StationId>> = [
  { id: "structure", label: "Cấu tạo", hint: "Cắt dọc hoặc đóng nhãn cầu, bóc lớp vỏ ngoài và chọn bất kỳ bộ phận nào để xem nó làm gì." },
  { id: "labels", label: "Gắn thẻ tên", hint: "Studio làm sáng một bộ phận. Chọn đúng thẻ tên cho nó; thử bao nhiêu lần cũng được, không chấm điểm." },
  { id: "optics", label: "Đèn chiếu & điều tiết", hint: "Chiếu tia sáng vào mắt, đổi khoảng cách vật, chỉnh thể thủy tinh và kính để ảnh rơi đúng võng mạc." },
];
const PART_NAME = Object.fromEntries(eyeParts.map((part) => [part.id, part.name])) as Record<EyePartId, string>;
const PART_INFO = Object.fromEntries(eyeParts.map((part) => [part.id, part.description])) as Record<EyePartId, string>;
/** Outer layers the "peel" switch hides, as `EyeModel showInterior` does in 3D. */
const OUTER: ReadonlySet<EyePartId> = new Set(["sclera", "nerve"]);
/** Tag order of the label station: front to back, as light goes through the eye. */
const LABEL_ORDER: EyePartId[] = ["cornea", "aqueous", "pupil", "lens", "vitreous", "retina", "nerve", "sclera"];
const NAME_CHOICES = [...EYE_PART_IDS].sort((a, b) => PART_NAME[a].localeCompare(PART_NAME[b], "vi"));

const CLOSE_VIEW: [number, number, number] = [1.7, 1.3, -12];
const STUDIO_VIEW: [number, number, number] = [5.5, 2.6, -9];
const FREE = "free";
const dioptre = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2).replace(".", ",")} D`;
const comma = (value: number, digits = 1) => value.toFixed(digits).replace(".", ",");
/** Slider position (0…100) to object distance: the last step is "very far" (infinity), the rest is log-scaled 0,1–6 m. */
const distanceAt = (step: number) => (step >= 100 ? null : Math.round(DISTANCE_RANGE_M.min * (DISTANCE_RANGE_M.max / DISTANCE_RANGE_M.min) ** (step / 99) * 100) / 100);
const distanceText = (distanceM: number | null) => (distanceM === null ? "rất xa (vô cực)" : distanceM < 1 ? `${Math.round(distanceM * 100)} cm` : `${comma(distanceM, 2)} m`);
/**
 * Object rail of the light station (direct manipulation): the object is drawn `RAIL.minMm`–`RAIL.maxMm` in front of the
 * eye for 10 cm–6 m (log scale, like the distance slider), and at `RAIL.farMm` for "very far". Display only, not to
 * scale; the optics always use the real distance.
 */
const RAIL = { minMm: 5, maxMm: 19, farMm: 22 } as const;
const railMmOf = (step: number) => (step >= 100 ? RAIL.farMm : RAIL.minMm + ((RAIL.maxMm - RAIL.minMm) * step) / 99);
const stepOfRailMm = (mm: number) => (mm >= (RAIL.maxMm + RAIL.farMm) / 2 ? 100 : Math.min(99, Math.max(0, Math.round(((mm - RAIL.minMm) / (RAIL.maxMm - RAIL.minMm)) * 99))));
const stepOfDistance = (distanceM: number) => Math.round((99 * Math.log(distanceM / DISTANCE_RANGE_M.min)) / Math.log(DISTANCE_RANGE_M.max / DISTANCE_RANGE_M.min));
const RAIL_TICKS = [{ m: 0.1, label: "10 cm" }, { m: 0.25, label: "25 cm" }, { m: 1, label: "1 m" }, { m: 6, label: "6 m" }]
  .map((tick) => ({ mm: railMmOf(stepOfDistance(tick.m)), label: tick.label })).concat([{ mm: RAIL.farMm, label: "∞" }]);

/** 3D rail along the optical axis (eye group frame): drag the green handle, or press anywhere on the rail. */
function ObjectRail3D({ railMm, onDrag }: { railMm: number; onDrag: (mm: number) => void }) {
  const controls = useThree((state) => state.controls) as unknown as { enabled: boolean } | null;
  const group = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const at = (mm: number): [number, number, number] => [0, (EQUIVALENT_SURFACE_Y_MM + mm) * MM, 0];
  const move = (event: ThreeEvent<PointerEvent>) => {
    const node = group.current;
    if (!node) return;
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(node.getWorldQuaternion(new THREE.Quaternion()));
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, node.getWorldPosition(new THREE.Vector3()));
    const hit = event.ray.intersectPlane(plane, new THREE.Vector3());
    if (!hit) return;
    const mm = node.worldToLocal(hit).y / MM - EQUIVALENT_SURFACE_Y_MM;
    onDrag(Math.min(RAIL.farMm, Math.max(RAIL.minMm, mm)));
  };
  const end = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    dragging.current = false;
    (event.target as unknown as Element).releasePointerCapture?.(event.pointerId);
    if (controls) controls.enabled = true;
  };
  const length = (RAIL.farMm - RAIL.minMm + 4) * MM;
  return <group ref={group}>
    <Line points={[at(RAIL.minMm), at(RAIL.farMm)]} color="#2f6b52" lineWidth={4} transparent opacity={0.6} />
    {RAIL_TICKS.map((tick) => <Html key={tick.label} position={[-2.2 * MM, (EQUIVALENT_SURFACE_Y_MM + tick.mm) * MM, 0]} center zIndexRange={[5, 0]}><span className="eye-3d-rail-chip">{tick.label}</span></Html>)}
    <mesh position={at(railMm)}>
      <sphereGeometry args={[1.1 * MM, 20, 14]} />
      <meshStandardMaterial color="#2f6b52" emissive="#2f6b52" emissiveIntensity={0.35} />
    </mesh>
    <mesh position={[0, (EQUIVALENT_SURFACE_Y_MM + (RAIL.minMm + RAIL.farMm) / 2) * MM, 0]}
      onPointerOver={() => { document.body.style.cursor = "grab"; }} onPointerOut={() => { if (!dragging.current) document.body.style.cursor = ""; }}
      onPointerDown={(event) => { event.stopPropagation(); dragging.current = true; (event.target as unknown as Element).setPointerCapture?.(event.pointerId); if (controls) controls.enabled = false; document.body.style.cursor = "grabbing"; move(event); }}
      onPointerMove={(event) => { if (dragging.current) move(event); }}
      onPointerUp={(event) => { end(event); document.body.style.cursor = "grab"; }} onPointerCancel={end}>
      <boxGeometry args={[11 * MM, length, 8 * MM]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  </group>;
}

const EYE_TYPES = [
  { id: "normal", label: "Mắt bình thường", axialLengthM: 0.0226 },
  { id: "myopia", label: "Mắt cận thị nhẹ (trục dài)", axialLengthM: 0.0234 },
  { id: "hyperopia", label: "Mắt viễn thị (trục ngắn)", axialLengthM: 0.0215 },
] as const;

export default function AnatomyExplorePage({ labId, title, config: raw, activity }: ExplorePageProps) {
  const config = raw as AnatomyExploreConfig;
  const scenarios = EYE_OPTICS_SCENARIOS.filter((item) => config.spec.allowedScenarios.includes(item.id));
  // The free mode only offers eyes whose axial length one of the released scenarios already uses.
  const eyeTypes = EYE_TYPES.filter((eye) => scenarios.some((item) => item.axialLengthM === eye.axialLengthM));
  const [station, setStation] = useState<StationId>("structure");
  const [can3d] = useState(canUseWebgl);
  const [view, setView] = useState<"3d" | "2d">(can3d ? "3d" : "2d");
  const shown = can3d ? view : "2d";

  // Cấu tạo
  const [sectioned, setSectioned] = useState(true);
  const [peeled, setPeeled] = useState(false);
  const [selected, setSelected] = useState<EyePartId | null>("lens");
  // Gắn thẻ tên
  const [placed, setPlaced] = useState<Partial<Record<EyePartId, true>>>({});
  const [lastTry, setLastTry] = useState<{ part: EyePartId; ok: boolean } | null>(null);
  const target = LABEL_ORDER.find((id) => !placed[id]) ?? null;
  // Đèn chiếu
  const [scenarioId, setScenarioId] = useState<string>(scenarios[0]?.id ?? FREE);
  const [eyeType, setEyeType] = useState<string>(eyeTypes[0]?.id ?? "normal");
  const [distanceStep, setDistanceStep] = useState(55);
  const [lensPowerD, setLensPowerD] = useState<number>(LENS_POWER_RANGE_D.min);
  const [glassesPowerD, setGlassesPowerD] = useState(0);
  useEffect(() => { setLensPowerD(LENS_POWER_RANGE_D.min); setGlassesPowerD(0); }, [scenarioId]);

  const scenario = scenarios.find((item) => item.id === scenarioId);
  // Dragging the object leaves a fixed scenario for the free mode with the same eye.
  const dragObject = (mm: number) => {
    if (scenario) {
      const eye = eyeTypes.find((item) => item.axialLengthM === scenario.axialLengthM);
      if (!eye) return;
      setEyeType(eye.id);
      setScenarioId(FREE);
    }
    setDistanceStep(stepOfRailMm(mm));
  };
  const freeEye = EYE_TYPES.find((eye) => eye.id === eyeType) ?? EYE_TYPES[0];
  const axialLengthM = scenario?.axialLengthM ?? freeEye.axialLengthM;
  const objectDistanceM = scenario ? scenario.objectDistanceM : distanceAt(distanceStep);
  const axialMm = axialLengthM * 1000;
  const neededD = requiredPowerD(axialLengthM, objectDistanceM);
  const providedPowerD = CORNEA_POWER_D + lensPowerD + glassesPowerD;
  const trace = useMemo(() => traceEye({ axialMm, objectDistanceM, providedPowerD }), [axialMm, objectDistanceM, providedPowerD]);
  const defocusD = providedPowerD - neededD;
  const inFocus = Math.abs(defocusD) <= FOCUS_TOLERANCE_D + 1e-9;
  const offset = trace.imageOffsetMm ?? 0;
  const imageText = inFocus ? "Ảnh rõ, nằm trên võng mạc" : offset > 0 ? `Ảnh hội tụ trước võng mạc ${comma(Math.abs(offset))} mm` : `Ảnh hội tụ sau võng mạc ${comma(Math.abs(offset))} mm`;
  // Can the bare eye reach focus with its own lens? Tells the student whether glasses are needed at all.
  const lensNeeded = neededD - CORNEA_POWER_D;
  const reach = lensNeeded > LENS_POWER_RANGE_D.max ? "Thể thủy tinh đã căng tối đa vẫn không đủ: cần kính hội tụ." : lensNeeded < LENS_POWER_RANGE_D.min ? "Thể thủy tinh đã thả lỏng hết vẫn còn quá mạnh: cần kính phân kỳ." : `Mắt tự điều tiết được: thể thủy tinh khoảng ${comma(lensNeeded, 2)} D.`;
  const railMm = scenario ? (objectDistanceM === null ? RAIL.farMm : railMmOf(stepOfDistance(objectDistanceM))) : railMmOf(distanceStep);
  const rail: ObjectRail | undefined = eyeTypes.length ? { drawObjectMm: railMm, minMm: RAIL.minMm, maxMm: RAIL.maxMm, farMm: RAIL.farMm, onDragObject: dragObject, ticks: RAIL_TICKS } : undefined;
  const opticsLabel = scenario?.label ?? `${freeEye.label}, vật cách mắt ${distanceText(objectDistanceM)}`;

  const highlight = station === "labels" ? target : station === "structure" ? selected : null;
  const hiddenParts = station === "structure" && peeled ? OUTER : undefined;
  const toggle = can3d ? <LabHeaderSlot><LabRendererToggle mode={shown} onChange={setView} /></LabHeaderSlot> : null;
  const status = <span className="explore-status" data-tone={inFocus ? "ok" : "warn"} data-testid="eye-image-status">{imageText}</span>;
  const tryName = (part: EyePartId) => {
    if (!target) return;
    const ok = part === target;
    setLastTry({ part: target, ok });
    if (ok) setPlaced((prev) => ({ ...prev, [target]: true }));
  };
  const placedCount = Object.keys(placed).length;
  const tagNames: Partial<Record<EyePartId, string>> = station === "labels"
    ? Object.fromEntries(LABEL_ORDER.map((id) => [id, placed[id] ? PART_NAME[id] : id === target ? "?" : ""]).filter(([, name]) => name)) as Partial<Record<EyePartId, string>>
    : PART_NAME;

  const stageLabel = station === "optics"
    ? `Mô hình mắt cắt dọc, ${opticsLabel}. ${imageText}.`
    : station === "labels"
      ? `Mô hình mắt, bộ phận đang sáng cần gắn thẻ tên. Đã gắn ${placedCount}/${LABEL_ORDER.length}.`
      : `Mô hình mắt ${sectioned ? "cắt dọc" : "nguyên khối"}${peeled ? ", đã bóc củng mạc" : ""}; đang chọn ${selected ? PART_NAME[selected] : "không bộ phận nào"}.`;

  const scene3d = <AnatomyStage label={stageLabel} focus={null} cameraPosition={station === "optics" ? CLOSE_VIEW : STUDIO_VIEW} target={EYE_CENTRE}>
    <group rotation={EYE_ROTATION}>
      <EyeModel axialMm={axialMm} accommodation={accommodationFromLensPower(lensPowerD)} pupilMm={2.5}
        sectioned={station === "optics" || station === "labels" || sectioned} showInterior={station === "structure" && peeled}
        highlight={highlight} onPick={station === "structure" ? setSelected : undefined} />
      {station === "optics" && <OpticsRays axialMm={axialMm} objectDistanceM={objectDistanceM} providedPowerD={providedPowerD} inFocus={inFocus} drawObjectMm={railMm} />}
      {station === "optics" && rail && <ObjectRail3D railMm={railMm} onDrag={dragObject} />}
    </group>
  </AnatomyStage>;

  const scene2d = station === "optics"
    ? <EyeRayDiagram2D axialMm={axialMm} objectDistanceM={objectDistanceM} providedPowerD={providedPowerD} lensPowerD={lensPowerD} glassesPowerD={glassesPowerD} inFocus={inFocus} label={stageLabel} rail={rail} />
    : <EyeParts2D selected={highlight} hidden={hiddenParts} names={tagNames} onPick={station === "structure" ? setSelected : undefined} label={stageLabel} />;

  const overlayTitle = station === "optics" ? `Đèn chiếu · ${opticsLabel}` : station === "labels" ? `Gắn thẻ tên · ${placedCount}/${LABEL_ORDER.length}` : `Cấu tạo · ${selected ? PART_NAME[selected] : "chọn một bộ phận"}`;
  const overlayHint = station === "optics"
    ? "Nắm chấm xanh lá trên trục trước mắt và kéo để đưa vật lại gần hoặc ra xa. Chấm đỏ là nơi tia thực sự hội tụ."
    : station === "labels" ? "Bộ phận đang sáng màu xanh là bộ phận cần gắn thẻ. Kéo để xoay và nhìn rõ hơn." : "Bấm vào một bộ phận trên mô hình để chọn. Kéo để xoay, cuộn để phóng to.";
  const scene = shown === "3d"
    ? <>
        {toggle}
        {scene3d}
        <div className="explore-overlay" data-testid="anatomy-page">
          <h2>Studio mắt · {overlayTitle}</h2>
          {station === "optics" && status}
          <p className="explore-field-hint">{overlayHint}</p>
        </div>
      </>
    : <div className="anatomy-2d" data-testid="anatomy-page">
        {toggle}
        <header className="explore-scene-head">
          <div><span className="explore-scene-eyebrow">Studio mắt · anatomy</span><h2>{overlayTitle}</h2></div>
          {station === "optics" && status}
        </header>
        {scene2d}
      </div>;

  const structureControls = <>
    <label className="explore-check"><input type="checkbox" checked={sectioned} onChange={(event) => setSectioned(event.target.checked)} /><span>Mặt cắt dọc (nhìn vào trong nhãn cầu)</span></label>
    <label className="explore-check"><input type="checkbox" checked={peeled} onChange={(event) => setPeeled(event.target.checked)} /><span>Bóc lớp ngoài (ẩn củng mạc và dây thần kinh thị giác)</span></label>
    <fieldset className="explore-chips" data-testid="eye-part-chips">
      <legend>Chọn bộ phận</legend>
      {EYE_PART_IDS.map((id) => <button type="button" key={id} className="explore-chip" aria-pressed={selected === id} disabled={peeled && OUTER.has(id)} onClick={() => setSelected(id)}>{PART_NAME[id]}</button>)}
    </fieldset>
  </>;

  const labelControls = <>
    <div className="explore-progress"><span>Đã gắn {placedCount}/{LABEL_ORDER.length}</span><meter min={0} max={LABEL_ORDER.length} value={placedCount} /></div>
    {target
      ? <fieldset className="explore-chips" data-testid="eye-label-chips">
          <legend>Bộ phận đang sáng tên là gì?</legend>
          {NAME_CHOICES.map((id) => <button type="button" key={id} className="explore-chip" disabled={Boolean(placed[id])} onClick={() => tryName(id)}>{PART_NAME[id]}</button>)}
        </fieldset>
      : <p className="explore-feedback" data-tone="ok">Em đã gắn đủ {LABEL_ORDER.length} thẻ tên.</p>}
    {lastTry && <p className="explore-feedback" data-tone={lastTry.ok ? "ok" : "warn"} aria-live="polite" data-testid="eye-label-feedback">
      {lastTry.ok ? `Đúng: ${PART_NAME[lastTry.part]}. ${PART_INFO[lastTry.part]}` : "Chưa đúng. Nhìn lại vị trí của bộ phận đang sáng: nó nằm trước hay sau thể thủy tinh?"}
    </p>}
    <button type="button" className="explore-btn explore-btn-secondary" disabled={!placedCount} onClick={() => { setPlaced({}); setLastTry(null); }}>Gỡ hết thẻ, làm lại</button>
  </>;

  const opticsControls = <>
    <label className="explore-field">Kịch bản
      <select className="explore-select" value={scenarioId} onChange={(event) => setScenarioId(event.target.value)} aria-label="Kịch bản">
        {scenarios.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        {eyeTypes.length > 0 && <option value={FREE}>Tự đặt: chọn mắt và khoảng cách vật</option>}
      </select>
    </label>
    {!scenario && <>
      <label className="explore-field">Loại mắt
        <select className="explore-select" value={eyeType} onChange={(event) => setEyeType(event.target.value)} aria-label="Loại mắt">
          {eyeTypes.map((eye) => <option key={eye.id} value={eye.id}>{eye.label} · trục {comma(eye.axialLengthM * 1000)} mm</option>)}
        </select>
      </label>
      <label className="explore-field">
        <span className="explore-field-row"><span>Khoảng cách vật</span><span className="explore-field-value" data-testid="eye-distance">{distanceText(objectDistanceM)}</span></span>
        <input className="explore-range" type="range" min={0} max={100} step={1} value={distanceStep} onChange={(event) => setDistanceStep(Number(event.target.value))} aria-valuetext={distanceText(objectDistanceM)} />
        <span className="explore-range-scale" aria-hidden="true"><span>10 cm</span><span>6 m</span><span>vô cực</span></span>
      </label>
    </>}
    <label className="explore-field">
      <span className="explore-field-row"><span>Độ tụ thể thủy tinh (điều tiết)</span><span className="explore-field-value">{dioptre(lensPowerD)}</span></span>
      <input className="explore-range" type="range" min={LENS_POWER_RANGE_D.min} max={LENS_POWER_RANGE_D.max} step={POWER_STEP_D} value={lensPowerD}
        onChange={(event) => setLensPowerD(Number(event.target.value))} aria-valuetext={dioptre(lensPowerD)} />
      <span className="explore-range-scale" aria-hidden="true"><span>{LENS_POWER_RANGE_D.min} D · thả lỏng</span><span>{LENS_POWER_RANGE_D.max} D</span></span>
    </label>
    <label className="explore-field">
      <span className="explore-field-row"><span>Kính đeo</span><span className="explore-field-value">{glassesPowerD === 0 ? "không đeo" : dioptre(glassesPowerD)}</span></span>
      <input className="explore-range" type="range" min={GLASSES_POWER_RANGE_D.min} max={GLASSES_POWER_RANGE_D.max} step={POWER_STEP_D} value={glassesPowerD}
        onChange={(event) => setGlassesPowerD(Number(event.target.value))} aria-valuetext={glassesPowerD === 0 ? "không đeo kính" : dioptre(glassesPowerD)} />
      <span className="explore-range-scale" aria-hidden="true"><span>−10 D · phân kỳ</span><span>0</span><span>+10 D · hội tụ</span></span>
    </label>
  </>;

  const controls = <>
    <ExploreStations stations={STATIONS} value={station} onChange={setStation} />
    {station === "structure" ? structureControls : station === "labels" ? labelControls : opticsControls}
  </>;

  const readout = station === "structure"
    ? selected && <div className="anatomy-part-card" data-testid="eye-part-info"><b>{PART_NAME[selected]}</b><p>{PART_INFO[selected]}</p></div>
    : station === "labels"
      ? <p className="explore-field-hint">Thứ tự gắn đi theo đường ánh sáng: từ giác mạc ở phía trước tới võng mạc, rồi dây thần kinh và lớp vỏ ngoài.</p>
      : <>
          {status}
          <dl>
            <dt>Độ tụ cần có</dt><dd data-testid="eye-power">{comma(neededD, 2)} D (trục mắt {comma(axialMm)} mm, vật {distanceText(objectDistanceM)})</dd>
            <dt>Đang có</dt><dd>{comma(providedPowerD, 2)} D = giác mạc {CORNEA_POWER_D} D + thể thủy tinh {comma(lensPowerD, 2)} D{glassesPowerD ? ` + kính ${dioptre(glassesPowerD)}` : ""}</dd>
            <dt>Chênh lệch</dt><dd>{dioptre(defocusD)}</dd>
          </dl>
          <p className="explore-field-hint" data-testid="eye-reach">{reach}</p>
        </>;

  const journalSummary = station === "structure"
    ? (selected ? `Cấu tạo: ${PART_NAME[selected]} — ${PART_INFO[selected]}` : "")
    : station === "labels"
      ? `Gắn thẻ tên: đúng ${placedCount}/${LABEL_ORDER.length} bộ phận`
      : `${opticsLabel}: cần ${neededD.toFixed(2)} D, đang đặt ${providedPowerD.toFixed(2)} D${glassesPowerD ? ` (kính ${dioptre(glassesPowerD)})` : ""}: ${imageText.toLowerCase()}`;
  const canSave = station === "structure" ? Boolean(selected) : station === "labels" ? placedCount > 0 : true;

  return <ExploreBenchShell labId={labId} activityId={activity.id} title={title || config.title} config={config} kitItems={anatomyBench.listKitItems(config)}
    scene={scene} controls={controls} readout={readout || undefined} sceneKind={shown === "3d" ? "full" : "card"} testId="anatomy-bench"
    journalSummary={journalSummary} canSave={canSave} saveHint={station === "labels" ? "Gắn đúng ít nhất một thẻ tên để lưu." : "Chọn một bộ phận để lưu."} />;
}
