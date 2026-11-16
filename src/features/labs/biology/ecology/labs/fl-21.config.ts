import type { DioramaExploreConfig } from "@nexalab/sim/explore-kits";

/** FL-21 Explore (K8 bàn sinh thái, kit `k8-diorama`): bỏ một loài trong lưới thức ăn. Sample config. */
export const fl21Config = {
  schema: "fl21-food-web-config@1",
  labId: "fl-21-explore",
  catalogId: "FL-21",
  configVersion: 2,
  kit: "k8-diorama",
  engine: "food-web@1.0.0",
  title: "Lưới thức ăn và cân bằng",
  contextLabel: "KHTN 8 · FL-21 Explore (mẫu)",
  outcomeSummary: ["Dự đoán loài nào bị ảnh hưởng khi một loài bị loại khỏi lưới thức ăn."],
  safetyBriefing: { simulation: ["Lưới thức ăn minh hoạ, không phải một hệ sinh thái cụ thể."], realLab: ["Không thả hay đưa sinh vật ra ngoài tự nhiên khi làm thí nghiệm."], acknowledgeRequired: false },
  limitations: ["Chỉ ảnh hưởng trực tiếp một bậc (không tính hiệu ứng dây chuyền)."],
  modes: { explore: true },
  enabledApparatus: [{ id: "web-board", kind: "food_web_board", slot: "board_1", labelVi: "Sơ đồ lưới thức ăn" }],
  measurements: ["effects"],
  pedagogy: { observationPrompts: [{ id: "remove", kind: "free_text", textVi: "Bỏ rắn. Loài nào tăng, loài nào giảm? Vì sao?" }] },
  // Owner decision 2026-11-16: drop the "Bản nháp · chờ duyệt" label on /labs. Not a subject reviewer sign-off.
  review: { status: "reviewed" },
  spec: { model: "food-web@1.0.0", allowedRemovals: ["ran", "tho", "ech"] },
} satisfies DioramaExploreConfig;
