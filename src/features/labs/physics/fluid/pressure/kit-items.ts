/** Items of the fluid bench exactly as the config enables them (P0 C2.3); the intro and panel read this. */
import type { FluidApparatusKind, FluidLabConfig } from "@nexalab/sim/fluid";
import type { KitItem } from "../../../runtime/explore-registry";

export const formatNewtons = (milliNewtons: number) => `${(milliNewtons / 1000).toFixed(1).replace(".", ",")} N`;

type ItemText = { label: string; category: KitItem["category"]; purpose: (config: FluidLabConfig) => string };
/** Text of each apparatus kind of the engine, looked up by ID (P0 C2.3). */
const ITEM_TEXT: Record<FluidApparatusKind, ItemText> = {
  tall_tank: { label: "Bể nước trong suốt", category: "apparatus", purpose: (c) => c.depthProbe ? `Cao ${c.depthProbe.tankHeightMm} mm, nước tới ${c.depthProbe.waterLevelMm} mm, có thước đo độ sâu.` : "Bể nước trong suốt." },
  membrane_probe: { label: "Bình trụ có màng cao su", category: "instrument", purpose: (c) => c.depthProbe ? `Đáy C và hai lỗ A, B ở thành (cao hơn đáy ${c.depthProbe.sideHoleOffsetMm} mm) bịt màng cao su mỏng; hạ tới ${c.depthProbe.maxDepthMm} mm.` : "Đáy và thành bịt màng cao su mỏng." },
  piston_pair: { label: "Hai xi lanh thông nhau", category: "apparatus", purpose: (c) => c.pistons ? `Pit-tông (1) có tiết diện ${c.pistons.areasMm2[0] / c.pistons.areasMm2[1] === 2 ? "gấp đôi" : `${c.pistons.areasMm2[0]} mm² so với ${c.pistons.areasMm2[1]} mm² của`} pit-tông (2).` : "Hai pit-tông nối thông nhau." },
  weight_set: { label: "Bộ quả nặng", category: "apparatus", purpose: (c) => c.pistons ? `${c.pistons.weightCount} quả giống nhau, mỗi quả ${formatNewtons(c.pistons.weightMilliNewtons)}; tối đa ${c.pistons.maxPerPan} quả mỗi đĩa.` : "Các quả nặng giống nhau." },
};

export function listFluidKitItems(config: FluidLabConfig): KitItem[] {
  return config.enabledApparatus.map((item): KitItem => {
    const text = ITEM_TEXT[item.kind];
    return { id: item.id, category: text.category, labelVi: item.labelVi ?? text.label, purposeVi: text.purpose(config) };
  });
}
