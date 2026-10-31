import type { StationId } from "./gene-evidence";

/**
 * Scene-only state of the FL-27 workspace (what is shown, not what is
 * answered). It is never stored in evidence; switching stations resets it.
 */
export type GeneBench = {
  ruler: boolean;
  labels: boolean;
  spin: boolean;
  /** 0 wound, 1 fork open, 2 building, 3 two daughter DNAs. */
  replicationPhase: 0 | 1 | 2 | 3;
  mutated: boolean;
  /** Slot the learner edits on the replication or transcription strand. */
  activeSlot: number | null;
  viewReset: number;
  /** Structure station: schematic tube-and-rod model or ball-and-stick atoms. */
  representation: "schematic" | "atomic";
};

export const initialGeneBench = (station: StationId = "structure"): GeneBench => ({
  ruler: false,
  labels: true,
  spin: station === "structure",
  replicationPhase: 0,
  mutated: false,
  activeSlot: null,
  viewReset: 0,
  representation: "schematic",
});
