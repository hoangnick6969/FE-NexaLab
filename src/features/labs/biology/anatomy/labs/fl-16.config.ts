import type { AnatomyExploreConfig } from "@nexalab/sim/explore-kits";

/** FL-16 Explore studio (kit bổ trợ `anatomy`): độ tụ cần có của mắt theo kịch bản. Sample config, chờ SME duyệt. */
export const fl16Config = {
  schema: "fl16-eye-config@1",
  labId: "fl-16-explore",
  catalogId: "FL-16",
  configVersion: 2,
  kit: "anatomy",
  engine: "eye-optics@1.0.0",
  title: "Cấu tạo mắt và điều tiết",
  contextLabel: "Kit bổ trợ · FL-16 Explore (mẫu)",
  outcomeSummary: ["So sánh độ tụ cần có của mắt khi nhìn vật gần và vật ở xa."],
  safetyBriefing: { simulation: ["Mô hình quang học rút gọn, không phải mắt của một người cụ thể."], realLab: ["Không nhìn thẳng vào nguồn sáng mạnh khi quan sát thật."], acknowledgeRequired: false },
  limitations: ["Mô hình quang học rút gọn; không có võng mạc sinh học hay sai số đo."],
  modes: { explore: true },
  enabledApparatus: [{ id: "eye-model", kind: "eye_model", slot: "model_1", labelVi: "Mô hình mắt" }],
  measurements: ["powerD"],
  pedagogy: { observationPrompts: [{ id: "near", kind: "note", textVi: "Vật ở gần cần thể thuỷ tinh tụ mạnh hơn hay yếu hơn vật ở xa?" }] },
  // Owner decision 2026-11-16: drop the "Bản nháp · chờ duyệt" label on /labs. Not a subject reviewer sign-off.
  review: { status: "reviewed" },
  spec: { model: "eye-optics@1.0.0", allowedScenarios: ["normal-near", "myopia-far", "hyperopia-near"] },
} satisfies AnatomyExploreConfig;
