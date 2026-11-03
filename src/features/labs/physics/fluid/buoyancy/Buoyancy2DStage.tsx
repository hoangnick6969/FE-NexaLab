import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { EXPLORATION_SPECIMENS, useBuoyancyStore } from "./useBuoyancyStore";

/** Schematic and instrument readings use the same live store as the persistent 3D scene. */
export function Buoyancy2DStage() {
  const state = useBuoyancyStore(); const [flowing, setFlowing] = useState(false); const previousVolume = useRef(state.overflowMl);
  const drag = useRef<{ y: number; hoist: number } | null>(null);
  const prefix = useId().replaceAll(":", "");
  const samples = [...state.config.specimens, ...EXPLORATION_SPECIMENS];
  const sample = samples.find(item => item.id === state.specimenId)!;
  const weight = sample.massG / 1000 * state.config.gravity;
  const force = state.config.fluidDensityKgM3 * state.config.gravity * state.submergedVolumeMl / 1e6;
  const specimenHeight = state.specimenId === "pebble-a" ? 22 : 25;
  const sampleTop = 500 - state.specimenY - specimenHeight;
  const dynBottom = sampleTop - 64 - state.springForceN * 10.4;
  const dynTop = dynBottom - 150;
  useEffect(() => {
    if (state.overflowMl > previousVolume.current + .001) setFlowing(true);
    previousVolume.current = state.overflowMl;
    const timer = window.setTimeout(() => setFlowing(false), 1500);
    return () => window.clearTimeout(timer);
  }, [state.overflowMl]);
  const startDrag = (event: PointerEvent<SVGGElement>) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { y: event.clientY, hoist: state.targetHoistHeight }; };
  const moveDrag = (event: PointerEvent<SVGGElement>) => { if (!drag.current) return; const height = event.currentTarget.ownerSVGElement!.getBoundingClientRect().height; state.setHoistHeight(drag.current.hoist + (event.clientY - drag.current.y) * 600 / height / 72); };
  const endDrag = (event: PointerEvent<SVGGElement>) => { drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); };
  const coil = Array.from({ length: 37 }, (_, i) => `${300 + (i % 2 === 0 ? -6 : 6)},${dynTop + 18 + i * (55 + state.springForceN * 10.4) / 36}`).join(" ");
  const catchHeight = Math.min(45, state.overflowMl * 1000 / (Math.PI * 22 ** 2));
  return <figure className="buoyancy-2d-figure" data-testid="buoyancy-2d-stage">
    <figcaption>Mô hình 2D · kéo mẫu hoặc lực kế lên xuống</figcaption>
    <svg viewBox="0 0 740 600" role="group" aria-label="Sơ đồ 2D thí nghiệm lực đẩy Ác-si-mét">
      <defs>
        <marker id={`${prefix}-p`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6Z" fill="#dc2626" /></marker>
        <marker id={`${prefix}-fa`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6Z" fill="#059669" /></marker>
      </defs>
      <path d="M40 505H700" stroke="#9aafb8" strokeWidth="3" />
      <rect x="175" y="490" width="100" height="13" rx="3" fill="#354955" />
      <path d="M215 490V50" stroke="#90a4ae" strokeWidth="8" />
      <path d={`M215 ${dynTop - 13}H300V${dynTop}`} fill="none" stroke="#536d79" strokeWidth="5" />
      <circle cx="215" cy={dynTop - 13} r="10" fill="#087f99" />
      <g onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={() => { drag.current = null; }} className="buoyancy-2d-draggable">
        <rect x="283" y={dynTop} width="34" height="150" rx="12" fill="#e0f2fe" fillOpacity=".7" stroke="#7295a8" strokeWidth="2" />
        <polyline points={coil} fill="none" stroke="#627c89" strokeWidth="2" />
        {Array.from({ length: 6 }, (_, i) => <g key={i}><path d={`M307 ${dynTop + 12 + i * 25}H316`} stroke="#284c62" /><text x="320" y={dynTop + 16 + i * 25} fontSize="10">{i} N</text></g>)}
        <path d={`M282 ${dynTop + 12 + state.springForceN / 5 * 125}H317`} stroke="#ef4444" strokeWidth="3" />
        <text x="360" y={dynTop + 65} fill="#075985" fontSize="17" fontWeight="600">F = {state.springForceN.toFixed(3)} N</text>
      </g>
      <path d={`M300 ${dynBottom}V${sampleTop}`} stroke="#566a75" strokeWidth="1.5" />
      <path d="M258 400V493Q300 506 342 493V400" fill="#e0f2fe" fillOpacity=".3" stroke="#688e9f" strokeWidth="2" />
      <rect x="260" y="410" width="80" height="83" fill="#38bdf8" fillOpacity=".38" />
      <ellipse cx="300" cy="410" rx="40" ry="6" fill="#0ea5e9" fillOpacity=".6" />
      <path d="M340 410H365Q382 410 382 426" fill="none" stroke="#799aab" strokeWidth="5" />
      {flowing && <path d="M382 425V455" stroke="#0ea5e9" strokeWidth="4" strokeDasharray="4 2" />}
      <path d="M355 448V498H410V448" fill="#e0f2fe" fillOpacity=".3" stroke="#688e9f" strokeWidth="2" />
      <rect x="357" y={498 - catchHeight} width="51" height={catchHeight} fill="#0ea5e9" fillOpacity=".6" />
      {[0, 10, 20, 30, 40, 50, 60].map(ml => <g key={ml}><path d={`M395 ${496 - ml * 1000 / (Math.PI * 22 ** 2)}H409`} stroke="#28516a" />{ml % 20 === 0 && <text x="412" y={500 - ml * 1000 / (Math.PI * 22 ** 2)} fontSize="10">{ml}</text>}</g>)}
      <text x="450" y="480" fill="#075985" fontSize="16">V tràn = {state.overflowMl.toFixed(1)} mL</text>
      <g onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={() => { drag.current = null; }} className="buoyancy-2d-draggable">
        <rect x="289" y={sampleTop} width="22" height={specimenHeight} rx={state.specimenId === "pebble-a" ? 9 : 2} fill={state.specimenId === "explore-wood" ? "#bc8e59" : "#647988"} stroke="#314a58" strokeWidth="2" />
        <rect x="276" y={sampleTop - 8} width="48" height={specimenHeight + 16} fill="transparent" />
      </g>
      <path d={`M327 ${sampleTop + 12}v${Math.max(12, weight * 60)}`} stroke="#dc2626" strokeWidth="3" markerEnd={`url(#${prefix}-p)`} />
      {force > 0 && <path d={`M340 ${sampleTop + 12}v-${Math.max(10, force * 110)}`} stroke="#059669" strokeWidth="3" markerEnd={`url(#${prefix}-fa)`} />}
      <text x="460" y="375" fill="#dc2626" fontSize="15">P = {weight.toFixed(3)} N</text>
      <text x="460" y="400" fill="#059669" fontSize="15">F_A = {force.toFixed(3)} N</text>
      <text x="260" y="528" fontSize="13" fill="#395968">Bình tràn Eureka</text>
      <g transform="translate(75 555)">{samples.map((item, i) => <g key={item.id} role="button" aria-label={`Chọn ${item.label} trên sơ đồ`} tabIndex={0} transform={`translate(${i * 116} 0)`} onClick={() => state.selectSpecimen(item.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); state.selectSpecimen(item.id); } }} style={{ cursor: "pointer" }}><rect width="100" height="30" rx="6" fill={item.id === state.specimenId ? "#0f766e" : "#e5f0f5"} /><text x="50" y="20" textAnchor="middle" fill={item.id === state.specimenId ? "white" : "#234959"} fontSize="13">{item.label}</text></g>)}</g>
    </svg>
  </figure>;
}
