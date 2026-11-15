/** Items of the mechanics bench exactly as the config enables them (P0 C2.3); the intro and panel read this. */
import type { LeverLabConfig } from "@nexalab/sim/mechanics";
import type { KitItem } from "../../../runtime/explore-registry";

export const formatNewtons = (milliNewtons: number) => `${(milliNewtons / 1000).toFixed(1).replace(".", ",")} N`;

export function listLeverKitItems(config: LeverLabConfig): KitItem[] {
  return config.enabledApparatus.map((item): KitItem => {
    if (item.kind === "lever_bar") return { id: item.id, category: "apparatus", labelVi: item.labelVi ?? "Thanh đòn", purposeVi: "Thanh 11 lỗ móc cách nhau 50 mm, điểm tựa O ở giữa (0 mm)." };
    if (item.kind === "weight_set") return { id: item.id, category: "apparatus", labelVi: item.labelVi ?? "Bộ quả nặng", purposeVi: `Tối đa ${config.weights.maxCount} quả: ${config.weights.availableMilliNewtons.map(formatNewtons).join(", ")}.` };
    return { id: item.id, category: "instrument", labelVi: item.labelVi ?? "Lực kế", purposeVi: "Kéo thanh xuống tại một lỗ, chỉnh lực từ 0 đến 5 N." };
  });
}
