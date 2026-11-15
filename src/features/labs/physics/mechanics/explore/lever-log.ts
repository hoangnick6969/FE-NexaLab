/** Learner notebook of the mechanics bench: local, unscored, never evidence. Storage is the shared Explore store. */
import { createObservationLogStore } from "../../../shared/explore/observation-log";
import type { K5Attachment, K5Tilt } from "../kit/K5Stage";
import { formatNewtons } from "./kit-items";

export type LeverReading = { tilt: K5Tilt; leftMomentNmm: number; rightMomentNmm: number };
export type LeverLogEntry = {
  seq: number;
  at: number;
  actionVi: string;
  phenomenaVi: string[];
  readings: { leftMomentNmm: number; rightMomentNmm: number };
  attachments: K5Attachment[];
  /** Consecutive force changes of the same tool at the same hole collapse into one line. */
  merge?: string;
};

export const leverLogStore = createObservationLogStore<LeverLogEntry>("nexalab-lever-explore");

const TILT_VI: Record<K5Tilt, string> = { LEVEL: "nằm ngang", TILT_LEFT: "nghiêng trái", TILT_RIGHT: "nghiêng phải" };
const toolVi = (a: K5Attachment) => a.kind === "GAUGE" ? "lực kế" : "quả nặng";
const holeVi = (mm: number) => mm === 0 ? "điểm tựa O" : `lỗ ${mm} mm`;
/** N·mm in N·m with a comma: 100 000 mN·mm → "0,1 N·m". */
export const formatMoment = (milliNewtonMillimetres: number) => `${String(+(milliNewtonMillimetres / 1_000_000).toFixed(3)).replace(".", ",")} N·m`;

/** What changed between two attachment lists, in words for the learner. `null` when nothing changed. */
export function describeLeverAction(before: readonly K5Attachment[], after: readonly K5Attachment[]): { actionVi: string; merge?: string } | null {
  const added = after.find(a => !before.some(b => b.positionMillimetres === a.positionMillimetres));
  const removed = before.find(b => !after.some(a => a.positionMillimetres === b.positionMillimetres));
  const changed = after.find(a => before.some(b => b.positionMillimetres === a.positionMillimetres && (b.forceMilliNewtons !== a.forceMilliNewtons || b.kind !== a.kind)));
  if (added && !removed) return { actionVi: `Treo ${toolVi(added)} ${formatNewtons(added.forceMilliNewtons)} ở ${holeVi(added.positionMillimetres)}` };
  if (removed && !added) return { actionVi: `Tháo ${toolVi(removed)} ${formatNewtons(removed.forceMilliNewtons)} ở ${holeVi(removed.positionMillimetres)}` };
  if (changed) return { actionVi: `Chỉnh ${toolVi(changed)} ở ${holeVi(changed.positionMillimetres)} thành ${formatNewtons(changed.forceMilliNewtons)}`, merge: `${changed.kind}@${changed.positionMillimetres}` };
  if (added && removed) return { actionVi: `Đổi dụng cụ: ${after.map(a => `${toolVi(a)} ${formatNewtons(a.forceMilliNewtons)} ở ${holeVi(a.positionMillimetres)}`).join("; ")}` };
  return null;
}

/** What the learner sees happen to the bar. */
export function describeLeverChange(before: LeverReading, after: LeverReading): string[] {
  if (before.tilt !== after.tilt) return [`Thanh chuyển từ ${TILT_VI[before.tilt]} sang ${TILT_VI[after.tilt]}`];
  const side = after.leftMomentNmm !== before.leftMomentNmm ? ["trái", after.leftMomentNmm > before.leftMomentNmm] as const
    : after.rightMomentNmm !== before.rightMomentNmm ? ["phải", after.rightMomentNmm > before.rightMomentNmm] as const : null;
  return [`Thanh vẫn ${TILT_VI[after.tilt]}${side ? `; moment bên ${side[0]} ${side[1] ? "tăng" : "giảm"}` : ""}`];
}

/** Adds one line, or folds it into the last line when it repeats the same adjustment. */
export function appendLeverEntry(log: readonly LeverLogEntry[], entry: Omit<LeverLogEntry, "seq">): LeverLogEntry[] {
  const last = log.at(-1);
  if (entry.merge && last?.merge === entry.merge) return [...log.slice(0, -1), { ...entry, seq: last.seq, phenomenaVi: entry.phenomenaVi }];
  return [...log, { ...entry, seq: (last?.seq ?? 0) + 1 }];
}
