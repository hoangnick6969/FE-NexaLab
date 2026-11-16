/** Items of the mechanical energy bench exactly as the config enables them (P0 C2.3); the intro and panel read this. */
import type { EnergyApparatusKind, EnergyLabConfig } from "@nexalab/sim/mechanics/energy";
import type { KitItem } from "../../../runtime/explore-registry";

export const formatGrams = (grams: number) => grams >= 1000 ? `${(grams / 1000).toLocaleString("vi-VN")} kg` : `${grams} g`;
const list = (values: readonly number[]) => values.map(formatGrams).join(", ");

type ItemText = { label: string; category: KitItem["category"]; purpose: (config: EnergyLabConfig) => string; shared?: KitItem["sharedItemId"] };
/** Text of each apparatus kind of the engine, looked up by kind (P0 C2.3). */
const ITEM_TEXT: Record<EnergyApparatusKind, ItemText> = {
  pendulum: { label: "Con lắc đơn", category: "apparatus", purpose: (c) => c.pendulum ? `Dây dài ${c.pendulum.lengthMm} mm, quả nặng ${list(c.pendulum.massesG)}; thả từ độ cao tới ${c.pendulum.maxDropHeightMm} mm so với điểm thấp nhất.` : "Quả nặng treo trên dây mảnh." },
  energy_bars: { label: "Thanh năng lượng", category: "instrument", purpose: (c) => `Ba thanh động năng Wđ, thế năng Wt và cơ năng W tại mốc đang xem${c.display.energyReadings ? ", kèm số đo" : "; số đo để em tự tính"}.` },
  hoist: { label: "Tời kéo vật", category: "apparatus", purpose: (c) => c.hoist ? `Kéo đều vật ${list(c.hoist.massesG)} lên theo phương thẳng đứng, ${c.hoist.minDistanceMm}–${c.hoist.maxDistanceMm} mm; ${c.hoist.motors.map((m) => m.labelVi.toLowerCase()).join(" và ")}.` : "Kéo vật lên theo phương thẳng đứng." },
  spring_gauge: { label: "Lực kế", category: "instrument", purpose: () => "Đo lực kéo của tời, cùng hướng với dịch chuyển của vật." },
  ruler: { label: "Thước đo độ cao", category: "instrument", purpose: () => "Đo quãng đường vật được kéo lên." },
  stopwatch: { label: "Đồng hồ bấm giây", category: "instrument", purpose: () => "Đo thời gian tời kéo vật.", shared: "stopwatch" },
};

export function listEnergyKitItems(config: EnergyLabConfig): KitItem[] {
  return config.enabledApparatus.map((item): KitItem => {
    const text = ITEM_TEXT[item.kind];
    return { id: item.id, category: text.category, labelVi: item.labelVi ?? text.label, purposeVi: text.purpose(config), ...(text.shared ? { sharedItemId: text.shared } : {}) };
  });
}
