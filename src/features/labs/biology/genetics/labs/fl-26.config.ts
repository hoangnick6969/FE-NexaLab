import type { Fl26MendelConfig } from "@nexalab/sim/mendel-config";


/** FL-26 Explore (K8 bàn di truyền, kit `k8-garden`): lai Mendel một tính trạng. Sample config, mirrored by the BE publish input. */
export const fl26Config: Fl26MendelConfig = {
  schema: "fl26-mendel-config@1",
  labId: "fl-26-explore",
  catalogId: "FL-26",
  configVersion: 2,
  kit: "k8-garden",
  engine: "mendel-cross@1.0.0",
  title: "Lai Mendel một tính trạng",
  contextLabel: "KHTN 9 · FL-26 Explore (mẫu)",
  outcomeSummary: [
    "Dự đoán và kiểm tra tỉ lệ kiểu gen, kiểu hình của đời con bằng ma trận Punnett.",
    "Nhận ra trội hoàn toàn: kiểu gen dị hợp Aa biểu hiện kiểu hình trội.",
  ],
  safetyBriefing: {
    simulation: ["Cây đậu và ô Punnett là mô phỏng; tỉ lệ là kỳ vọng, không phải kết quả đếm thật."],
    realLab: ["Trồng đậu Hà Lan thật cần chăm sóc đúng cách; không đưa cây hay hạt ra ngoài nơi thí nghiệm."],
    acknowledgeRequired: false,
  },
  limitations: [
    "Chỉ một tính trạng, trội hoàn toàn. Không có lai hai tính trạng, liên kết gen hay NST giới tính.",
    "Tỉ lệ là số tổ hợp đều nhau trên 4 ô Punnett, không mô phỏng ngẫu nhiên.",
  ],
  modes: { explore: true },
  enabledApparatus: [
    { id: "garden-plot", kind: "pea_plot", slot: "plot_1", labelVi: "Chậu đậu Hà Lan" },
    { id: "punnett-board", kind: "punnett_board", slot: "board_1", labelVi: "Ma trận Punnett" },
  ],
  measurements: ["genotypeRatio", "phenotypeRatio"],
  pedagogy: {
    observationPrompts: [
      { id: "cross", kind: "note", textVi: "Chọn một cặp bố mẹ, đọc ma trận Punnett. Có bao nhiêu ô cho mỗi kiểu gen?" },
      { id: "dominant", kind: "free_text", textVi: "Vì sao cây Aa có kiểu hình giống AA chứ không giống aa?" },
      { id: "ratio", kind: "free_text", textVi: "Với Aa × Aa, tỉ lệ kiểu hình trội : lặn là bao nhiêu? So với tỉ lệ kiểu gen thì sao?" },
    ],
  },
  // Owner decision 2026-11-16: drop the "Bản nháp · chờ duyệt" label on /labs. Not a subject reviewer sign-off.
  review: { status: "reviewed" },
  spec: {
    model: "mendel-cross@1.0.0",
    cross: "monohybrid",
    allowedParents: [["Aa", "Aa"], ["AA", "aa"], ["Aa", "aa"], ["AA", "AA"], ["aa", "aa"]],
  },
};
