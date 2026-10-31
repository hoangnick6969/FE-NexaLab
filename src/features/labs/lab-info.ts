import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    circuit: { subject: "VẬT LÝ", tag: "THỬ THÁCH", title: "Thắp sáng ý tưởng", description: "Tự lắp mạch điện và tìm cách làm LED sáng an toàn." },
    eye: { subject: "SINH HỌC", tag: "MÔ HÌNH 3D", title: "Thế giới qua đôi mắt", description: "Đi sâu vào cấu tạo mắt và theo dấu hành trình ánh sáng." },
    chemistry: { subject: "HÓA HỌC", tag: "THÍ NGHIỆM", title: "Những biến đổi kỳ diệu", description: "Khám phá phản ứng, quan sát hiện tượng và chất dư." },
    induction: { subject: "VẬT LÝ", tag: "THÍ NGHIỆM 3D", title: "Cảm ứng điện từ", description: "Đẩy, kéo nam châm và quay máy phát để thấy khi nào có dòng điện cảm ứng." },
    density: { subject: "VẬT LÝ", tag: "THỰC HÀNH", title: "Xác định khối lượng riêng", description: "Cân, đo thể tích và tính khối lượng riêng của khối gỗ, nước và hòn sỏi." },
    massConservation: { subject: "HÓA HỌC", tag: "THÍ NGHIỆM", title: "Bảo toàn khối lượng", description: "Quan sát phản ứng tạo kết tủa và đối chiếu khối lượng trước, sau phản ứng." },
  },
  en: {
    circuit: { subject: "PHYSICS", tag: "CHALLENGE", title: "Light up an idea", description: "Build a circuit yourself and find a safe way to light the LED." },
    eye: { subject: "BIOLOGY", tag: "3D MODEL", title: "The world through your eyes", description: "Look inside the eye and follow the path of light." },
    chemistry: { subject: "CHEMISTRY", tag: "EXPERIMENT", title: "Amazing changes", description: "Explore reactions, observe what happens and what is left over." },
    induction: { subject: "PHYSICS", tag: "3D EXPERIMENT", title: "Electromagnetic induction", description: "Push and pull a magnet and turn a generator to see when an induced current appears." },
    density: { subject: "PHYSICS", tag: "PRACTICAL", title: "Measuring density", description: "Weigh, measure volume and work out the density of a wooden block, water and a pebble." },
    massConservation: { subject: "CHEMISTRY", tag: "EXPERIMENT", title: "Conservation of mass", description: "Observe a precipitation reaction and compare the mass before and after." },
  },
});
const t = text();


export const labInfo = [
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
    id: "mass-conservation",
    ...t.massConservation,
    className: "chemistry",
    number: "06",
  },
];
