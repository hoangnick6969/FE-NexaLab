import type { ApparatusKind, VesselKind } from "@nexalab/sim/wet-bench";
import type { SharedItemId } from "../../../shared/items/catalog";

/** How a held item is used on a target. */
export type HeldTool = "litmus_paper" | "ph_meter" | "stopper" | "dropper" | "tongs" | "spatula" | "glass_rod";

/** K2 apparatus defined once; Lab configs only choose which ones appear and where. */
export type ApparatusDef = {
  kind: ApparatusKind;
  role: "vessel" | "tool" | "instrument" | "fixture";
  labelVi: string;
  purposeVi: string;
  /** Tool picked up when the learner selects this apparatus. */
  tool?: HeldTool;
  /** Vessels the learner may carry to another slot (pour or move). */
  movable?: boolean;
  /** Shared library item that draws this kind; kinds without one are drawn by this bench. */
  sharedItem?: SharedItemId;
};

export const K2_APPARATUS: Readonly<Record<ApparatusKind, ApparatusDef>> = {
  test_tube: { kind: "test_tube", role: "vessel", labelVi: "Ống nghiệm", purposeVi: "Chứa lượng nhỏ dung dịch để thử và so sánh màu." },
  beaker_100ml: { kind: "beaker_100ml", role: "vessel", labelVi: "Cốc thuỷ tinh 100 mL", purposeVi: "Pha trộn, trung hoà dung dịch với lượng lớn hơn.", movable: true, sharedItem: "beaker" },
  erlenmeyer_flask_100ml: { kind: "erlenmeyer_flask_100ml", role: "vessel", labelVi: "Bình tam giác 100 mL", purposeVi: "Bình miệng hẹp, đậy được nút cao su.", movable: true },
  waste_beaker: { kind: "waste_beaker", role: "vessel", labelVi: "Cốc chất thải", purposeVi: "Đổ bỏ dung dịch để làm sạch vật chứa và thử lại.", sharedItem: "beaker" },
  test_tube_rack_6: { kind: "test_tube_rack_6", role: "fixture", labelVi: "Giá ống nghiệm", purposeVi: "Giữ 6 ống nghiệm thẳng đứng để so sánh song song." },
  dropper_pipette: { kind: "dropper_pipette", role: "tool", tool: "dropper", labelVi: "Ống nhỏ giọt", purposeVi: "Bấm vào lọ để hút dung dịch, rồi nhỏ vào ống nghiệm hoặc cốc: 1 giọt = 0,05 mL." },
  litmus_strip_dispenser: { kind: "litmus_strip_dispenser", role: "tool", tool: "litmus_paper", labelVi: "Hộp giấy quỳ tím", purposeVi: "Nhúng vào dung dịch: đỏ khi acid, xanh khi base, giữ tím khi trung tính." },
  digital_ph_meter: { kind: "digital_ph_meter", role: "instrument", tool: "ph_meter", labelVi: "Bút đo pH điện tử", purposeVi: "Cắm vào dung dịch để đọc pH chính xác đến 0,1." },
  tongs: { kind: "tongs", role: "tool", tool: "tongs", labelVi: "Kẹp gắp", purposeVi: "Gắp chất rắn (hạt, viên, đinh, lá kim loại) từ lọ rồi thả vào ống nghiệm." },
  stopper: { kind: "stopper", role: "tool", tool: "stopper", labelVi: "Nút cao su", purposeVi: "Đậy hoặc mở miệng bình tam giác." },
  graduated_cylinder_100ml: { kind: "graduated_cylinder_100ml", role: "vessel", labelVi: "Ống đong 100 mL", purposeVi: "Đo thể tích chất lỏng: đọc vạch chia ở đáy mặt khum, chính xác đến 1 mL.", movable: true, sharedItem: "graduated-cylinder" },
  volumetric_flask_100ml: { kind: "volumetric_flask_100ml", role: "vessel", labelVi: "Bình định mức 100 mL", purposeVi: "Pha dung dịch có thể tích chính xác: thêm nước đến vạch 100 mL.", movable: true },
  glass_rod: { kind: "glass_rod", role: "tool", tool: "glass_rod", labelVi: "Đũa thuỷ tinh", purposeVi: "Khuấy để chất rắn tan: chọn đũa rồi chọn vật chứa." },
  spatula: { kind: "spatula", role: "tool", tool: "spatula", labelVi: "Thìa lấy hoá chất", purposeVi: "Lấy chất rắn dạng bột: chọn thìa, chọn lọ, nhập khối lượng rồi chọn vật chứa." },
  electronic_scale: { kind: "electronic_scale", role: "instrument", labelVi: "Cân điện tử", purposeVi: "Cân tổng khối lượng các vật chứa đặt trên đĩa cân (0,01 g).", sharedItem: "digital-scale" },
};

export const isVesselKind = (kind: ApparatusKind): kind is VesselKind =>
  kind === "test_tube" || kind === "beaker_100ml" || kind === "erlenmeyer_flask_100ml" || kind === "waste_beaker" || kind === "graduated_cylinder_100ml" || kind === "volumetric_flask_100ml";
