import type { ChemistryLabConfig } from "@nexalab/sim/wet-bench";

/**
 * FL-11 · Dung dịch và nồng độ (KHTN 8, portfolio slot 9), Explore mode on Kit K2 (engine wet-bench@1.1.0).
 * Two goals: a molarity (100 mL of NaCl 0,10 M, with the volumetric flask) and a mass percent (50 g of CuSO₄ 5 %, with beaker and
 * cylinder). Solubility constants are a draft assumption at 20 °C; the achieved concentration is shown only after "Kết luận".
 */
export const fl11Config: ChemistryLabConfig = {
  schema: "k2-lab-config/1",
  labId: "solution-concentration",
  catalogId: "FL-11",
  configVersion: 1,
  kit: "k2-wet-bench@1",
  engine: "wet-bench@1.1.0",
  reactionCatalog: "k2-reactions@1",
  title: "Dung dịch và nồng độ",
  contextLabel: "KHTN 8 · FL-11",
  outcomeSummary: [
    "Tính khối lượng chất tan cần lấy để pha dung dịch có nồng độ phần trăm hoặc nồng độ mol cho trước.",
    "Pha dung dịch: cân chất rắn, hòa tan, đong nước và thêm nước đến vạch của bình định mức.",
    "Kiểm tra nồng độ thực của dung dịch vừa pha so với yêu cầu.",
  ],
  safetyBriefing: {
    simulation: [
      "Em tự do thử cân, hòa tan và đong nước trong mô phỏng; số liệu là số liệu lý tưởng.",
      "Em cần tự tính khối lượng chất tan trước khi cân: bàn chỉ cho biết nồng độ thực sau khi em bấm Kết luận.",
    ],
    realLab: [
      "CuSO₄ độc khi nuốt và gây kích ứng mắt: đeo kính và găng tay, rửa tay sau khi làm.",
      "Không nếm hóa chất; dùng thìa sạch, khô và cân trên giấy hoặc cốc.",
      "Thêm nước vào bình định mức từ từ, đến khi mặt khum chạm vạch.",
    ],
    acknowledgeRequired: true,
  },
  limitations: [
    "Mô hình ở 20 °C; giới hạn tan của NaCl (360 mg/mL) và CuSO₄ (200 mg/mL) là giá trị giả định chờ reviewer Hóa duyệt.",
    "Thể tích chất rắn được bỏ qua: thể tích dung dịch bằng thể tích nước đã thêm, khối lượng riêng của nước là 1 g/mL.",
    "Không mô phỏng sai số cân, bay hơi, thời gian tan hay sai số đọc vạch ngoài làm tròn 1 mL của ống đong.",
  ],
  modes: { explore: true },
  enabledApparatus: [
    { id: "scale", kind: "electronic_scale", slot: "scale_base", labelVi: "Cân điện tử" },
    { id: "B1", kind: "beaker_100ml", slot: "scale_1", labelVi: "Cốc 100 mL" },
    { id: "G1", kind: "graduated_cylinder_100ml", slot: "bench_1", labelVi: "Ống đong 100 mL" },
    { id: "V1", kind: "volumetric_flask_100ml", slot: "bench_2", labelVi: "Bình định mức 100 mL" },
    { id: "waste", kind: "waste_beaker", slot: "waste_slot", labelVi: "Cốc thải" },
    { id: "rod", kind: "glass_rod", slot: "tool_1", labelVi: "Đũa thuỷ tinh" },
    { id: "spoon", kind: "spatula", slot: "tool_2", labelVi: "Thìa lấy hoá chất" },
  ],
  availableReagents: [
    { reagentId: "NaCl_powder", shelfPosition: 1 },
    { reagentId: "CuSO4_powder", shelfPosition: 2 },
    { reagentId: "H2O_pour", shelfPosition: 3 },
  ],
  allowedReactions: [],
  measurements: ["scale", "volume"],
  dispensing: { liquidPresetsMicroliters: [500, 1000, 5000, 10_000, 25_000] },
  solutes: [
    { reagentId: "NaCl_powder", maxMilligramsPerMilliliter: 360, atCelsius: 20 },
    { reagentId: "CuSO4_powder", maxMilligramsPerMilliliter: 200, atCelsius: 20 },
  ],
  targets: [
    { kind: "molarity", id: "nacl-0-1m", titleVi: "Pha 100 mL dung dịch NaCl 0,10 M", reagentId: "NaCl_powder", volumeMicroliters: 100_000, millimolar: 100, toleranceMillimolar: 5 },
    { kind: "mass_percent", id: "cuso4-5pct", titleVi: "Pha 50 g dung dịch CuSO₄ 5 %", reagentId: "CuSO4_powder", solutionMilligrams: 50_000, tenthsPercent: 50, toleranceTenthsPercent: 2 },
  ],
  pedagogy: {
    revealEquations: "never",
    observationPrompts: [
      {
        id: "plan-molarity", kind: "free_text",
        textVi: "Mục tiêu NaCl 0,10 M, 100 mL: em cần bao nhiêu mol NaCl, và bao nhiêu gam? (M của NaCl = 58,5 g/mol). Viết phép tính trước khi cân.",
        focus: { apparatusId: "scale" }, highlightWhen: { measurement: "scale" },
      },
      {
        id: "plan-percent", kind: "free_text",
        textVi: "Mục tiêu 50 g dung dịch CuSO₄ 5 %: khối lượng CuSO₄ và khối lượng nước cần lấy là bao nhiêu? Em đong nước bằng dụng cụ nào, vì sao?",
        focus: { apparatusId: "G1" }, highlightWhen: { measurement: "volume" },
      },
      {
        id: "not-dissolved", kind: "free_text",
        textVi: "Nếu cho quá nhiều chất rắn vào ít nước thì chuyện gì xảy ra sau khi khuấy? Em cần làm gì để pha được dung dịch?",
        focus: { apparatusId: "rod" },
      },
    ],
  },
  review: { status: "draft", notes: "Dữ liệu hoá học và giới hạn tan FL-11 chờ reviewer môn Hoá duyệt." },
};
