import { defineText } from "../../i18n";

const thumbnailAssets = import.meta.glob<string>("./assets/thumbnails/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

function thumbnailFor(labId: string) {
  return thumbnailAssets[`./assets/thumbnails/${labId}.webp`];
}

const text = defineText({
  vi: {
    circuit: { subject: "VẬT LÝ", tag: "THỬ THÁCH", title: "Thắp sáng ý tưởng", description: "Tự lắp mạch điện và tìm cách làm LED sáng an toàn." },
    eye: { subject: "SINH HỌC", tag: "MÔ HÌNH 3D", title: "Thế giới qua đôi mắt", description: "Đi sâu vào cấu tạo mắt và theo dấu hành trình ánh sáng." },
    chemistry: { subject: "HÓA HỌC", tag: "THÍ NGHIỆM", title: "Những biến đổi kỳ diệu", description: "Khám phá phản ứng, quan sát hiện tượng và chất dư." },
    induction: { subject: "VẬT LÝ", tag: "THÍ NGHIỆM 3D", title: "Cảm ứng điện từ", description: "Đẩy, kéo nam châm và quay máy phát để thấy khi nào có dòng điện cảm ứng." },
    density: { subject: "VẬT LÝ", tag: "THỰC HÀNH", title: "Xác định khối lượng riêng", description: "Cân, đo thể tích và tính khối lượng riêng của khối gỗ, nước và hòn sỏi." },
    geneProtein: { subject: "SINH HỌC", tag: "MÔ HÌNH 3D", title: "Từ gene đến protein", description: "Tái bản DNA, phiên mã, dịch mã và quan sát một đột biến điểm làm thay đổi protein." },
    massConservation: { subject: "HÓA HỌC", tag: "THÍ NGHIỆM", title: "Bảo toàn khối lượng", description: "Quan sát phản ứng tạo kết tủa và đối chiếu khối lượng trước, sau phản ứng." },
    lever: { subject: "VẬT LÝ", tag: "THÍ NGHIỆM", title: "Moment lực và đòn bẩy", description: "Đo moment lực, tìm vị trí cân bằng và vận dụng đòn bẩy." },
    ecology: { subject: "SINH HỌC", tag: "MÔ PHỎNG", title: "Giới hạn sinh thái", description: "Đổi nhiệt độ nước ao để tìm giới hạn sinh thái của cá rô phi, rồi tính mật độ và đọc tháp tuổi." },
    foodWeb: { subject: "SINH HỌC", tag: "MÔ PHỎNG", title: "Lưới thức ăn", description: "Dựng chuỗi thức ăn, tính năng lượng qua các bậc và xem điều gì xảy ra khi một loài biến mất." },
  },
  en: {
    circuit: { subject: "PHYSICS", tag: "CHALLENGE", title: "Light up an idea", description: "Build a circuit yourself and find a safe way to light the LED." },
    eye: { subject: "BIOLOGY", tag: "3D MODEL", title: "The world through your eyes", description: "Look inside the eye and follow the path of light." },
    chemistry: { subject: "CHEMISTRY", tag: "EXPERIMENT", title: "Amazing changes", description: "Explore reactions, observe what happens and what is left over." },
    induction: { subject: "PHYSICS", tag: "3D EXPERIMENT", title: "Electromagnetic induction", description: "Push and pull a magnet and turn a generator to see when an induced current appears." },
    density: { subject: "PHYSICS", tag: "PRACTICAL", title: "Measuring density", description: "Weigh, measure volume and work out the density of a wooden block, water and a pebble." },
    geneProtein: { subject: "BIOLOGY", tag: "3D MODEL", title: "From gene to protein", description: "Replicate DNA, transcribe and translate a gene, and see how one point mutation changes the protein." },
    massConservation: { subject: "CHEMISTRY", tag: "EXPERIMENT", title: "Conservation of mass", description: "Observe a precipitation reaction and compare the mass before and after." },
    lever: { subject: "PHYSICS", tag: "EXPERIMENT", title: "Lever equilibrium", description: "Explore force, distance, torque and balance." },
    ecology: { subject: "BIOLOGY", tag: "SIMULATION", title: "Tolerance limits", description: "Change the pond temperature to find the tilapia's tolerance range, then work out density and read an age pyramid." },
    foodWeb: { subject: "BIOLOGY", tag: "SIMULATION", title: "Food webs", description: "Build a food chain, follow energy through the levels and see what happens when a species disappears." },
  },
});
const t = text();


const catalogEntries = [
  {
    id: "circuit",
    ...t.circuit,
    className: "physics",
    number: "01",
  },
  {
    id: "eye",
    ...t.eye,
    className: "biology",
    number: "02",
  },
  {
    id: "chemistry",
    ...t.chemistry,
    className: "chemistry",
    number: "03",
  },
  {
    id: "density",
    ...t.density,
    className: "physics",
    number: "04",
  },
  {
    id: "em-induction",
    ...t.induction,
    className: "physics",
    number: "05",
  },
  {
    id: "gene-protein",
    ...t.geneProtein,
    className: "biology",
    number: "06",
    grade: 9,
  },
  {
    id: "mass-conservation",
    ...t.massConservation,
    className: "chemistry",
    number: "07",
    grade: 8,
  },
  { id: "lever-equilibrium", ...t.lever, className: "physics", number: "08", grade: 8 },
  { id: "ecology-tolerance", ...t.ecology, className: "biology", number: "09", grade: 8 },
  { id: "food-web", ...t.foodWeb, className: "biology", number: "10", grade: 8 },
];

export const labInfo = catalogEntries.map((entry) => ({
  ...entry,
  thumbnail: thumbnailFor(entry.id),
}));
