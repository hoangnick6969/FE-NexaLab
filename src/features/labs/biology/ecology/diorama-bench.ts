/** Kit `k8-diorama` (FL-20 tolerance, FL-21 food web). One bench entry, two Labs: the catalog id picks the page panel. */
import { dioramaExploreSchema, fl20ToleranceResult, fl21RemovalResult } from "@nexalab/sim/explore-kits";
import type { ExploreBenchEntry } from "../../runtime/explore-registry";
import { kitItemsFrom } from "../explore-kit-items";

const PURPOSES: Record<string, string> = {
  food_web_board: "Sơ đồ lưới thức ăn: bỏ một loài khỏi lưới, hoặc dựng chuỗi thức ăn và xem năng lượng ở mỗi bậc.",
  thermometer: "Nhiệt kế mô phỏng: đặt nhiệt độ, ghi bảng đo và so sánh vùng sống của các loài cá.",
};

export const dioramaBench: ExploreBenchEntry = {
  kit: "k8-diorama",
  group: "biology",
  validate: (raw) => {
    const result = dioramaExploreSchema.safeParse(raw);
    return result.success ? { ok: true, config: result.data } : { ok: false };
  },
  loadPage: () => import("./DioramaExplorePage"),
  listKitItems: (config) => kitItemsFrom(config, PURPOSES),
};

const SPECIES_NAME: Record<string, string> = { "ca-ro-phi": "Cá rô phi", ran: "Rắn", tho: "Thỏ", ech: "Ếch", "chau-chau": "Châu chấu", co: "Cỏ", "cay-xanh": "Cây xanh", cao: "Cáo", "dai-bang": "Đại bàng", sau: "Sâu", "chim-sau": "Chim sâu", "nam-vi-khuan": "Nấm, vi khuẩn" };

/** Journal line for FL-21: the species removed and the direct effects the food-web model gives. */
export function foodWebSummary(speciesId: string): string {
  const result = fl21RemovalResult(speciesId);
  if (result.setup !== "remove") return "";
  const effects = Object.entries(result.effects)
    .filter(([, effect]) => effect.effect !== "NO_DIRECT_EFFECT")
    .map(([id, effect]) => `${SPECIES_NAME[id] ?? id} ${effect.effect === "INCREASE" ? "tăng" : "giảm"}`);
  return `Bỏ ${SPECIES_NAME[speciesId] ?? speciesId}: ${effects.join(", ")}; chuỗi bị đứt ${result.brokenChains}`;
}

/** Journal line for FL-20: the temperature and the zone the tolerance model gives for the species. */
export function toleranceSummary(speciesId: string, valueDeciC: number): string {
  const result = fl20ToleranceResult(speciesId, valueDeciC);
  const zone = result.zone === "WITHIN" ? "trong vùng sống" : result.zone === "BELOW_MIN" ? "dưới giới hạn dưới" : "trên giới hạn trên";
  return `${SPECIES_NAME[speciesId] ?? speciesId} ở ${(valueDeciC / 10).toFixed(1)} °C: ${zone}`;
}
