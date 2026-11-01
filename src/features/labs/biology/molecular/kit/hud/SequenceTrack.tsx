import { Delete } from "lucide-react";
import { useId, type KeyboardEvent } from "react";
import { defineText } from "../../../../../../i18n";
import type { Base } from "../k7-codons";
import { BASE_COLORS, BASE_INK } from "../k7-palette";

const text = defineText({
  vi: {
    slot: (row: string, position: number, base: string | null) => `${row}, vị trí ${position}: ${base ?? "trống"}`,
    pick: (base: string) => `Chọn ${base}`,
    erase: "Xoá vị trí đang chọn",
    keys: "Gõ phím chữ cái của base hoặc dùng các nút.",
  },
  en: {
    slot: (row: string, position: number, base: string | null) => `${row}, position ${position}: ${base ?? "empty"}`,
    pick: (base: string) => `Choose ${base}`,
    erase: "Clear the selected position",
    keys: "Type the base letter or use the buttons.",
  },
});

export type TrackRow = {
  id: string;
  /** Visible row label, e.g. "Mạch gốc 3' → 5'". */
  label: string;
  bases: readonly (Base | null)[];
  editable?: boolean;
  /** Ends shown at the left and right, e.g. ["3'", "5'"]. */
  ends?: readonly [string, string];
};

/**
 * Rows of aligned bases (a template above, the learner's strand below),
 * grouped in threes when `codons` is set. Editable slots are buttons; the
 * active slot is filled from the picker or by typing its letter.
 */
export function SequenceTrack({ rows, active, onSelectSlot, codons = false, highlight = [] }: {
  rows: readonly TrackRow[];
  active?: number | null;
  onSelectSlot?: (index: number) => void;
  codons?: boolean;
  /** Indices to mark (for example the mutated position). */
  highlight?: readonly number[];
}) {
  const t = text();
  return <div className={`k7-track ${codons ? "has-codons" : ""}`}>
    {rows.map((row) => <div key={row.id} className="k7-track-row">
      <span className="k7-track-label">{row.label}</span>
      <div className="k7-track-bases">
        {row.ends && <span className="k7-track-end" aria-hidden="true">{row.ends[0]}</span>}
        {row.bases.map((base, index) => {
          const style = base ? { background: BASE_COLORS[base], color: BASE_INK[base] } : undefined;
          const classes = `k7-base ${base ? "" : "is-empty"} ${index === active && row.editable ? "is-active" : ""} ${highlight.includes(index) ? "is-marked" : ""} ${codons && index % 3 === 2 ? "codon-end" : ""}`;
          return row.editable
            ? <button key={index} type="button" className={classes} style={style} aria-pressed={index === active} aria-label={t.slot(row.label, index + 1, base)} onClick={() => onSelectSlot?.(index)}>{base ?? ""}</button>
            : <span key={index} className={classes} style={style} role="img" aria-label={t.slot(row.label, index + 1, base)}>{base ?? ""}</span>;
        })}
        {row.ends && <span className="k7-track-end" aria-hidden="true">{row.ends[1]}</span>}
      </div>
    </div>)}
  </div>;
}

/** Base buttons with letter, colour and a spoken label; letter keys work while focus is inside. */
export function BasePicker({ bases, onPick, onErase, disabled = false, label }: {
  bases: readonly Base[];
  onPick: (base: Base) => void;
  onErase?: () => void;
  disabled?: boolean;
  label: string;
}) {
  const t = text();
  const hintId = useId();
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const key = event.key.toUpperCase();
    if ((bases as readonly string[]).includes(key)) { event.preventDefault(); onPick(key as Base); }
    else if ((event.key === "Backspace" || event.key === "Delete") && onErase) { event.preventDefault(); onErase(); }
  };
  return <div className="k7-picker" role="group" aria-label={label} onKeyDown={onKeyDown} aria-describedby={hintId}>
    {bases.map((base) => <button key={base} type="button" className="k7-picker-base" disabled={disabled} style={{ background: BASE_COLORS[base], color: BASE_INK[base] }} aria-label={t.pick(base)} onClick={() => onPick(base)}>{base}</button>)}
    {onErase && <button type="button" className="secondary k7-picker-erase" disabled={disabled} onClick={onErase} aria-label={t.erase}><Delete size={18} aria-hidden="true" /></button>}
    <span id={hintId} className="sr-only">{t.keys}</span>
  </div>;
}
