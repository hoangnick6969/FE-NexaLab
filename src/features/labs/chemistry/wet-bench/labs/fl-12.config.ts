import type { ChemistryLabConfig } from "@nexalab/sim/wet-bench";

/**
 * FL-12 · Tốc độ phản ứng (KHTN 8, portfolio slot 10), Explore mode on Kit K2 (engine wet-bench@1.2.0).
 * First slice: limestone (CaCO₃) with hydrochloric acid, gas collected over simulated time. The learner compares the acid
 * concentration (0,1 M against 0,2 M) and the form of the solid (chips against powder). The rate law is a draft assumption
 * that shows the trend: it is not a measurement and it is not reviewed.
 */
export const fl12Config: ChemistryLabConfig = {
  schema: "k2-lab-config/1",
  labId: "reaction-rate",
  catalogId: "FL-12",
  configVersion: 1,
  kit: "k2-wet-bench@1",
  engine: "wet-bench@1.2.0",
  reactionCatalog: "k2-reactions@1",
  title: "Tốc độ phản ứng",
  contextLabel: "KHTN 8 · FL-12",
  outcomeSummary: [
    "Nêu được nồng độ chất và dạng chất rắn (viên hay bột) làm tốc độ phản ứng thay đổi.",
    "Tiến hành thí nghiệm: đậy nút bình, bấm giờ và đọc thể tích khí thu được theo thời gian.",
    "So sánh tốc độ phản ứng của hai bình bằng thể tích khí sau cùng một khoảng thời gian.",
  ],
  safetyBriefing: {
    simulation: [
      "Thời gian trong bài là thời gian mô phỏng: em bấm Chờ để thời gian trôi, đồng hồ trình duyệt không liên quan.",
      "Mô hình chỉ cho thấy xu hướng (nồng độ lớn hơn, bột mịn hơn thì nhanh hơn), không phải số đo thực.",
    ],
    realLab: [
      "HCl ăn mòn và đá vôi bột mịn dễ bay: đeo kính, găng tay, không hít bột.",
      "Khí CO₂ sinh ra làm tăng áp suất: ngoài đời không đậy kín bình mà phải dùng nút có ống dẫn khí.",
      "Chỉ làm thí nghiệm khi có giáo viên hướng dẫn.",
    ],
    acknowledgeRequired: true,
  },
  limitations: [
    "Tốc độ được tính bằng một quy luật đơn giản: tỉ lệ với nồng độ acid, với diện tích bề mặt chất rắn và với lượng chất rắn còn lại. Các hệ số là giả định phần mềm chờ reviewer Hóa duyệt.",
    "Nhiệt độ giữ cố định 25 °C; bài này chưa mô phỏng ảnh hưởng của nhiệt độ hay chất xúc tác.",
    "Thể tích khí quy về 25 °C, 1 atm (24,5 L mỗi mol). Không mô phỏng bọt bám bề mặt, sai số đọc hay áp suất trong bình.",
    "Bình có nút được coi như có ống dẫn khí: khí thu được toàn bộ. Bình không đậy nút thì khí thoát ra ngoài và không đọc được thể tích.",
    "Thời gian tối đa của bài là 10 phút mô phỏng.",
  ],
  modes: { explore: true },
  enabledApparatus: [
    { id: "F1", kind: "erlenmeyer_flask_100ml", slot: "bench_1", labelVi: "Bình 1 (HCl 0,1 M)", initial: { contents: [{ reagentId: "HCl_0_1M", microliters: 20_000 }] } },
    { id: "F2", kind: "erlenmeyer_flask_100ml", slot: "bench_2", labelVi: "Bình 2 (HCl 0,2 M)", initial: { contents: [{ reagentId: "HCl_0_2M", microliters: 20_000 }] } },
    { id: "F3", kind: "erlenmeyer_flask_100ml", slot: "bench_3", labelVi: "Bình 3 (HCl 0,1 M)", initial: { contents: [{ reagentId: "HCl_0_1M", microliters: 20_000 }] } },
    { id: "clock", kind: "stopwatch", slot: "tool_1", labelVi: "Đồng hồ bấm giờ" },
    { id: "tongs", kind: "tongs", slot: "tool_2", labelVi: "Kẹp gắp" },
    { id: "spoon", kind: "spatula", slot: "tool_3", labelVi: "Thìa lấy hoá chất" },
    { id: "stopper", kind: "stopper", slot: "tool_4", labelVi: "Nút cao su có ống dẫn khí" },
    { id: "temp", kind: "thermometer", slot: "waste_slot", labelVi: "Nhiệt kế" },
  ],
  availableReagents: [
    { reagentId: "CaCO3_chips", shelfPosition: 1 },
    { reagentId: "CaCO3_powder", shelfPosition: 2 },
  ],
  allowedReactions: ["gas.caco3-hcl"],
  measurements: ["time", "gas_volume"],
  dispensing: { liquidPresetsMicroliters: [1000] },
  rateModel: {
    kinetic: ["gas.caco3-hcl"],
    kNanomolesPerSecondPerMillimolar: 33,
    surface: { chips: 1, powder: 8 },
    maxSeconds: 600,
    atCelsius: 25,
  },
  pedagogy: {
    revealEquations: "never",
    observationPrompts: [
      {
        id: "compare-concentration", kind: "free_text",
        textVi: "Đậy nút cả ba bình. Cho một viên đá vôi vào Bình 1 (0,1 M) và một viên vào Bình 2 (0,2 M), bấm giờ rồi cho thời gian trôi. Sau 30 giây bình nào thu được nhiều khí hơn, và gấp khoảng mấy lần?",
        focus: { apparatusId: "F2" }, highlightWhen: { measurement: "time" },
      },
      {
        id: "compare-surface", kind: "free_text",
        textVi: "Bấm Làm mới. Cho một viên đá vôi vào Bình 1 và một muỗng bột đá vôi (cùng khối lượng) vào Bình 3. Dạng nào phản ứng nhanh hơn? Vì sao diện tích tiếp xúc làm tốc độ thay đổi?",
        focus: { apparatusId: "F3" }, highlightWhen: { measurement: "time" },
      },
      {
        id: "total-gas", kind: "free_text",
        textVi: "Với bình bột, chờ đủ lâu. Thể tích khí có tăng mãi không? Em giải thích vì sao nó dừng lại và vì sao hai bình HCl 0,1 M cuối cùng có thể thu cùng một lượng khí.",
        focus: { apparatusId: "F3" },
      },
      {
        id: "fair-test", kind: "free_text",
        textVi: "Để so sánh công bằng hai bình, em cần giữ những gì giống nhau và chỉ đổi một yếu tố nào?",
      },
    ],
  },
  review: { status: "draft", notes: "Mô hình tốc độ và các hệ số FL-12 chờ reviewer môn Hoá duyệt." },
};
