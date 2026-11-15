import type { DioramaExploreConfig } from "@nexalab/sim/explore-kits";

/** FL-20 Explore (K8 bàn sinh thái, kit `k8-diorama`): nhiệt độ và giới hạn sinh thái của một loài. Sample config. */
export const fl20Config = {
  schema: "fl20-tolerance-config@1",
  labId: "fl-20-explore",
  catalogId: "FL-20",
  configVersion: 1,
  kit: "k8-diorama",
  engine: "ecology-tolerance@1.0.0",
  title: "Giới hạn sinh thái: nhiệt độ",
  contextLabel: "KHTN 8 · FL-20 Explore (mẫu)",
  outcomeSummary: ["Tìm vùng nhiệt độ mà loài sống được và nhận ra giới hạn sinh thái."],
  safetyBriefing: { simulation: ["Giới hạn nhiệt độ minh hoạ, không phải số liệu của một loài thật."], realLab: ["Không nuôi sinh vật ở nhiệt độ cực đoan trong lớp học."], acknowledgeRequired: false },
  limitations: ["Chỉ một yếu tố (nhiệt độ) và một loài."],
  modes: { explore: true },
  enabledApparatus: [{ id: "thermometer", kind: "thermometer", slot: "tool_1", labelVi: "Nhiệt kế mô phỏng" }],
  measurements: ["zone"],
  pedagogy: { observationPrompts: [{ id: "zone", kind: "note", textVi: "Tăng nhiệt độ dần. Khi nào loài không còn sống được?" }] },
  review: { status: "draft" },
  spec: { model: "ecology-tolerance@1.0.0", allowedSpecies: ["ca-ro-phi"], factor: "TEMPERATURE" },
} satisfies DioramaExploreConfig;
