import type { ChemistryLabConfig } from "@nexalab/sim/wet-bench";

/**
 * FL-13 · Acid – base, chỉ thị & pH (KHTN 8, portfolio slot 11), Explore mode on Kit K2.
 * Chemistry values come from `@nexalab/sim/wet-bench/fl13-acid-base.data.ts` (draft, pending review).
 */
export const fl13Config: ChemistryLabConfig = {
  schema: "k2-lab-config/1",
  labId: "acid-base-indicators",
  catalogId: "FL-13",
  configVersion: 1,
  kit: "k2-wet-bench@1",
  engine: "wet-bench@1.0.0",
  reactionCatalog: "k2-reactions@1",
  title: "Acid – base, chỉ thị và pH",
  contextLabel: "KHTN 8 · FL-13",
  outcomeSummary: [
    "Nhận biết dung dịch acid, base và trung tính bằng chất chỉ thị màu (quỳ tím, phenolphthalein).",
    "Đo pH bằng bút đo điện tử và so sánh độ acid của các dung dịch.",
    "Quan sát hiện tượng đổi màu khi trung hoà acid – base.",
  ],
  safetyBriefing: {
    simulation: [
      "Em có thể tự do pha thử các dung dịch, nhúng quỳ tím và đo pH mà không lo nguy hiểm.",
      "Màu sắc trong mô phỏng là màu minh hoạ; số đo là số liệu mô phỏng lý tưởng.",
    ],
    realLab: [
      "HCl, H₂SO₄ và NaOH là hoá chất ăn mòn (GHS05): bắt buộc đeo kính bảo hộ và găng tay.",
      "Tuyệt đối không nếm hoá chất, không để dính vào da hoặc mắt.",
      "Không đổ nước vào acid đặc; chỉ làm thí nghiệm khi có giáo viên hướng dẫn.",
    ],
    acknowledgeRequired: true,
  },
  limitations: [
    "Mô hình ở 25 °C, dung dịch loãng lý tưởng; chưa mô phỏng nhiệt độ.",
    "HCl, H₂SO₄, NaOH và Ca(OH)₂ được coi là phân li hoàn toàn; CH₃COOH là acid yếu (Ka = 1,8·10⁻⁵).",
    "Giọt chất chỉ thị chỉ làm tăng thể tích, không làm thay đổi pH.",
    "Trộn H₂SO₄ với nước vôi trong nằm ngoài phạm vi mô hình (có thể tạo CaSO₄ ít tan).",
  ],
  modes: { explore: true },
  enabledApparatus: [
    { id: "rack", kind: "test_tube_rack_6", slot: "rack_base", labelVi: "Giá ống nghiệm" },
    ...([1, 2, 3, 4, 5, 6] as const).map((n) => ({ id: `T${n}`, kind: "test_tube" as const, slot: `rack_${n}`, labelVi: `Ống ${n}` })),
    { id: "B1", kind: "beaker_100ml", slot: "bench_1", labelVi: "Cốc 100 mL" },
    { id: "waste", kind: "waste_beaker", slot: "waste_slot", labelVi: "Cốc thải" },
    { id: "dropper", kind: "dropper_pipette", slot: "tool_1", labelVi: "Ống nhỏ giọt" },
    { id: "litmus", kind: "litmus_strip_dispenser", slot: "tool_2", labelVi: "Giấy quỳ tím" },
    { id: "meter", kind: "digital_ph_meter", slot: "tool_3", labelVi: "Bút đo pH" },
  ],
  availableReagents: [
    { reagentId: "HCl_0_1M", shelfPosition: 1 },
    { reagentId: "H2SO4_0_05M", shelfPosition: 2 },
    { reagentId: "CH3COOH_0_1M", shelfPosition: 3 },
    { reagentId: "H2O_distilled", shelfPosition: 4 },
    { reagentId: "NaOH_0_1M", shelfPosition: 5 },
    { reagentId: "CaOH2_0_01M", shelfPosition: 6 },
    { reagentId: "phenolphthalein_indicator", shelfPosition: 7 },
  ],
  allowedReactions: ["acid-base.neutralization"],
  measurements: ["ph_meter", "litmus_paper"],
  dispensing: { liquidPresetsMicroliters: [50, 250, 500] },
  pedagogy: {
    revealEquations: "after_observation",
    observationPrompts: [
      {
        id: "indicator-compare", kind: "free_text",
        textVi: "Nhỏ các dung dịch khác nhau vào 6 ống nghiệm rồi kiểm tra bằng giấy quỳ tím và phenolphthalein. Chất chỉ thị nào giúp phân biệt được nước cất (pH = 7) với dung dịch acid?",
        focus: { apparatusId: "litmus" }, highlightWhen: { measurement: "litmus_paper" },
      },
      {
        id: "strong-vs-weak", kind: "free_text",
        textVi: "Dùng bút đo pH so sánh HCl 0,1 M và CH₃COOH 0,1 M (cùng nồng độ). Vì sao pH của chúng khác nhau?",
        focus: { apparatusId: "meter" }, highlightWhen: { measurement: "ph_meter" },
      },
      {
        id: "neutralize-challenge", kind: "choice", challenge: true,
        textVi: "Thử thách: nhỏ 5 giọt NaOH 0,1 M và 1 giọt phenolphthalein vào cốc 100 mL (dung dịch có màu hồng). Cần nhỏ thêm bao nhiêu giọt HCl 0,1 M để dung dịch vừa mất màu hồng (pH = 7,0)?",
        choices: [
          { id: "3", labelVi: "3 giọt" }, { id: "5", labelVi: "5 giọt" }, { id: "10", labelVi: "10 giọt" }, { id: "other", labelVi: "Số khác" },
        ],
        focus: { apparatusId: "B1" }, highlightWhen: { reaction: "acid-base.neutralization" },
      },
    ],
  },
  review: { status: "draft", notes: "Dữ liệu hoá học FL-13 chờ reviewer môn Hoá duyệt." },
};
