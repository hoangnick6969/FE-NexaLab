/**
 * Fixed K2 bench layout on top of `PhysicalLabEnvironment` (table top at y = 0.02, x ∈ [-2.7, 2.7], z ∈ [-1.5, 1.5]).
 * Lab configs refer to slot ids only, never to coordinates.
 */
export const BENCH_TOP_Y = 0.02;

export type SlotKind = "rack" | "rack_base" | "bench" | "scale" | "scale_base" | "tool" | "waste";
export type BenchSlot = { id: string; kind: SlotKind; x: number; z: number; y?: number; labelVi: string };

const RACK_X0 = -1.62;
const RACK_STEP = 0.24;
export const SCALE_PLATFORM_Y = BENCH_TOP_Y + 0.1;

export const K2_SLOTS: readonly BenchSlot[] = [
  { id: "rack_base", kind: "rack_base", x: RACK_X0 + RACK_STEP * 2.5, z: 0.1, labelVi: "Giá ống nghiệm" },
  ...[1, 2, 3, 4, 5, 6].map((n): BenchSlot => ({ id: `rack_${n}`, kind: "rack", x: RACK_X0 + RACK_STEP * (n - 1), z: 0.1, y: BENCH_TOP_Y + 0.05, labelVi: `Lỗ giá ${n}` })),
  { id: "bench_1", kind: "bench", x: 0.0, z: 0.25, labelVi: "Mặt bàn 1" },
  { id: "bench_2", kind: "bench", x: 0.62, z: 0.25, labelVi: "Mặt bàn 2" },
  { id: "bench_3", kind: "bench", x: 0.0, z: 0.85, labelVi: "Mặt bàn 3" },
  { id: "scale_base", kind: "scale_base", x: -1.0, z: 0.15, labelVi: "Cân điện tử" },
  { id: "scale_1", kind: "scale", x: -1.25, z: 0.08, y: SCALE_PLATFORM_Y, labelVi: "Đĩa cân trái" },
  { id: "scale_2", kind: "scale", x: -0.75, z: 0.08, y: SCALE_PLATFORM_Y, labelVi: "Đĩa cân phải" },
  { id: "waste_slot", kind: "waste", x: 2.05, z: 0.15, labelVi: "Chỗ cốc thải" },
  { id: "tool_1", kind: "tool", x: 1.05, z: 0.85, labelVi: "Khay dụng cụ 1" },
  { id: "tool_2", kind: "tool", x: 1.45, z: 0.85, labelVi: "Khay dụng cụ 2" },
  { id: "tool_3", kind: "tool", x: 1.85, z: 0.85, labelVi: "Khay dụng cụ 3" },
  { id: "tool_4", kind: "tool", x: 2.25, z: 0.85, labelVi: "Khay dụng cụ 4" },
];

/** Reagent shelf: bottles stand on a tray along the back of the bench, ordered by `shelfPosition`. */
export const shelfPosition = (position: number) => ({ x: -0.55 + (position - 1) * 0.36, z: -0.75 });

export const slotById = (id: string) => K2_SLOTS.find((slot) => slot.id === id) ?? null;

/** Slots a carried beaker or flask may be set down in. */
export const isPlacementSlot = (slot: BenchSlot) => slot.kind === "bench" || slot.kind === "scale";
