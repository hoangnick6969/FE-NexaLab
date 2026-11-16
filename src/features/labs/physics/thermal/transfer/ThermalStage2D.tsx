/** FL-08 2D diagrams: the same station state as the 3D bench, drawn as SVG. */
import { FLAME_VI, WAX_VI, formatTenthsC, materialVi, type RodView, type TubeView } from "./transfer-log";

const W = 360;
const H = 260;

export function Conduction2D({ rods, lengthMm, heated }: { rods: RodView[]; lengthMm: number; heated: boolean }) {
  const scale = 280 / lengthMm;
  const label = rods.map((rod) => `${materialVi(rod.material)} ${rod.pins.filter((pin) => pin.dropped).length} đinh rơi`).join(", ");
  return <svg viewBox={`0 0 ${W} ${H}`} className="fl08-svg" role="img" aria-label={`Dẫn nhiệt: ${label}`}>
    {rods.map((rod, index) => {
      const y = 50 + index * 70;
      return <g key={index} data-rod={rod.material}>
        <text x={40} y={y - 14} className="fl08-label fl08-start">{materialVi(rod.material)}</text>
        <rect x={40} y={y - 4} width={280} height={8} rx={4} className={`fl08-rod fl08-rod-${rod.material}`} />
        <text x={30} y={y + 4} className="fl08-label">A</text>
        {heated && <path d={`M 44 ${y + 32} Q 37 ${y + 21} 44 ${y + 9} Q 51 ${y + 21} 44 ${y + 32} Z`} className="fl08-flame" />}
        {rod.pins.map((pin) => {
          const x = 40 + pin.positionMm * scale;
          return <g key={pin.id} data-pin={pin.id} data-dropped={pin.dropped}>
            {pin.dropped
              ? <line x1={x - 7} x2={x + 7} y1={y + 32} y2={y + 32} className="fl08-pin fl08-pin-down" />
              : <><circle cx={x} cy={y + 7} r={3.5} className="fl08-wax" /><line x1={x} x2={x} y1={y + 10} y2={y + 26} className="fl08-pin" /></>}
            <text x={x} y={y - 8} className="fl08-label fl08-small">{pin.id}</text>
          </g>;
        })}
      </g>;
    })}
  </svg>;
}

export function Convection2D({ tubes }: { tubes: TubeView[] }) {
  const label = tubes.map((tube) => `ống (${tube.id}) sáp ${WAX_VI[tube.wax]}${tube.flame ? `, đun ${FLAME_VI[tube.flame]}` : ""}, ${tube.melted ? "đã chảy" : "chưa chảy"}`).join("; ");
  return <svg viewBox={`0 0 ${W} ${H}`} className="fl08-svg" role="img" aria-label={`Đối lưu: ${label}`}>
    {tubes.map((tube, index) => {
      const x0 = 70 + index * 170;
      // Tube tilted up to the right: bottom at (x0, 200), mouth at (x0 + 90, 60).
      const at = (t: number) => [x0 + 90 * t, 200 - 140 * t] as const;
      const [wx, wy] = at(tube.wax === "bottom" ? 0.05 : 0.93);
      const [fx, fy] = tube.flame ? at(tube.flame === "bottom" ? 0.04 : 0.85) : [0, 0];
      return <g key={tube.id} data-tube={tube.id} data-melted={tube.melted}>
        <line x1={x0} y1={200} x2={x0 + 90} y2={60} className="fl08-tube" />
        <line x1={x0} y1={200} x2={x0 + 90} y2={60} className="fl08-water" />
        {tube.melted ? <ellipse cx={wx} cy={wy} rx={9} ry={3} className="fl08-wax" /> : <circle cx={wx} cy={wy} r={6} className="fl08-wax" />}
        {tube.flame && <path d={`M ${fx} ${fy + 34} Q ${fx - 8} ${fy + 20} ${fx} ${fy + 8} Q ${fx + 8} ${fy + 20} ${fx} ${fy + 34} Z`} className="fl08-flame" />}
        <text x={x0 + 45} y={245} className="fl08-label">({tube.id})</text>
      </g>;
    })}
  </svg>;
}

export function Radiation2D({ lampOn, screen, surface, tenthsC }: { lampOn: boolean; screen: boolean; surface: "black" | "silver"; tenthsC: number }) {
  return <svg viewBox={`0 0 ${W} ${H}`} className="fl08-svg" role="img" aria-label={`Bức xạ: đèn ${lampOn ? "bật" : "tắt"}, ${screen ? "có tấm gỗ chắn" : "không chắn"}, bình ${surface === "black" ? "phủ đen" : "tráng bạc"}, nhiệt kế ${formatTenthsC(tenthsC)}`}>
    <circle cx={70} cy={120} r={26} className={lampOn ? "fl08-bulb fl08-on" : "fl08-bulb"} />
    {lampOn && !screen && [-24, -8, 8, 24].map((dy) => <line key={dy} x1={100} y1={120 + dy * 0.4} x2={236} y2={120 + dy} className="fl08-ray" />)}
    {lampOn && screen && [-24, -8, 8, 24].map((dy) => <line key={dy} x1={100} y1={120 + dy * 0.4} x2={150} y2={120 + dy * 0.7} className="fl08-ray" />)}
    {screen && <rect x={152} y={40} width={14} height={170} className="fl08-screen" />}
    <circle cx={270} cy={140} r={44} className={`fl08-flask fl08-${surface}`} />
    <rect x={265} y={50} width={10} height={100} rx={5} className="fl08-thermo" />
    <text x={270} y={232} className="fl08-label">{formatTenthsC(tenthsC)}</text>
  </svg>;
}
