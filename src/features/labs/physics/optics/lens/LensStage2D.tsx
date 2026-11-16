/**
 * FL-23 lens bench main view (2D-first): the optical bench seen from the side with a true-scale grid (1 square = 10 mm),
 * the principal axis, O, F, F′, the object and the rays. One diagram per station; all numbers also appear in the panel.
 */
import type { ReactNode } from "react";
import { RAY_VI, describeImage, formatMm, formatPower, meetPoint, specialRays, type ImageView, type RayId, type SpecialRay } from "./lens-log";

const W = 760;
const H = 340;
type Frame = { x0: number; y0: number; s: number };
const at = (f: Frame, xMm: number, yMm: number) => ({ x: f.x0 + xMm * f.s, y: f.y0 - yMm * f.s });
const RAY_COLOUR: Record<RayId, string> = { parallel: "#e0221f", centre: "#2f6fd1", focus: "#2e9d4f" };

function Grid({ frame, label = true }: { frame: Frame; label?: boolean }) {
  const step = 10 * frame.s;
  const lines: ReactNode[] = [];
  for (let x = frame.x0 % step; x <= W; x += step) lines.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={H} className={Math.abs(((x - frame.x0) / step) % 5) < 1e-6 ? "fl23l-grid-major" : "fl23l-grid"} />);
  for (let y = frame.y0 % step; y <= H; y += step) lines.push(<line key={`y${y}`} x1={0} y1={y} x2={W} y2={y} className={Math.abs(((y - frame.y0) / step) % 5) < 1e-6 ? "fl23l-grid-major" : "fl23l-grid"} />);
  return <g data-testid="lens-grid">{lines}{label && <text x={W - 8} y={H - 8} textAnchor="end" className="fl23l-small">1 ô = 10 mm</text>}</g>;
}

/** SGK symbol: a vertical line with outward arrowheads (converging) or inward ones (diverging). */
function LensSymbol({ frame, focalMm, half = 60 }: { frame: Frame; focalMm: number; half?: number }) {
  const top = at(frame, 0, half);
  const bottom = at(frame, 0, -half);
  const a = 7;
  const tip = (y: number, dir: 1 | -1) => focalMm > 0
    ? `M${top.x - a} ${y + dir * a} L${top.x} ${y} L${top.x + a} ${y + dir * a}`
    : `M${top.x - a} ${y - dir * a} L${top.x} ${y} L${top.x + a} ${y - dir * a}`;
  return <g className="fl23l-lens" data-kind={focalMm > 0 ? "converging" : "diverging"}>
    <line x1={top.x} y1={top.y} x2={bottom.x} y2={bottom.y} />
    <path d={tip(top.y, 1)} /><path d={tip(bottom.y, -1)} />
  </g>;
}

function Axis({ frame, focalMm, showFoci = true }: { frame: Frame; focalMm: number; showFoci?: boolean }) {
  const o = at(frame, 0, 0);
  const f = at(frame, -focalMm, 0);
  const f2 = at(frame, focalMm, 0);
  return <g>
    <line x1={0} y1={o.y} x2={W} y2={o.y} className="fl23l-axis" />
    <text x={8} y={o.y - 6} className="fl23l-small">Trục chính</text>
    <circle cx={o.x} cy={o.y} r={3} className="fl23l-point" /><text x={o.x + 5} y={o.y + 14} className="fl23l-label">O</text>
    {showFoci && <>
      <circle cx={f.x} cy={f.y} r={3} className="fl23l-point" /><text x={f.x - 4} y={f.y + 14} className="fl23l-label">F</text>
      <circle cx={f2.x} cy={f2.y} r={3} className="fl23l-point" /><text x={f2.x - 4} y={f2.y + 14} className="fl23l-label">F′</text>
    </>}
  </g>;
}

function Arrow({ frame, xMm, heightMm, className, label }: { frame: Frame; xMm: number; heightMm: number; className: string; label: string }) {
  const base = at(frame, xMm, 0);
  const tip = at(frame, xMm, heightMm);
  const dir = heightMm >= 0 ? 1 : -1;
  return <g className={className}>
    <line x1={base.x} y1={base.y} x2={tip.x} y2={tip.y} />
    <path d={`M${tip.x - 5} ${tip.y + dir * 8} L${tip.x} ${tip.y} L${tip.x + 5} ${tip.y + dir * 8}`} />
    <text x={tip.x + 6} y={tip.y + (dir > 0 ? -2 : 12)} className="fl23l-label">{label}</text>
  </g>;
}

/** Incoming part, outgoing part to the edge, and (for a virtual image) the dashed backward extension to the image point. */
function Ray({ frame, ray, revealed, virtualTo }: { frame: Frame; ray: SpecialRay; revealed: boolean; virtualTo: { x: number; y: number } | null }) {
  const a = at(frame, ray.from.x, ray.from.y);
  const b = at(frame, ray.atLens.x, ray.atLens.y);
  const colour = RAY_COLOUR[ray.id];
  let out: ReactNode = null;
  if (revealed && ray.out) {
    const t = 2000;
    const end = at(frame, ray.atLens.x + ray.out.x * t, ray.atLens.y + ray.out.y * t);
    const back = virtualTo ? at(frame, virtualTo.x, virtualTo.y) : null;
    out = <>
      <line x1={b.x} y1={b.y} x2={end.x} y2={end.y} style={{ stroke: colour }} className="fl23l-ray" data-part="out" />
      {back && <line x1={b.x} y1={b.y} x2={back.x} y2={back.y} style={{ stroke: colour }} className="fl23l-ray-ext" />}
    </>;
  }
  return <g data-ray={ray.id}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} style={{ stroke: colour }} className="fl23l-ray" />{out}</g>;
}

function Frame2D({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return <svg viewBox={`0 0 ${W} ${H}`} className="fl23l-svg" role="img" aria-label={label} data-testid={testId}>
    <defs><clipPath id="fl23l-clip"><rect x={0} y={0} width={W} height={H} /></clipPath></defs>
    <g clipPath="url(#fl23l-clip)">{children}</g>
  </svg>;
}

/** Station 1: the three special rays from an object at 2.5 |f|; outgoing parts hidden until the student predicts. */
export function RaysDiagram({ focalMm, revealed }: { focalMm: number; revealed: boolean }) {
  const frame: Frame = { x0: 430, y0: 170, s: 1 };
  const d = Math.round(2.5 * Math.abs(focalMm));
  const h = 30;
  const rays = specialRays(focalMm, d, h);
  const image = meetPoint(rays[0], rays[1]);
  const virtual = image !== null && image.x < 0;
  return <Frame2D label={`Thấu kính ${focalMm > 0 ? "hội tụ" : "phân kì"}, tiêu cự ${formatMm(Math.abs(focalMm))}; ba tia đặc biệt ${revealed ? "đã hiện" : "đang ẩn phần tia ló"}`}>
    <Grid frame={frame} />
    <Axis frame={frame} focalMm={focalMm} />
    <LensSymbol frame={frame} focalMm={focalMm} />
    <text x={frame.x0 + 8} y={frame.y0 - 64} className="fl23l-small">f = {formatMm(Math.abs(focalMm))}</text>
    <Arrow frame={frame} xMm={-d} heightMm={h} className="fl23l-object" label="B" />
    {rays.map((ray) => <Ray key={ray.id} frame={frame} ray={ray} revealed={revealed} virtualTo={virtual ? image : null} />)}
    {rays.map((ray, k) => <text key={ray.id} x={12} y={22 + k * 16} className="fl23l-small" style={{ fill: RAY_COLOUR[ray.id] }}>● {RAY_VI[ray.id]}</text>)}
  </Frame2D>;
}

/** Station 2: object AB at d, the rays the student turned on and, with two of them, the image A′B′ where they (or their extensions) meet. */
export function ImageDiagram({ focalMm, distanceMm, heightMm, image, rays: shown, formula }: { focalMm: number; distanceMm: number; heightMm: number; image: ImageView; rays: RayId[]; formula: boolean }) {
  const frame: Frame = { x0: 430, y0: 170, s: 1 };
  const rays = specialRays(focalMm, distanceMm, heightMm).filter((ray) => shown.includes(ray.id));
  const constructed = rays.length >= 2;
  const imagePoint = image.kind === "image" ? { x: image.distanceMm, y: image.heightMm } : null;
  const virtual = image.kind === "image" && !image.real;
  const offGrid = imagePoint !== null && (at(frame, imagePoint.x, 0).x > W || at(frame, imagePoint.x, 0).x < 0 || Math.abs(imagePoint.y) * frame.s > frame.y0);
  return <Frame2D label={`Vật cách thấu kính ${formatMm(distanceMm)}; ${constructed ? describeImage(image) : "chọn hai tia để dựng ảnh"}`} testId="lens-image-diagram">
    <Grid frame={frame} />
    <Axis frame={frame} focalMm={focalMm} />
    <LensSymbol frame={frame} focalMm={focalMm} />
    <Arrow frame={frame} xMm={-distanceMm} heightMm={heightMm} className="fl23l-object" label="B" />
    <text x={at(frame, -distanceMm, 0).x - 4} y={frame.y0 + 14} className="fl23l-label">A</text>
    {rays.map((ray) => <Ray key={ray.id} frame={frame} ray={ray} revealed virtualTo={virtual && constructed ? imagePoint : null} />)}
    {constructed && imagePoint && !offGrid && <Arrow frame={frame} xMm={imagePoint.x} heightMm={imagePoint.y} className={virtual ? "fl23l-image-virtual" : "fl23l-image"} label="B′" />}
    {constructed && image.kind === "none" && <text x={frame.x0 + 12} y={34} className="fl23l-note">Vật ở tiêu điểm: các tia ló song song, không có ảnh</text>}
    {constructed && offGrid && <text x={frame.x0 + 12} y={34} className="fl23l-note">Ảnh ở rất xa, ra ngoài lưới</text>}
    {formula && <text x={12} y={H - 10} className="fl23l-small">1/f = 1/d + 1/d′</text>}
  </Frame2D>;
}

/** Station 3: object and screen symmetric about the lens; the image on the screen is sharp only at d = 2f. Focal points hidden. */
export function FocalDiagram({ distanceMm, blurMm, magnification, lensLabel }: { distanceMm: number; blurMm: number; magnification: number | null; lensLabel: string }) {
  const frame: Frame = { x0: 380, y0: 190, s: 0.85 };
  const sharp = blurMm < 0.5;
  const screen = at(frame, distanceMm, 0);
  // Blurred image: drawn as a soft band whose width grows with the blur radius; inverted, as tall as |k|·h when it forms.
  const h = 20;
  const imageHeight = magnification !== null && Number.isFinite(blurMm) ? magnification * h : null;
  const blurPx = Number.isFinite(blurMm) ? Math.min(40, blurMm * frame.s * 3) : 40;
  return <Frame2D label={`Vật và màn cách thấu kính ${formatMm(distanceMm)} mỗi bên, khoảng cách vật – màn ${formatMm(2 * distanceMm)}; ảnh trên màn ${sharp ? "rõ nét" : "nhoè"}`} testId="lens-focal-diagram">
    <Grid frame={frame} />
    <Axis frame={frame} focalMm={100} showFoci={false} />
    <LensSymbol frame={frame} focalMm={1} half={50} />
    <text x={frame.x0 + 8} y={frame.y0 - 56} className="fl23l-small">{lensLabel} (chưa biết f)</text>
    <Arrow frame={frame} xMm={-distanceMm} heightMm={h} className="fl23l-object" label="Vật" />
    <rect x={screen.x} y={frame.y0 - 70} width={6} height={140} className="fl23l-screen" />
    {imageHeight !== null && <g className="fl23l-blur" style={{ opacity: sharp ? 1 : Math.max(0.25, 1 - blurPx / 50) }}>
      <line x1={screen.x - 2} y1={frame.y0} x2={screen.x - 2} y2={at(frame, 0, imageHeight).y} style={{ strokeWidth: 3 + blurPx }} />
    </g>}
    {imageHeight === null && <text x={screen.x - 8} y={frame.y0 - 80} textAnchor="end" className="fl23l-note">Không hứng được ảnh</text>}
    <line x1={at(frame, -distanceMm, 0).x} y1={frame.y0 + 40} x2={screen.x} y2={frame.y0 + 40} className="fl23l-measure" />
    <text x={frame.x0} y={frame.y0 + 56} textAnchor="middle" className="fl23l-label">L = {formatMm(2 * distanceMm)}</text>
    <text x={screen.x - 8} y={frame.y0 + 84} textAnchor="end" className={sharp ? "fl23l-ok" : "fl23l-note"}>{sharp ? "Ảnh rõ nét" : "Ảnh nhoè"}</text>
  </Frame2D>;
}

/** Station 4: the magnifier close to the object, the virtual image and a round "view through the lens". */
export function MagnifierDiagram({ focalMm, distanceMm, image, power }: { focalMm: number; distanceMm: number; image: ImageView; power: number }) {
  const frame: Frame = { x0: 470, y0: 190, s: 2 };
  const h = 10;
  const virtual = image.kind === "image" && !image.real;
  const k = image.kind === "image" ? image.magnification : null;
  return <Frame2D label={`Kính lúp ${formatPower(power)} cách vật ${formatMm(distanceMm)}; ${image.kind === "image" ? describeImage(image) : "không có ảnh"}`} testId="lens-magnifier-diagram">
    <Grid frame={frame} label={false} />
    <Axis frame={frame} focalMm={focalMm} />
    <LensSymbol frame={frame} focalMm={focalMm} half={35} />
    <Arrow frame={frame} xMm={-distanceMm} heightMm={h} className="fl23l-object" label="Vật" />
    {virtual && image.kind === "image" && <Arrow frame={frame} xMm={image.distanceMm} heightMm={image.heightMm * h} className="fl23l-image-virtual" label="Ảnh ảo" />}
    <g transform={`translate(${W - 90} 92)`} data-testid="lens-view">
      <circle r={55} className="fl23l-view" />
      <text y={-62} textAnchor="middle" className="fl23l-small">Nhìn qua kính</text>
      {virtual && k !== null ? <g transform={`scale(${Math.min(3.2, k)})`}><path d="M-4 10 L-4 -10 L6 -10 M-4 0 L4 0" className="fl23l-letter" /></g>
        : <text y={4} textAnchor="middle" className="fl23l-note">Không thấy ảnh phóng to</text>}
    </g>
    <text x={12} y={22} className="fl23l-label">G = {formatPower(power)}</text>
  </Frame2D>;
}
