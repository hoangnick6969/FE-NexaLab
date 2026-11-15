/** Kit `k8-diorama` (FL-20 tolerance, FL-21 food web). One bench entry, two Labs: the catalog id picks the page panel. */
import { dioramaExploreSchema } from "@nexalab/sim/explore-kits";
import type { ExploreBenchEntry } from "../../runtime/explore-registry";
import { kitItemsFrom } from "../explore-kit-items";

const PURPOSES: Record<string, string> = {
  food_web_board: "Sơ đồ lưới thức ăn: chọn loài để bỏ khỏi lưới và xem loài bị ảnh hưởng.",
  thermometer: "Nhiệt kế mô phỏng: đặt nhiệt độ và xem loài có nằm trong vùng sống không.",
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
