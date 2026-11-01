import type { AminoAcid, Base } from "../k7-codons";
import { AMINO_GROUP_COLORS, BASE_COLORS, BASE_INK, STRAND_TINTS, aminoGroup, type StrandTint } from "../k7-palette";

const SLOT = 28;
const ROW = 46;
const PAD = 56;

export type DiagramTrack = {
  id: string;
  /** Row number from the top (fractional rows allowed). */
  row: number;
  /** First slot this strand occupies. */
  start?: number;
  bases: readonly (Base | null)[];
  tint: StrandTint;
  ends?: readonly [string, string];
  label?: string;
  /** Slot indices (within this strand) to ring. */
  marks?: readonly number[];
  /** Slot (within this strand) awaiting the learner. */
  active?: number | null;
};
export type DiagramPairing = { upper: string; lower: string; from: number; to: number };
export type DiagramBox = { from: number; to: number; rowTop: number; rowBottom: number; label: string; tone: "enzyme" | "ribosome" };
export type DiagramBracket = { track: string; from: number; to: number; label: string };
export type DiagramChain = { slot: number; row: number; residues: readonly AminoAcid[] };

/**
 * Read-only 2D view of a molecular scene (catalog Dual-View "Đọc"): strands
 * as lettered slots with 5'/3' ends, hydrogen-bond ticks (2 for A–T/A–U,
 * 3 for G–C), enzyme or ribosome footprints, codon brackets and a residue
 * chain. Drawn from the same state as the 3D scene; the learner never draws.
 */
export function SequenceDiagram2D({ title, slots, rows, tracks, pairings = [], boxes = [], brackets = [], chains = [] }: {
  title: string;
  slots: number;
  rows: number;
  tracks: readonly DiagramTrack[];
  pairings?: readonly DiagramPairing[];
  boxes?: readonly DiagramBox[];
  brackets?: readonly DiagramBracket[];
  chains?: readonly DiagramChain[];
}) {
  const width = PAD * 2 + slots * SLOT;
  const height = PAD + rows * ROW + 24;
  const x = (slot: number) => PAD + slot * SLOT + SLOT / 2;
  const y = (row: number) => PAD / 2 + row * ROW + ROW / 2;
  const byId = new Map(tracks.map((track) => [track.id, track]));

  return <svg className="k7-2d" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} data-testid="k7-diagram-2d">
    {boxes.map((box, index) => {
      const x0 = PAD + box.from * SLOT - 8, x1 = PAD + (box.to + 1) * SLOT + 8;
      const y0 = y(box.rowTop) - ROW / 2 - 6, y1 = y(box.rowBottom) + ROW / 2 + 6;
      return <g key={`box-${index}`} className={`k7-2d-box is-${box.tone}`}>
        <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={box.tone === "ribosome" ? 22 : 28} />
        <text x={(x0 + x1) / 2} y={y0 - 8} textAnchor="middle" className="k7-2d-caption">{box.label}</text>
      </g>;
    })}

    {pairings.map((pairing, index) => {
      const upper = byId.get(pairing.upper), lower = byId.get(pairing.lower);
      if (!upper || !lower) return null;
      const ticks = [];
      for (let slot = pairing.from; slot <= pairing.to; slot++) {
        const a = upper.bases[slot - (upper.start ?? 0)], b = lower.bases[slot - (lower.start ?? 0)];
        if (!a || !b) continue;
        const count = a === "G" || a === "C" ? 3 : 2;
        const top = y(upper.row) + 13, bottom = y(lower.row) - 13;
        for (let k = 0; k < count; k++) {
          const dx = (k - (count - 1) / 2) * 5;
          ticks.push(<line key={`${slot}-${k}`} x1={x(slot) + dx} x2={x(slot) + dx} y1={top} y2={bottom} className="k7-2d-hbond" />);
        }
      }
      return <g key={`pair-${index}`}>{ticks}</g>;
    })}

    {tracks.map((track) => {
      const start = track.start ?? 0;
      const present = track.bases.map((base, index) => (base ? index : -1)).filter((index) => index >= 0);
      const first = present[0], last = present[present.length - 1];
      return <g key={track.id}>
        {track.label && <text x={PAD - 10} y={y(track.row) - 18} className="k7-2d-caption" textAnchor="start">{track.label}</text>}
        {first !== undefined && <line x1={x(start + first) - 10} x2={x(start + last) + 10} y1={y(track.row)} y2={y(track.row)} stroke={STRAND_TINTS[track.tint].phosphate} strokeWidth={6} strokeLinecap="round" opacity={0.85} />}
        {track.ends && first !== undefined && <>
          <text x={x(start + first) - 18} y={y(track.row) + 5} textAnchor="end" className="k7-2d-end">{track.ends[0]}</text>
          <text x={x(start + last) + 18} y={y(track.row) + 5} textAnchor="start" className="k7-2d-end">{track.ends[1]}</text>
        </>}
        {track.bases.map((base, index) => {
          const cx = x(start + index), cy = y(track.row);
          const marked = track.marks?.includes(index);
          const active = track.active === index;
          return <g key={index}>
            {base
              ? <><rect x={cx - 11} y={cy - 11} width={22} height={22} rx={6} fill={BASE_COLORS[base]} stroke={STRAND_TINTS[track.tint].sugar} strokeWidth={2} />
                <text x={cx} y={cy + 5} textAnchor="middle" className="k7-2d-letter" fill={BASE_INK[base]}>{base}</text></>
              : active ? <rect x={cx - 11} y={cy - 11} width={22} height={22} rx={6} className="k7-2d-slot" /> : null}
            {(marked || active) && <rect x={cx - 15} y={cy - 15} width={30} height={30} rx={9} className={active ? "k7-2d-active" : "k7-2d-mark"} />}
          </g>;
        })}
      </g>;
    })}

    {brackets.map((bracket, index) => {
      const track = byId.get(bracket.track);
      if (!track) return null;
      const start = track.start ?? 0;
      const x0 = x(start + bracket.from) - 12, x1 = x(start + bracket.to) + 12, top = y(track.row) + 18;
      return <g key={`bracket-${index}`} className="k7-2d-bracket">
        <path d={`M${x0} ${top} v6 H${x1} v-6`} />
        <text x={(x0 + x1) / 2} y={top + 22} textAnchor="middle" className="k7-2d-caption">{bracket.label}</text>
      </g>;
    })}

    {chains.map((chain, index) => <g key={`chain-${index}`}>
      {/* Newest residue at the anchor, the N-terminus farthest away. */}
      {[...chain.residues].reverse().map((residue, k) => {
        const cx = x(chain.slot) - k * 34 * 0.7 - 8, cy = y(chain.row) - k * 34 * 0.55;
        const next = k + 1 < chain.residues.length;
        return <g key={k}>
          {next && <line x1={cx} y1={cy} x2={cx - 34 * 0.7} y2={cy - 34 * 0.55} className="k7-2d-peptide" />}
          <circle cx={cx} cy={cy} r={15} fill={AMINO_GROUP_COLORS[aminoGroup(residue)]} />
          <text x={cx} y={cy + 4} textAnchor="middle" className="k7-2d-residue">{residue}</text>
        </g>;
      })}
    </g>)}
  </svg>;
}
