import type { ChemistryLabConfig } from "@nexalab/sim/wet-bench";

/** FL-14a (proposed narrow mode of SPLIT FL-14): metals with dilute acid and a salt solution. Sample config. */
export const fl14aConfig: ChemistryLabConfig = {
  schema: "k2-lab-config/1",
  labId: "metal-reactivity",
  catalogId: "FL-14a",
  configVersion: 1,
  kit: "k2-wet-bench@1",
  engine: "wet-bench@1.0.0",
  reactionCatalog: "k2-reactions@1",
  title: "Kim loại tác dụng với acid và dung dịch muối",
  contextLabel: "KHTN 8 · FL-14a (mẫu)",
  outcomeSummary: [
    "Quan sát kim loại nào đẩy được hydrogen ra khỏi acid loãng.",
    "Quan sát kim loại mạnh hơn đẩy kim loại yếu hơn ra khỏi dung dịch muối.",
  ],
  safetyBriefing: {
    simulation: ["Khí H₂ trong mô phỏng chỉ là bọt minh hoạ."],
    realLab: ["Khí H₂ dễ cháy: tránh xa ngọn lửa.", "Dung dịch CuSO₄ độc khi nuốt; rửa tay sau thí nghiệm."],
    acknowledgeRequired: true,
  },
  limitations: ["Phản ứng diễn ra tức thời, không mô phỏng tốc độ.", "Không đo pH của dung dịch chứa muối kim loại."],
  modes: { explore: true },
  enabledApparatus: [
    { id: "rack", kind: "test_tube_rack_6", slot: "rack_base", labelVi: "Giá ống nghiệm" },
    ...([1, 2, 3, 4] as const).map((n) => ({ id: `T${n}`, kind: "test_tube" as const, slot: `rack_${n}`, labelVi: `Ống ${n}` })),
    { id: "waste", kind: "waste_beaker", slot: "waste_slot", labelVi: "Cốc thải" },
    { id: "dropper", kind: "dropper_pipette", slot: "tool_1", labelVi: "Ống nhỏ giọt" },
    { id: "tongs", kind: "tongs", slot: "tool_2", labelVi: "Kẹp gắp" },
  ],
  availableReagents: [
    { reagentId: "HCl_0_1M", shelfPosition: 1 },
    { reagentId: "CuSO4_0_1M", shelfPosition: 2 },
    { reagentId: "Zn_granule", shelfPosition: 3 },
    { reagentId: "Fe_nail", shelfPosition: 4 },
    { reagentId: "Cu_foil", shelfPosition: 5 },
  ],
  allowedReactions: ["metal-acid.zn-hcl", "metal-acid.fe-hcl", "displace.fe-cuso4", "displace.zn-cuso4"],
  measurements: [],
  dispensing: { liquidPresetsMicroliters: [50, 250, 500] },
  pedagogy: {
    revealEquations: "after_observation",
    observationPrompts: [
      { id: "acid", kind: "note", textVi: "Thả kẽm, sắt, đồng vào ba ống có HCl. Ống nào sủi bọt?", focus: { reagentId: "Zn_granule" } },
      { id: "salt", kind: "free_text", textVi: "Đinh sắt trong CuSO₄ thay đổi thế nào? Màu dung dịch ra sao?", highlightWhen: { reaction: "displace.fe-cuso4" } },
      { id: "rank", kind: "choice", textVi: "Kim loại nào hoạt động hoá học mạnh hơn: sắt hay đồng?", choices: [{ id: "fe", labelVi: "Sắt" }, { id: "cu", labelVi: "Đồng" }] },
    ],
  },
  review: { status: "draft" },
};
