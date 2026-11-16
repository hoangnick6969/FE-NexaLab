import type { ChemistryLabConfig } from "@nexalab/sim/wet-bench";

/**
 * FL-14b (narrow mode of SPLIT FL-14): reactions of salts with acid, base and other salts, in test tubes.
 * Engine wet-bench@1.0.0: reactions are instant. All chemistry data is a draft awaiting a chemistry reviewer.
 * Spec: _bmad-output/specs/spec-lab-pipeline/fl-14-reaction-modes-explore-spec.md (BE repo).
 */
export const fl14bConfig: ChemistryLabConfig = {
  schema: "k2-lab-config/1",
  labId: "salt-reactions",
  catalogId: "FL-14b",
  configVersion: 1,
  kit: "k2-wet-bench@1",
  engine: "wet-bench@1.0.0",
  reactionCatalog: "k2-reactions@1",
  title: "Phản ứng của muối",
  contextLabel: "KHTN 8 · FL-14b (mẫu)",
  outcomeSummary: [
    "Quan sát muối phản ứng với acid: có khí thoát ra hay không.",
    "Quan sát muối phản ứng với base và với muối khác: có kết tủa, màu kết tủa là gì.",
  ],
  safetyBriefing: {
    simulation: ["Khí và kết tủa trong mô phỏng chỉ là hình minh họa; màu là màu quy ước."],
    realLab: [
      "Dung dịch AgNO₃ làm đen da và độc với thủy sinh: đeo găng tay, không đổ xuống cống.",
      "NaOH và HCl ăn mòn: luôn đeo kính bảo hộ.",
      "Khí CO₂ thoát ra khi phản ứng trong ống nghiệm hở: không đậy kín ống.",
    ],
    acknowledgeRequired: true,
  },
  limitations: [
    "Phản ứng diễn ra tức thời, không mô phỏng tốc độ.",
    "Chỉ có một số phản ứng đã chọn; cặp chất khác có thể báo ngoài phạm vi bài này.",
    "Không mô phỏng kết tủa tan trong chất dư, màu hỗn hợp nhiều kết tủa hay độ tan thực của từng muối.",
    "Không đo pH của dung dịch chứa các muối này.",
  ],
  modes: { explore: true },
  enabledApparatus: [
    { id: "rack", kind: "test_tube_rack_6", slot: "rack_base", labelVi: "Giá ống nghiệm" },
    ...([1, 2, 3, 4] as const).map((n) => ({ id: `T${n}`, kind: "test_tube" as const, slot: `rack_${n}`, labelVi: `Ống ${n}` })),
    { id: "waste", kind: "waste_beaker", slot: "waste_slot", labelVi: "Cốc thải" },
    { id: "dropper", kind: "dropper_pipette", slot: "tool_1", labelVi: "Ống nhỏ giọt" },
  ],
  availableReagents: [
    { reagentId: "Na2CO3_0_1M", shelfPosition: 1 },
    { reagentId: "HCl_0_1M", shelfPosition: 2 },
    { reagentId: "AgNO3_0_1M", shelfPosition: 3 },
    { reagentId: "NaCl_0_1M", shelfPosition: 4 },
    { reagentId: "FeCl3_0_1M", shelfPosition: 5 },
    { reagentId: "NaOH_0_1M", shelfPosition: 6 },
    { reagentId: "CuSO4_0_1M", shelfPosition: 7 },
  ],
  allowedReactions: ["gas.na2co3-hcl", "precip.agno3-nacl", "precip.fecl3-naoh", "precip.cuso4-naoh"],
  measurements: [],
  dispensing: { liquidPresetsMicroliters: [250, 500, 1000] },
  pedagogy: {
    revealEquations: "after_observation",
    observationPrompts: [
      { id: "acid", kind: "note", textVi: "Nhỏ dung dịch HCl vào dung dịch Na₂CO₃. Em thấy gì xuất hiện trong ống?", highlightWhen: { reaction: "gas.na2co3-hcl" } },
      { id: "silver", kind: "free_text", textVi: "Trộn AgNO₃ với NaCl. Chất tạo thành có màu gì, ở trạng thái nào?", highlightWhen: { reaction: "precip.agno3-nacl" } },
      { id: "base", kind: "free_text", textVi: "So sánh kết tủa khi nhỏ NaOH vào FeCl₃ và vào CuSO₄. Hai kết tủa khác nhau thế nào?", highlightWhen: { reaction: "precip.fecl3-naoh" } },
      { id: "classify", kind: "choice", textVi: "Phản ứng giữa muối và base trong thí nghiệm của em tạo ra gì?",
        choices: [{ id: "precip", labelVi: "Kết tủa hydroxide" }, { id: "gas", labelVi: "Chất khí" }, { id: "none", labelVi: "Không có gì" }] },
    ],
  },
  review: { status: "draft" },
};
