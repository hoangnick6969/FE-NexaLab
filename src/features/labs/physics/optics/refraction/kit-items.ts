/** Items of the optics bench exactly as the config enables them (P0 C2.3); the intro and panel read this. */
import type { OpticsApparatusKind, RefractionLabConfig } from "@nexalab/sim/optics";
import type { KitItem } from "../../../runtime/explore-registry";
import { formatIndex } from "./refraction-log";

type ItemText = { label: string; category: KitItem["category"]; purpose: (config: RefractionLabConfig) => string };
const media = (config: RefractionLabConfig) => config.media.map((medium) => `${medium.labelVi.toLowerCase()} (n = ${formatIndex(medium.indexMilli)})`).join(", ");

/** Text of each apparatus kind of the engine, looked up by kind (P0 C2.3). */
const ITEM_TEXT: Record<OpticsApparatusKind, ItemText> = {
  light_source: { label: "Đèn laser", category: "apparatus", purpose: () => "Chiếu một tia sáng hẹp tới đúng tâm đĩa; xoay quanh đĩa để đổi góc tới." },
  protractor_disk: { label: "Đĩa chia độ", category: "instrument", purpose: () => "Vạch chia 1°, đọc góc tới và góc khúc xạ so với pháp tuyến." },
  half_cylinder: { label: "Khối bán trụ", category: "apparatus", purpose: (c) => `Mặt phẳng đặt qua tâm đĩa; chọn khối ${media(c)}.` },
  measurement_table: { label: "Bảng đo góc", category: "instrument", purpose: (c) => `Ghi tối đa ${c.intoBlock?.maxReadings ?? 0} cặp góc i, r cho mỗi khối${c.display.sineColumns ? ", kèm sin i, sin r và tỉ số" : "; sin i, sin r để em tự tính"}.` },
  speed_card: { label: "Thẻ tốc độ ánh sáng", category: "instrument", purpose: () => "Tốc độ ánh sáng trong khối đang chọn, v = c/n với c = 300 000 km/s." },
};

export function listRefractionKitItems(config: RefractionLabConfig): KitItem[] {
  return config.enabledApparatus.map((item): KitItem => {
    const text = ITEM_TEXT[item.kind];
    return { id: item.id, category: text.category, labelVi: item.labelVi ?? text.label, purposeVi: text.purpose(config) };
  });
}
