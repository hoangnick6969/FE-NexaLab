/** Items of the thermal bench exactly as the config enables them (P0 C2.3); the intro and panel read this. */
import type { ThermalLabConfig } from "@nexalab/sim/thermal";
import type { KitItem } from "../../../runtime/explore-registry";

/** Bảng 28.1 names, kept here so this module stays importable without the sim's runtime exports. */
export const MATERIAL_VI: Record<string, string> = { wool: "Len", wood: "Gỗ", water: "Nước", glass: "Thuỷ tinh", soil: "Đất", steel: "Thép", aluminium: "Nhôm", copper: "Đồng" };

const ITEM_TEXT: Record<string, { label: string; category: KitItem["category"]; purpose: (config: ThermalLabConfig) => string; shared?: KitItem["sharedItemId"] }> = {
  rod_rack: { label: "Giá ba thanh dẫn nhiệt", category: "apparatus", purpose: (c) => c.conduction ? `Tối đa ${c.conduction.maxRods} thanh dài ${c.conduction.rodLengthMm} mm (${c.conduction.materials.map((m) => MATERIAL_VI[m]).join(", ")}); đinh gắn sáp cách đầu A ${c.conduction.pinPositionsMm.join(", ")} mm.` : "Giá đỡ các thanh dẫn nhiệt." },
  spirit_lamp: { label: "Đèn cồn", category: "apparatus", purpose: () => "Đốt nóng đầu A của thanh hoặc một chỗ của ống nghiệm." },
  test_tubes: { label: "Hai ống nghiệm có sáp", category: "apparatus", purpose: () => "Ống (1) có viên sáp ở đáy, ống (2) có viên sáp ở miệng; đun gần miệng hoặc dưới đáy." },
  dye_flask: { label: "Bình nước và thuốc tím", category: "apparatus", purpose: () => "Thả thuốc tím để thấy dòng đối lưu khi đun đáy bình." },
  heat_lamp: { label: "Đèn dây tóc", category: "apparatus", purpose: () => "Chiếu tia nhiệt tới bình thuỷ tinh." },
  coated_flask: { label: "Bình thuỷ tinh phủ màu", category: "apparatus", purpose: () => "Mặt ngoài phủ đen hoặc tráng bạc, bên trong có nhiệt kế." },
  wood_screen: { label: "Tấm gỗ dày", category: "apparatus", purpose: () => "Đặt giữa đèn và bình để chắn tia nhiệt." },
  thermometer: { label: "Nhiệt kế", category: "instrument", purpose: () => "Đọc nhiệt độ trong bình đến 0,1 °C.", shared: "thermometer" },
  stopwatch: { label: "Đồng hồ bấm giây", category: "instrument", purpose: (c) => `Đo thời gian mô phỏng, tối đa ${c.clock.maxSeconds / 60} phút.`, shared: "stopwatch" },
};

export function listThermalKitItems(config: ThermalLabConfig): KitItem[] {
  return config.enabledApparatus.map((item): KitItem => {
    const text = ITEM_TEXT[item.kind];
    return { id: item.id, rendererKey: item.kind, category: text.category, labelVi: item.labelVi ?? text.label, purposeVi: text.purpose(config), ...(text.shared ? { sharedItemId: text.shared } : {}) };
  });
}
