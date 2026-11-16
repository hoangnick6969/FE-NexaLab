import type { ChemistryLabConfig } from "@nexalab/sim/wet-bench";

/**
 * FL-14c (narrow mode of SPLIT FL-14): metal oxides with dilute acid, and oxides next to NaOH, in test tubes.
 * Engine wet-bench@1.1.0 only for the spoon (spatula): the reactions and the oxide pieces are the same as in 1.0.0.
 * All chemistry data is a draft awaiting a chemistry reviewer.
 * Spec: _bmad-output/specs/spec-lab-pipeline/fl-14-reaction-modes-explore-spec.md (BE repo).
 */
export const fl14cConfig: ChemistryLabConfig = {
  schema: "k2-lab-config/1",
  labId: "oxide-reactions",
  catalogId: "FL-14c",
  configVersion: 1,
  kit: "k2-wet-bench@1",
  engine: "wet-bench@1.1.0",
  reactionCatalog: "k2-reactions@1",
  title: "Oxide và acid",
  contextLabel: "KHTN 8 · FL-14c (mẫu)",
  outcomeSummary: [
    "Quan sát oxide kim loại (CuO, MgO, Fe₂O₃) tan trong acid loãng và màu dung dịch muối tạo thành.",
    "Thử oxide với NaOH để phân loại: oxide base chỉ phản ứng với acid.",
  ],
  safetyBriefing: {
    simulation: ["Bột oxide và màu dung dịch trong mô phỏng chỉ là hình minh họa."],
    realLab: [
      "Bột oxide mịn dễ bay: không hít, dùng thìa sạch, khô.",
      "Acid và NaOH ăn mòn: đeo kính và găng tay, rửa tay sau khi làm.",
      "Muối đồng độc khi nuốt: không đổ xuống cống.",
    ],
    acknowledgeRequired: true,
  },
  limitations: [
    "Phản ứng diễn ra tức thời, không mô phỏng tốc độ hay nhiệt tỏa ra.",
    "Chỉ có ba cặp oxide với acid: CuO với H₂SO₄, MgO với HCl, Fe₂O₃ với HCl; cặp khác báo ngoài phạm vi bài này.",
    "Chưa có oxide phi kim với base, oxide lưỡng tính và phản ứng của kim loại với oxygen.",
    "Mỗi thìa nhỏ chỉ khoảng 10 mg, nhỏ hơn thí nghiệm thật để dùng ít acid.",
  ],
  modes: { explore: true },
  enabledApparatus: [
    { id: "rack", kind: "test_tube_rack_6", slot: "rack_base", labelVi: "Giá ống nghiệm" },
    ...([1, 2, 3, 4] as const).map((n) => ({ id: `T${n}`, kind: "test_tube" as const, slot: `rack_${n}`, labelVi: `Ống ${n}` })),
    { id: "waste", kind: "waste_beaker", slot: "waste_slot", labelVi: "Cốc thải" },
    { id: "dropper", kind: "dropper_pipette", slot: "tool_1", labelVi: "Ống nhỏ giọt" },
    { id: "spoon", kind: "spatula", slot: "tool_2", labelVi: "Thìa lấy hoá chất" },
  ],
  availableReagents: [
    { reagentId: "CuO_powder", shelfPosition: 1 },
    { reagentId: "MgO_powder", shelfPosition: 2 },
    { reagentId: "Fe2O3_powder", shelfPosition: 3 },
    { reagentId: "HCl_0_1M", shelfPosition: 4 },
    { reagentId: "H2SO4_0_1M", shelfPosition: 5 },
    { reagentId: "NaOH_0_1M", shelfPosition: 6 },
  ],
  allowedReactions: ["oxide-acid.cuo-h2so4", "oxide-acid.mgo-hcl", "oxide-acid.fe2o3-hcl"],
  measurements: [],
  dispensing: { liquidPresetsMicroliters: [250, 500, 1000] },
  pedagogy: {
    revealEquations: "after_observation",
    observationPrompts: [
      { id: "copper", kind: "note", textVi: "Cho bột CuO đen vào ống có H₂SO₄ loãng. Bột đen và màu dung dịch thay đổi thế nào?", highlightWhen: { reaction: "oxide-acid.cuo-h2so4" } },
      { id: "magnesium", kind: "free_text", textVi: "Cho MgO vào HCl. Em có thấy bọt khí không? So sánh với kim loại Mg hoặc Zn trong acid.", highlightWhen: { reaction: "oxide-acid.mgo-hcl" } },
      { id: "iron", kind: "free_text", textVi: "Dung dịch tạo ra từ Fe₂O₃ và HCl có màu gì?", highlightWhen: { reaction: "oxide-acid.fe2o3-hcl" } },
      { id: "classify", kind: "choice", textVi: "Từ thí nghiệm với acid và NaOH, CuO thuộc loại oxide nào?",
        choices: [{ id: "base", labelVi: "Oxide base (chỉ phản ứng với acid)" }, { id: "acid", labelVi: "Oxide acid (phản ứng với base)" }] },
    ],
  },
  review: { status: "draft" },
};
