import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { currentLevel, drawnRotorAngle, magnetTravel, type EmCue } from "./choreography";
import type { EmObservation } from "./em-evidence";
import { angleDelta, type EmDragKind, type EmManual } from "./manual";

/** Milliseconds since the cue started, updated per animation frame only while a cue runs. */
function useCueClock(cue: EmCue & { startedAt: number }) {
  const [ms, setMs] = useState(Number.POSITIVE_INFINITY);
  useEffect(() => {
    if (!cue.action) { setMs(Number.POSITIVE_INFINITY); return; }
    let frame = 0;
    const tick = () => { setMs(performance.now() - cue.startedAt); frame = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [cue.action, cue.nonce, cue.startedAt]);
  return ms;
}

/** Re-renders every animation frame while the student drags (or the apparatus settles after a drag). */
function useHandClock(state: EmManual["state"] | undefined, dragging: boolean) {
  const [, setFrame] = useState(0);
  useEffect(() => {
    if (!state?.current.active) return;
    let frame = 0;
    const tick = () => {
      setFrame((value) => value + 1);
      if (state.current.active) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state, dragging]);
}

// Coil drawn as loops between x 380 and 560; the magnet slides on the axis y = 230.
const COIL = { left: 380, right: 560, axis: 230, turns: 9 };
const MAGNET = { length: 230, height: 46, outsideRight: 352, insideRight: 470 };
const ROTOR = { x: 612, y: 230 };

function fieldPaths() {
  // Illustrative loops from N (right end) to S (left end) in the magnet's own frame.
  const half = MAGNET.length / 2;
  return [36, 70, 110].flatMap((spread) => [-1, 1].map((side) =>
    `M ${half} 0 C ${half + spread * .9} ${side * spread * .7}, ${half * .4} ${side * (spread + 26)}, 0 ${side * (spread + 26)} S ${-half - spread * .9} ${side * spread * .7}, ${-half} 0`));
}

export function EmInduction2DView({ cue, observation, restTravel, reduced, showField, pole, circuit, label, manual }: {
  cue: EmCue & { startedAt: number };
  observation: EmObservation | null;
  restTravel: number;
  reduced: boolean;
  showField: boolean;
  pole: "N" | "S";
  circuit: "CLOSED" | "OPEN";
  label: string;
  manual?: EmManual;
}) {
  const ms = useCueClock(cue);
  const svg = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  useHandClock(manual?.state, dragging);
  const hand = !cue.action && manual?.state.current.active ? manual.state.current : null;
  const travel = hand ? hand.travel : magnetTravel(cue.action, ms, reduced) ?? restTravel;
  const level = hand ? hand.level : currentLevel(cue.action, ms, observation, reduced);
  const rotor = hand || !cue.action ? manual?.state.current.rotor ?? 0 : drawnRotorAngle(cue, ms, reduced);

  /** Drag in SVG user units; a press that barely moves is left to the buttons. */
  const startDrag = (kind: EmDragKind, event: ReactPointerEvent<SVGGElement>) => {
    const matrix = svg.current?.getScreenCTM()?.inverse();
    if (manual && !manual.can[kind]) { manual.blocked(kind); return; }
    if (!manual || !matrix || !manual.start(kind)) return;
    const toSvg = (x: number, y: number) => new DOMPoint(x, y).matrixTransform(matrix);
    const start = toSvg(event.clientX, event.clientY);
    const grab = start.x - (MAGNET.outsideRight + (MAGNET.insideRight - MAGNET.outsideRight) * manual.state.current.travel);
    const angleAt = (point: DOMPoint) => Math.atan2(point.y - ROTOR.y, point.x - ROTOR.x);
    let last = angleAt(start), total = 0;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    setDragging(true);
    const move = (next: PointerEvent) => {
      const point = toSvg(next.clientX, next.clientY);
      if (kind === "magnet") manual.update((point.x - grab - MAGNET.outsideRight) / (MAGNET.insideRight - MAGNET.outsideRight));
      else {
        // SVG y points down, so a growing angle is clockwise on screen, as the drawn rotor turns.
        const angle = angleAt(point);
        total += angleDelta(last, angle);
        last = angle;
        manual.update(total);
      }
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
      manual.end();
      setDragging(false);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };
  const facing = pole === "N" ? { near: "north", far: "south" } : { near: "south", far: "north" };
  const magnetRight = MAGNET.outsideRight + (MAGNET.insideRight - MAGNET.outsideRight) * travel;
  const fields = useMemo(fieldPaths, []);
  const ledA = Math.max(0, level), ledB = Math.max(0, -level);
  const loops = Array.from({ length: COIL.turns }, (_, i) => COIL.left + 10 + i * ((COIL.right - COIL.left - 20) / (COIL.turns - 1)));
  const arrow = Math.abs(level) > .06 ? Math.sign(level) : 0;

  return <div className="em-2d-stage" data-testid="em-2d-stage">
    <svg ref={svg} viewBox="0 0 900 500" role="img" aria-label={label}>
      <defs>
        <filter id="em-led-glow"><feGaussianBlur stdDeviation="7" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <marker id="em-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className="em-2d-arrow" /></marker>
      </defs>
      {/* Bench line */}
      <path d="M60 330 H840" className="em-2d-bench" />
      {/* Series loop: coil → galvanometer → LED pair → coil. The arrow shows the current direction. */}
      <path d={`M${COIL.left} 282 V 410 H 670`} className="em-2d-wire" markerEnd={arrow > 0 ? "url(#em-arrow)" : undefined} markerStart={arrow < 0 ? "url(#em-arrow)" : undefined} />
      <path d="M730 410 H 820 V 255" className="em-2d-wire" />
      {circuit === "CLOSED"
        ? <path d={`M${COIL.right} 178 V 140 H 820 V 205`} className="em-2d-wire" />
        : <g data-testid="em-2d-open-switch">
            {/* Open switch: the blade is lifted off its contact */}
            <path d={`M${COIL.right} 178 V 140 H 690`} className="em-2d-wire" />
            <path d="M690 140 L728 114" className="em-2d-wire" />
            <path d="M736 140 H 820 V 205" className="em-2d-wire" />
            <circle cx="690" cy="140" r="5" className="em-2d-contact" />
            <circle cx="736" cy="140" r="5" className="em-2d-contact" />
          </g>}
      {/* Coil */}
      <rect x={COIL.left - 6} y={COIL.axis - 52} width={COIL.right - COIL.left + 12} height="104" rx="10" className="em-2d-bobbin" />
      {loops.map((x) => <ellipse key={x} cx={x} cy={COIL.axis} rx="9" ry="50" className="em-2d-loop" />)}
      {/* Bar magnet with illustrative field lines; draggable along the axis when an action allows it */}
      <g transform={`translate(${magnetRight - MAGNET.length / 2} ${COIL.axis})`} className={manual?.can.magnet ? "em-2d-draggable" : "em-2d-pressable"} data-testid="em-2d-magnet" onPointerDown={(event) => startDrag("magnet", event)}>
        {showField && <g className="em-2d-field" style={{ opacity: .8 }} transform={pole === "N" ? undefined : "scale(-1 1)"}>{fields.map((d) => <path key={d} d={d} />)}</g>}
        <rect x={-MAGNET.length / 2} y={-MAGNET.height / 2} width={MAGNET.length / 2} height={MAGNET.height} rx="5" className={`em-2d-${facing.far}`} />
        <rect x="0" y={-MAGNET.height / 2} width={MAGNET.length / 2} height={MAGNET.height} rx="5" className={`em-2d-${facing.near}`} />
        <text x={-MAGNET.length / 4} y="8" textAnchor="middle" className="em-2d-pole">{pole === "N" ? "S" : "N"}</text>
        <text x={MAGNET.length / 4} y="8" textAnchor="middle" className="em-2d-pole">{pole}</text>
      </g>
      {/* Generator rotor beside the coil */}
      <g transform={`translate(${ROTOR.x} ${ROTOR.y})`} className={manual?.can.crank ? "em-2d-draggable" : "em-2d-pressable"} data-testid="em-2d-rotor" onPointerDown={(event) => startDrag("crank", event)}>
        <circle r="34" className="em-2d-rotor-ring" />
        {/* Hit area and crank knob: turn the rotor by dragging around it */}
        <circle r="46" className="em-2d-hit" />
        <circle cx={Math.cos(rotor) * 40} cy={Math.sin(rotor) * 40} r="7" className="em-2d-knob" />
        <g transform={`rotate(${(rotor * 180) / Math.PI})`}>
          <rect x="-30" y="-8" width="30" height="16" rx="3" className="em-2d-north" />
          <rect x="0" y="-8" width="30" height="16" rx="3" className="em-2d-south" />
        </g>
      </g>
      {/* Galvanometer symbol with needle */}
      <g transform="translate(700 410)">
        <circle r="30" className="em-2d-meter" />
        <text y="-6" textAnchor="middle" className="em-2d-meter-label">G</text>
        <line x1="0" y1="18" x2={Math.sin(level * .6) * 26} y2={18 - Math.cos(level * .6) * 26} className="em-2d-needle" />
      </g>
      {/* Inverse-parallel LEDs: A conducts direction D1, B conducts D2 */}
      <g transform="translate(820 0)">
        <path d="M-15 205 H15 M-15 205 V218 M15 205 V218 M-15 242 V255 M15 242 V255 M-15 255 H15" className="em-2d-wire" />
        <g filter={ledA > .08 ? "url(#em-led-glow)" : undefined} style={{ opacity: .35 + .65 * Math.min(1, ledA * 1.4) }}>
          <path d="M-27 242 L-3 242 L-15 220 Z M-27 219 H-3" className="em-2d-led-a" />
        </g>
        <text x="-44" y="236" className="em-2d-small">A</text>
        <g filter={ledB > .08 ? "url(#em-led-glow)" : undefined} style={{ opacity: .35 + .65 * Math.min(1, ledB * 1.4) }}>
          <path d="M3 218 L27 218 L15 240 Z M3 241 H27" className="em-2d-led-b" />
        </g>
        <text x="34" y="236" className="em-2d-small">B</text>
      </g>
    </svg>
  </div>;
}
