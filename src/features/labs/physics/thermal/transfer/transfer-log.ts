/** Learner notebook of the thermal bench: local, unscored, never evidence. Storage is the shared Explore store. */
import { createObservationLogStore } from "../../../shared/explore/observation-log";
import { MATERIAL_VI } from "./kit-items";

export type ThermalLogEntry = {
  seq: number;
  at: number;
  station: "conduction" | "convection" | "radiation";
  /** Simulated time on that station's clock when it happened. */
  simSeconds: number;
  actionVi: string;
  phenomenaVi: string[];
};

export const thermalLogStore = createObservationLogStore<ThermalLogEntry>("nexalab-thermal-explore");

export type PinView = { id: string; positionMm: number; dropped: boolean; meltSeconds: number | null };
export type RodView = { material: string; pins: PinView[] };
export type TubeView = { id: "1" | "2"; wax: "bottom" | "top"; flame: "bottom" | "mouth" | null; melted: boolean; melts: boolean };

export const formatSeconds = (seconds: number) => `${seconds} s`;
export const formatTenthsC = (tenths: number) => `${(tenths / 10).toFixed(1).replace(".", ",")} °C`;
export const materialVi = (material: string) => MATERIAL_VI[material] ?? material;
export const WAX_VI = { bottom: "ở đáy", top: "ở miệng" } as const;
export const FLAME_VI = { bottom: "dưới đáy", mouth: "gần miệng" } as const;

/** Pins that dropped between two readings of the same rods, in the order they melted (each with its melt time). */
export function droppedBetween(before: readonly RodView[], after: readonly RodView[]): Array<{ material: string; pin: string; seconds: number }> {
  const events: Array<{ material: string; pin: string; seconds: number }> = [];
  after.forEach((rod, index) => rod.pins.forEach((pin, p) => {
    if (pin.dropped && !before[index]?.pins[p]?.dropped && pin.meltSeconds !== null) events.push({ material: rod.material, pin: pin.id, seconds: pin.meltSeconds });
  }));
  return events.sort((a, b) => a.seconds - b.seconds);
}

export const pinDropVi = (event: { material: string; pin: string; seconds: number }) => `Đinh ${event.pin} của thanh ${materialVi(event.material)} rơi lúc ${formatSeconds(event.seconds)}`;

export function describeRodsAtEnd(rods: readonly RodView[]): string[] {
  return rods.map((rod) => {
    const count = rod.pins.filter((pin) => pin.dropped).length;
    return count === 0 ? `Thanh ${materialVi(rod.material)}: chưa đinh nào rơi` : `Thanh ${materialVi(rod.material)}: ${count}/${rod.pins.length} đinh đã rơi`;
  });
}

/** Wax that melted between two readings. */
export function meltedBetween(before: readonly TubeView[], after: readonly TubeView[]): TubeView[] {
  return after.filter((tube, index) => tube.melted && !before[index]?.melted);
}

export const tubeMeltVi = (tube: TubeView, seconds: number) => `Ống (${tube.id}): đun ${tube.flame ? FLAME_VI[tube.flame] : ""}, viên sáp ${WAX_VI[tube.wax]} chảy lúc ${formatSeconds(seconds)}`;
export const tubeStillVi = (tube: TubeView, seconds: number) => `Ống (${tube.id}): sau ${formatSeconds(seconds)} viên sáp ${WAX_VI[tube.wax]} vẫn chưa chảy`;

/** Adds one line at the end; the notebook never folds lines of this bench. */
export function appendThermalEntry(log: readonly ThermalLogEntry[], entry: Omit<ThermalLogEntry, "seq">): ThermalLogEntry[] {
  return [...log, { ...entry, seq: (log.at(-1)?.seq ?? 0) + 1 }];
}
