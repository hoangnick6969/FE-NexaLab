import type { MolecularExploreConfig } from "@nexalab/sim/explore-kits";

/** FL-27 Explore (K7 bàn phân tử, kit `k7-molecular`): đột biến một gene mô phỏng. Sample config. */
export const fl27Config = {
  schema: "fl27-gene-config@1",
  labId: "fl-27-explore",
  catalogId: "FL-27",
  configVersion: 2,
  kit: "k7-molecular",
  engine: "gene-expression@1.0.0",
  title: "Từ gene đến protein: đột biến",
  contextLabel: "KHTN 9 · FL-27 Explore (mẫu)",
  outcomeSummary: ["Xem một đột biến điểm đổi codon và axit amin như thế nào trong protein."],
  safetyBriefing: { simulation: ["Gene minh hoạ, không phải gene thật."], realLab: ["Không thao tác DNA thật khi chưa có hướng dẫn và thiết bị phù hợp."], acknowledgeRequired: false },
  limitations: ["Một đột biến điểm, một khung đọc. Không có đột biến chèn hay mất đoạn."],
  modes: { explore: true },
  enabledApparatus: [{ id: "gene-strand", kind: "dna_strand", slot: "strand_1", labelVi: "Mạch DNA mô phỏng" }],
  measurements: ["aminoAcids"],
  pedagogy: { observationPrompts: [{ id: "effect", kind: "free_text", textVi: "Đột biến này có đổi axit amin không? Vì sao?" }] },
  // Owner decision 2026-11-16: drop the "Bản nháp · chờ duyệt" label on /labs. Not a subject reviewer sign-off.
  review: { status: "reviewed" },
  spec: { model: "gene-expression@1.0.0", allowedVariants: ["gene-a-missense", "gene-a-nonsense", "gene-a-silent", "gene-b-missense"] },
} satisfies MolecularExploreConfig;
