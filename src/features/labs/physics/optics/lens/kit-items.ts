/** Items of the lens bench exactly as the config enables them (P0 C2.3); the intro and panel read this. */
import type { LensApparatusKind, LensLabConfig } from "@nexalab/sim/optics/lens";
import type { KitItem } from "../../../runtime/explore-registry";
import { formatPower } from "./lens-log";

type ItemText = { label: string; category: KitItem["category"]; purpose: (config: LensLabConfig) => string };
const lensNames = (config: LensLabConfig, ids: readonly string[] | undefined) => (ids ?? []).map((id) => config.lenses.find((lens) => lens.id === id)?.labelVi.toLowerCase()).filter(Boolean).join(", ");

/** Text of each apparatus kind of the engine, looked up by kind (P0 C2.3). */
const ITEM_TEXT: Record<LensApparatusKind, ItemText> = {
  optical_bench: { label: "Giá quang học có thước", category: "apparatus", purpose: () => "Thanh trượt có thước chia mm để đặt vật, thấu kính và màn trên cùng trục chính." },
  lens: { label: "Thấu kính", category: "apparatus", purpose: (c) => `Bộ thấu kính: ${lensNames(c, [...new Set([...(c.rays?.lensIds ?? []), ...(c.image?.lensIds ?? []), ...(c.focal?.lensIds ?? [])])])}.` },
  object_lamp: { label: "Vật sáng (đèn chữ F)", category: "apparatus", purpose: (c) => `Vật sáng cao ${c.image?.objectHeightMm ?? 20} mm, dịch được trên giá.` },
  screen: { label: "Màn hứng ảnh", category: "instrument", purpose: () => "Hứng ảnh thật; ảnh rõ nét khi màn đặt đúng vị trí ảnh." },
  magnifier: { label: "Kính lúp", category: "apparatus", purpose: (c) => `Thấu kính hội tụ tiêu cự ngắn${c.magnifier ? `: ${c.magnifier.lensIds.map((id) => { const lens = c.lenses.find((item) => item.id === id); return lens ? `${lens.labelVi.toLowerCase()} (${formatPower(250 / lens.focalMm)})` : id; }).join(", ")}` : ""}.` },
  grid: { label: "Lưới tỉ lệ", category: "instrument", purpose: () => "Mỗi ô 10 mm, để đọc khoảng cách và chiều cao của ảnh như khi vẽ trên giấy kẻ ô." },
};

export function listLensKitItems(config: LensLabConfig): KitItem[] {
  return config.enabledApparatus.map((item): KitItem => {
    const text = ITEM_TEXT[item.kind];
    return { id: item.id, category: text.category, labelVi: item.labelVi ?? text.label, purposeVi: text.purpose(config) };
  });
}
