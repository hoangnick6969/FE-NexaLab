/** Items of the fluid bench exactly as the config enables them (P0 C2.3); the intro and panel read this. */
import type { FluidLabConfig } from "@nexalab/sim/fluid";
import type { KitItem } from "../../../runtime/explore-registry";

export const formatNewtons = (milliNewtons: number) => `${(milliNewtons / 1000).toFixed(1).replace(".", ",")} N`;

export function listFluidKitItems(config: FluidLabConfig): KitItem[] {
  return config.enabledApparatus.map((item): KitItem => {
    const probe = config.depthProbe;
    const pistons = config.pistons;
    switch (item.kind) {
      case "tall_tank":
        return { id: item.id, category: "apparatus", labelVi: item.labelVi ?? "Bể nước trong suốt", purposeVi: probe ? `Cao ${probe.tankHeightMm} mm, nước tới ${probe.waterLevelMm} mm, có thước đo độ sâu.` : "Bể nước trong suốt." };
      case "membrane_probe":
        return { id: item.id, category: "instrument", labelVi: item.labelVi ?? "Bình trụ có màng cao su", purposeVi: probe ? `Đáy C và hai lỗ A, B ở thành (cao hơn đáy ${probe.sideHoleOffsetMm} mm) bịt màng cao su mỏng; hạ tới ${probe.maxDepthMm} mm.` : "Đáy và thành bịt màng cao su mỏng." };
      case "piston_pair":
        return { id: item.id, category: "apparatus", labelVi: item.labelVi ?? "Hai xi lanh thông nhau", purposeVi: pistons ? `Pit-tông (1) có tiết diện ${pistons.areasMm2[0] / pistons.areasMm2[1] === 2 ? "gấp đôi" : `${pistons.areasMm2[0]} mm² so với ${pistons.areasMm2[1]} mm² của`} pit-tông (2).` : "Hai pit-tông nối thông nhau." };
      case "weight_set":
        return { id: item.id, category: "apparatus", labelVi: item.labelVi ?? "Bộ quả nặng", purposeVi: pistons ? `${pistons.weightCount} quả giống nhau, mỗi quả ${formatNewtons(pistons.weightMilliNewtons)}; tối đa ${pistons.maxPerPan} quả mỗi đĩa.` : "Các quả nặng giống nhau." };
    }
  });
}
