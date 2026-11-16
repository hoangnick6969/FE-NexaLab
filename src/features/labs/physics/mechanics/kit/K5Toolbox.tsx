/**
 * Picks a weight or the spring gauge, a hole and a force, and hangs it on the lever bar. Shared by FL-06 Guided and
 * the mechanics bench Explore page: the parent owns the attachments and gets every change through `onChange`.
 */
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { evaluateLeverBench } from "@nexalab/sim";
import { K5_HOLES, type K5Attachment } from "./K5Stage";

/** Every weight the lever model accepts: 0.5 N to 5 N in 0.5 N steps. */
export const K5_ALL_WEIGHTS = Array.from({ length: 10 }, (_, i) => (i + 1) * 500);
const GAUGE_FORCES = Array.from({ length: 51 }, (_, i) => i * 100);
const newtons = (milliNewtons: number) => (milliNewtons / 1000).toFixed(1).replace(".", ",");
export const k5Fits = (attachments: readonly K5Attachment[]) => evaluateLeverBench({ fixtureId: "lever-bench-reference-v1", attachments }).ok;

export function K5Toolbox({ attachments, onChange, onError, weights = K5_ALL_WEIGHTS, gauge = true, maxWeights = 11, title = "Dụng cụ", locked = [] }: {
  attachments: readonly K5Attachment[];
  onChange: (next: K5Attachment[]) => void;
  /** Called with "" after a successful change, so the parent can clear its message. */
  onError: (message: string) => void;
  weights?: readonly number[];
  gauge?: boolean;
  maxWeights?: number;
  title?: string;
  /** Holes whose attachment is part of the bench (a Class Explore load): shown, never taken off. */
  locked?: readonly number[];
}) {
  const firstWeight = weights.includes(1000) ? 1000 : weights[0];
  const [kind, setKind] = useState<"WEIGHT" | "GAUGE">("WEIGHT");
  const [position, setPosition] = useState<number>(-100);
  const [force, setForce] = useState<number>(firstWeight);
  const forces = kind === "GAUGE" ? GAUGE_FORCES : weights;
  const add = () => {
    const next = { kind, positionMillimetres: position, forceMilliNewtons: force };
    if (kind === "GAUGE" && attachments.some(a => a.kind === "GAUGE")) return onError("Chỉ dùng một lực kế.");
    if (attachments.some(a => a.positionMillimetres === position)) return onError("Lỗ này đã có dụng cụ.");
    if (kind === "WEIGHT" && attachments.filter(a => a.kind === "WEIGHT").length >= maxWeights) return onError(`Bộ chỉ có ${maxWeights} quả nặng.`);
    if (!k5Fits([...attachments, next])) return onError("Vị trí hoặc lực nằm ngoài giới hạn bàn đòn.");
    onChange([...attachments, next]);
    onError("");
  };
  const remove = (at: number) => { if (locked.includes(at)) return; onChange(attachments.filter(a => a.positionMillimetres !== at)); onError(""); };
  return <div className="lqp-section k5-toolbox"><h3>{title}</h3>
    {gauge && <label>Loại dụng cụ<select value={kind} onChange={e => { const next = e.target.value as "WEIGHT" | "GAUGE"; setKind(next); setForce(next === "GAUGE" ? 500 : firstWeight); }}><option value="WEIGHT">Quả nặng</option><option value="GAUGE">Lực kế</option></select></label>}
    <label>Vị trí (mm)<select value={position} onChange={e => setPosition(Number(e.target.value))}>{K5_HOLES.map(n => <option key={n} value={n}>{n === 0 ? "O · 0" : n}</option>)}</select></label>
    <label>Lực (N)<select value={force} onChange={e => setForce(Number(e.target.value))}>{forces.map(n => <option key={n} value={n}>{newtons(n)}</option>)}</select></label>
    <button type="button" className="lqp-tool" onClick={add}><Plus size={16} aria-hidden="true" />Gắn vào thanh</button>
    {attachments.length > 0 && <div className="lqp-chips">{attachments.map(a => locked.includes(a.positionMillimetres)
      ? <span key={a.positionMillimetres} className="lqp-chip k5-chip-locked" data-locked="true" title="Tải cố định của bài">{a.positionMillimetres} mm · {newtons(a.forceMilliNewtons)} N · cố định</span>
      : <button key={a.positionMillimetres} type="button" className="lqp-chip" onClick={() => remove(a.positionMillimetres)} aria-label={`Tháo ${a.kind === "GAUGE" ? "lực kế" : "quả nặng"} tại ${a.positionMillimetres} mm`}>{a.positionMillimetres} mm · {newtons(a.forceMilliNewtons)} N<X size={16} aria-hidden="true" /></button>)}</div>}
  </div>;
}
