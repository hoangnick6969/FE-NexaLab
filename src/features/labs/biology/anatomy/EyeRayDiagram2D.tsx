/**
 * FL-16 2D view (and no-WebGL fallback): a sagittal section of the eye with the ray fan of the display optics
 * (`kit/optics.ts`, the same functions the 3D rays use). Light comes from the left; the object is drawn at 25 mm
 * when it is nearer than that, not to scale. Every number shown is also in the readout of the control panel.
 */
import { EQUIVALENT_SURFACE_Y_MM, paraxialFan, paraxialFocus, type Vec2 } from "./kit/optics";

const K = 13; // px per mm
const OX = 380; // x of the equivalent refracting surface
const OY = 190; // optical axis
const toScreen = ([x, y]: Vec2): [number, number] => [OX + (EQUIVALENT_SURFACE_Y_MM - y) * K, OY - x * K];
const RAY_COLORS = ["#1d4ed8", "#b45309", "#1d4ed8"];

export function EyeRayDiagram2D({ axialMm, objectDistanceM, providedPowerD, lensPowerD, glassesPowerD, inFocus, label }: {
  axialMm: number;
  objectDistanceM: number | null;
  providedPowerD: number;
  lensPowerD: number;
  glassesPowerD: number;
  inFocus: boolean;
  label: string;
}) {
  const fan = paraxialFan({ axialMm, objectDistanceM, providedPowerD });
  const focus = inFocus ? null : paraxialFocus({ objectDistanceM, providedPowerD });
  const retinaX = OX + axialMm * K;
  const globeCx = OX + (axialMm / 2 - 0.4) * K, globeRx = (axialMm / 2 + 1.2) * K, globeRy = 12 * K;
  const lensCx = OX + 4.2 * K, lensRx = (1.7 + 0.12 * (lensPowerD - 16)) * K, lensRy = 4.6 * K;
  const objectX = toScreen(fan[1][0])[0];
  const imageScreen = toScreen(fan[1][2]);
  const focusScreen = focus ? toScreen(focus) : null;
  return <figure className="eye-diagram" data-testid="eye-diagram-2d">
    <svg viewBox="0 0 820 380" role="img" aria-label={label}>
      <rect className="eye-diagram-bg" x="0" y="0" width="820" height="380" rx="14" />
      <line className="eye-axis" x1="20" y1={OY} x2="800" y2={OY} />
      {/* Globe, sclera and retina. */}
      <ellipse className="eye-globe" cx={globeCx} cy={OY} rx={globeRx} ry={globeRy} />
      <path className="eye-retina" d={`M ${retinaX - 30} ${OY - 125} Q ${retinaX + 8} ${OY} ${retinaX - 30} ${OY + 125}`} />
      <path className="eye-cornea" d={`M ${OX - 4} ${OY - 80} Q ${OX - 2.6 * K} ${OY} ${OX - 4} ${OY + 80}`} />
      <rect className="eye-iris" x={OX + 2.6 * K} y={OY - 92} width="6" height="58" rx="3" />
      <rect className="eye-iris" x={OX + 2.6 * K} y={OY + 34} width="6" height="58" rx="3" />
      <ellipse className="eye-lens" cx={lensCx} cy={OY} rx={lensRx} ry={lensRy} />
      <text className="eye-tag" x={lensCx} y={OY + 118} textAnchor="middle">Thể thủy tinh</text>
      <text className="eye-tag" x={OX - 2.4 * K} y={OY - 92} textAnchor="middle">Giác mạc</text>
      <text className="eye-tag" x={retinaX - 24} y={OY + 150} textAnchor="middle">Võng mạc</text>
      <text className="eye-tag" x={retinaX + 18} y={OY - 6} textAnchor="start">Trục {axialMm.toFixed(1).replace(".", ",")} mm</text>
      {/* Glasses in front of the eye when set. */}
      {glassesPowerD !== 0 && <g className="eye-glasses" data-kind={glassesPowerD < 0 ? "concave" : "convex"}>
        <path d={glassesPowerD < 0
          ? `M ${OX - 15 * K} ${OY - 70} q 10 70 0 140 h 16 q -10 -70 0 -140 z`
          : `M ${OX - 14 * K} ${OY - 70} q -12 70 0 140 q 12 -70 0 -140 z`} />
        <text className="eye-tag" x={OX - 14.5 * K} y={OY - 80} textAnchor="middle">Kính {glassesPowerD > 0 ? "+" : ""}{glassesPowerD.toFixed(2).replace(".", ",")} D</text>
      </g>}
      {/* Object: an arrow for a near object, parallel rays for infinity. */}
      {objectDistanceM !== null
        ? <g className="eye-object"><line x1={objectX} y1={OY} x2={objectX} y2={OY - 3 * K} /><path d={`M ${objectX - 6} ${OY - 3 * K + 8} L ${objectX} ${OY - 3 * K - 2} L ${objectX + 6} ${OY - 3 * K + 8}`} />
            <text className="eye-tag" x={objectX - 8} y={OY + 26} textAnchor="start">Vật ở {Math.round(objectDistanceM * 100)} cm</text>
            <text className="eye-tag eye-tag-muted" x={objectX - 8} y={OY + 44} textAnchor="start">(không theo tỉ lệ)</text></g>
        : <text className="eye-tag" x="30" y={OY - 40} textAnchor="start">Vật ở rất xa (tia song song)</text>}
      {fan.map((ray, index) => <polyline key={index} className="eye-ray" stroke={RAY_COLORS[index]} points={ray.map((point) => toScreen(point).join(",")).join(" ")} />)}
      <circle className="eye-image" data-in-focus={inFocus} cx={imageScreen[0]} cy={imageScreen[1]} r="6" />
      {focusScreen && <g className="eye-focus"><circle cx={focusScreen[0]} cy={focusScreen[1]} r="7" /><circle cx={focusScreen[0]} cy={focusScreen[1]} r="13" /></g>}
    </svg>
    <figcaption className="eye-diagram-legend">
      <span data-tone="ray">Tia sáng</span><span data-tone="focus">Điểm hội tụ (khi lệch võng mạc)</span><span data-tone="sharp">Ảnh rõ trên võng mạc</span>
    </figcaption>
  </figure>;
}
