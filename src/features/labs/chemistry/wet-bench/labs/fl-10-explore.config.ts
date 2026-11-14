import type { ChemistryLabConfig } from "@nexalab/sim/wet-bench";

/** FL-10 Explore: free exploration beside the released guided Mass Conservation activity (which stays unchanged). Sample config. */
export const fl10ExploreConfig: ChemistryLabConfig = {
  schema: "k2-lab-config/1",
  labId: "mass-conservation",
  catalogId: "FL-10",
  configVersion: 1,
  kit: "k2-wet-bench@1",
  engine: "wet-bench@1.0.0",
  reactionCatalog: "k2-reactions@1",
  title: "Khối lượng trước và sau phản ứng",
  contextLabel: "KHTN 8 · FL-10 Explore (mẫu)",
  outcomeSummary: [
    "Cân hệ trước và sau phản ứng tạo kết tủa.",
    "So sánh khi khí thoát ra khỏi cốc hở và khi khí bị giữ trong bình có nút.",
  ],
  safetyBriefing: {
    simulation: ["Kết tủa trắng BaSO₄ là hình minh hoạ; số cân là số liệu mô phỏng lý tưởng."],
    realLab: [
      "Muối barium tan có độc tính: không tự làm tại nhà, dùng kính và găng tay.",
      "Không đậy kín bình khi có phản ứng sinh khí mạnh ngoài đời thật.",
    ],
    acknowledgeRequired: true,
  },
  limitations: [
    "Không mô phỏng bắn, bay hơi hay sai số cân.",
    "Với bình có nút, thả chất vào được coi như đậy nút lại ngay, khí không thoát ra.",
    "Hai cốc hở không phải hệ kín.",
  ],
  modes: { explore: true, guided: { rendererKey: "mass-conservation" } },
  enabledApparatus: [
    { id: "scale", kind: "electronic_scale", slot: "scale_base", labelVi: "Cân điện tử" },
    { id: "C1", kind: "beaker_100ml", slot: "scale_1", labelVi: "Cốc 1", initial: { contents: [{ reagentId: "BaCl2_0_1M", microliters: 10000 }] } },
    { id: "C2", kind: "beaker_100ml", slot: "scale_2", labelVi: "Cốc 2", initial: { contents: [{ reagentId: "Na2SO4_0_1M", microliters: 10000 }] } },
    { id: "F1", kind: "erlenmeyer_flask_100ml", slot: "bench_2", labelVi: "Bình tam giác" },
    { id: "waste", kind: "waste_beaker", slot: "waste_slot", labelVi: "Cốc thải" },
    { id: "dropper", kind: "dropper_pipette", slot: "tool_1", labelVi: "Ống nhỏ giọt" },
    { id: "stopper", kind: "stopper", slot: "tool_2", labelVi: "Nút cao su" },
    { id: "tongs", kind: "tongs", slot: "tool_3", labelVi: "Kẹp gắp" },
  ],
  availableReagents: [
    { reagentId: "HCl_0_1M", shelfPosition: 1 },
    { reagentId: "CaCO3_chips", shelfPosition: 2 },
    { reagentId: "BaCl2_0_1M", shelfPosition: 3 },
    { reagentId: "Na2SO4_0_1M", shelfPosition: 4 },
  ],
  allowedReactions: ["precip.bacl2-na2so4", "gas.caco3-hcl"],
  measurements: ["scale"],
  dispensing: { liquidPresetsMicroliters: [1000, 10000] },
  pedagogy: {
    revealEquations: "never",
    observationPrompts: [
      { id: "precip", kind: "note", textVi: "Đọc số cân, đổ cốc 1 vào cốc 2 rồi đọc lại. Số cân có đổi không?", focus: { apparatusId: "scale" } },
      { id: "gas-open", kind: "free_text", textVi: "Thả đá vôi vào HCl trong một cốc hở trên cân. Số cân thay đổi thế nào? Vì sao?", highlightWhen: { reaction: "gas.caco3-hcl" } },
      { id: "gas-closed", kind: "free_text", textVi: "Làm lại trong bình tam giác có nút đặt trên cân. Số cân lần này ra sao?", focus: { apparatusId: "stopper" } },
    ],
  },
  review: { status: "draft" },
};
