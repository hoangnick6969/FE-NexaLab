/**
 * FL-26 k8-garden bench, 2D: the P generation (two potted pea plants), the gametes G each parent makes and the F1
 * offspring, one plant per Punnett cell. Flower colour stands for the phenotype (illustrative trait: purple is
 * dominant, white recessive). Every value drawn here also appears in the DOM (Punnett board and readout).
 */
import { useRef, type ReactNode } from "react";
import { potTag, type GardenHandlers } from "./garden-interaction";

export const isDominant = (genotype: string) => genotype[0] === genotype[0].toUpperCase();
export const phenotypeVi = (genotype: string) => (isDominant(genotype) ? "hoa tím (trội)" : "hoa trắng (lặn)");

function PeaPlant({ x, y, genotype, scale = 1, hidden = false }: { x: number; y: number; genotype: string | null; scale?: number; hidden?: boolean }) {
  const tone = hidden || !genotype ? "unknown" : isDominant(genotype) ? "dominant" : "recessive";
  return <g transform={`translate(${x} ${y}) scale(${scale})`} className="mendel-plant" data-tone={tone}>
    <path className="mendel-pot" d="M-34 0 L34 0 L26 46 L-26 46 Z" />
    <rect className="mendel-pot-rim" x="-38" y="-8" width="76" height="12" rx="4" />
    <path className="mendel-stem" d="M0 -8 C -4 -40 6 -70 0 -104" />
    <path className="mendel-leaf" d="M0 -40 C -26 -50 -34 -34 -30 -26 C -18 -26 -8 -32 0 -40 Z" />
    <path className="mendel-leaf" d="M2 -62 C 28 -74 36 -56 32 -48 C 20 -48 10 -54 2 -62 Z" />
    {tone === "unknown"
      ? <g className="mendel-bud"><circle cx="0" cy="-112" r="15" /><text x="0" y="-106" textAnchor="middle">?</text></g>
      : <g className="mendel-flower">
          {[0, 72, 144, 216, 288].map((angle) => <ellipse key={angle} cx="0" cy="-124" rx="9" ry="15" transform={`rotate(${angle} 0 -112)`} />)}
          <circle className="mendel-flower-heart" cx="0" cy="-112" r="6" />
        </g>}
  </g>;
}

function Gamete({ x, y, allele, parent, handlers }: { x: number; y: number; allele: string; parent?: 0 | 1; handlers?: GardenHandlers }) {
  const draggable = parent !== undefined && handlers?.onGameteDown;
  const carried = draggable && handlers?.carrying?.parent === parent && handlers.carrying.allele === allele;
  return <g transform={`translate(${x} ${y})`} className={"mendel-gamete" + (draggable ? " is-draggable" : "")} data-allele={isDominant(allele) ? "dominant" : "recessive"}
    data-carried={carried || undefined} data-testid={draggable ? `gamete-2d-${parent}-${allele}` : undefined}
    role={draggable ? "button" : undefined} tabIndex={draggable ? 0 : undefined}
    aria-label={draggable ? `Giao tử ${allele} của ${parent === 0 ? "bố" : "mẹ"}: nhấn giữ rồi thả vào một cây F1` : undefined}
    onPointerDown={draggable ? (event) => handlers!.onGameteDown!(parent!, allele, event) : undefined}>
    <circle r="17" />
    <text y="6" textAnchor="middle">{allele}</text>
  </g>;
}

const Label = ({ x, y, children, anchor = "middle", className = "mendel-label" }: { x: number; y: number; children: ReactNode; anchor?: "start" | "middle" | "end"; className?: string }) =>
  <text className={className} x={x} y={y} textAnchor={anchor}>{children}</text>;

export function MendelGardenScene({ parents, gametes, punnett, revealed, handlers = {} }: {
  parents: [string, string];
  gametes: [string[], string[]];
  punnett: string[][];
  /** Keys `row:col` of the Punnett cells already revealed; the matching F1 plant shows its flower. */
  revealed: ReadonlySet<string>;
  /** Explore direct manipulation (see `garden-interaction.ts`). */
  handlers?: GardenHandlers;
}) {
  const offspring = punnett.flatMap((row, r) => row.map((genotype, c) => ({ key: `${r}:${c}`, genotype, r, c })));
  const dropped = useRef(false);
  const parentButton = (index: 0 | 1) => handlers.onParent ? {
    className: "mendel-hit", role: "button", tabIndex: 0, "data-testid": `parent-2d-${index}`,
    "aria-label": `${index === 0 ? "Bố" : "Mẹ"} ${parents[index]}: bấm để đổi kiểu gen`,
    onClick: () => handlers.onParent!(index),
    onKeyDown: (event: { key: string; preventDefault: () => void }) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handlers.onParent!(index); } },
  } : {};
  const potButton = (key: string, label: string) => handlers.onPot ? {
    className: "mendel-hit", role: "button", tabIndex: 0, "data-testid": `pot-2d-${key}`, "aria-label": label,
    onPointerUp: () => { if (handlers.carrying) { dropped.current = true; window.setTimeout(() => { dropped.current = false; }, 0); handlers.onPotUp?.(key); } },
    onClick: () => { if (dropped.current) { dropped.current = false; return; } handlers.onPot!(key); },
    onKeyDown: (event: { key: string; preventDefault: () => void }) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handlers.onPot!(key); } },
  } : {};
  const label = `Vườn thực nghiệm: P ${parents[0]} × ${parents[1]}; giao tử bố ${gametes[0].join(", ")}, giao tử mẹ ${gametes[1].join(", ")}; F1 đã lật ${revealed.size}/${offspring.length} cây.`;
  return <figure className="mendel-garden" data-testid="mendel-garden">
    <svg viewBox="0 0 680 470" role="img" aria-label={label}>
      <rect className="mendel-sky" x="0" y="0" width="680" height="470" rx="14" />
      <rect className="mendel-soil" x="0" y="430" width="680" height="40" />

      <Label x={24} y={36} anchor="start" className="mendel-row-label">P</Label>
      <Label x={24} y={56} anchor="start" className="mendel-row-hint">Bố mẹ</Label>
      <g {...parentButton(0)}><rect className="mendel-hit-area" x={160} y={30} width={100} height={182} rx={12} /><PeaPlant x={210} y={160} genotype={parents[0]} /></g>
      <g {...parentButton(1)}><rect className="mendel-hit-area" x={420} y={30} width={100} height={182} rx={12} /><PeaPlant x={470} y={160} genotype={parents[1]} /></g>
      <Label x={340} y={110} className="mendel-cross">×</Label>
      <Label x={210} y={228} className="mendel-genotype">{parents[0]}</Label>
      <Label x={470} y={228} className="mendel-genotype">{parents[1]}</Label>
      <Label x={210} y={246}>Bố · {phenotypeVi(parents[0])}</Label>
      <Label x={470} y={246}>Mẹ · {phenotypeVi(parents[1])}</Label>

      <Label x={24} y={292} anchor="start" className="mendel-row-label">G</Label>
      <Label x={24} y={312} anchor="start" className="mendel-row-hint">Giao tử</Label>
      {gametes[0].map((allele, index) => <g key={`f${index}`}>
        <line className="mendel-link" x1={210} y1={252} x2={180 + index * 60} y2={280} />
        <Gamete x={180 + index * 60} y={298} allele={allele} parent={0} handlers={handlers} />
      </g>)}
      {gametes[1].map((allele, index) => <g key={`m${index}`}>
        <line className="mendel-link" x1={470} y1={252} x2={440 + index * 60} y2={280} />
        <Gamete x={440 + index * 60} y={298} allele={allele} parent={1} handlers={handlers} />
      </g>)}

      <Label x={24} y={360} anchor="start" className="mendel-row-label">F1</Label>
      <Label x={24} y={380} anchor="start" className="mendel-row-hint">Đời con</Label>
      {offspring.map(({ key, genotype, r, c }, index) => {
        const shown = revealed.has(key);
        const x = 190 + index * 100;
        const tag = potTag(shown, genotype, handlers.drops?.[key], [gametes[0][r], gametes[1][c]]);
        return <g key={key} {...potButton(key, shown ? `Cây F1 ô ${r + 1}-${c + 1}: ${genotype}` : `Chậu F1 ô ${r + 1}-${c + 1}: bấm để mở, hoặc thả giao tử vào`)}
          data-drop={handlers.carrying && !shown ? "ready" : undefined}>
          {handlers.onPot && <rect className="mendel-hit-area" x={x - 42} y={340} width={84} height={126} rx={12} />}
          <PeaPlant x={x} y={432} genotype={shown ? genotype : null} scale={0.62} hidden={!shown} />
          <Label x={x} y={458} className="mendel-genotype-small">{tag}</Label>
        </g>;
      })}
    </svg>
    <figcaption className="mendel-caption">Tính trạng minh hoạ: màu hoa đậu Hà Lan, tím trội hoàn toàn so với trắng. Mỗi cây F1 ứng với một ô của bảng Punnett.</figcaption>
  </figure>;
}
