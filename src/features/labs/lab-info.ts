import { defineText } from "../../i18n";

const thumbnailAssets = import.meta.glob<string>("./assets/thumbnails/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const svgThumbnailAssets = import.meta.glob<string>("./assets/thumbnails/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});

function thumbnailFor(labId: string) {
  return thumbnailAssets[`./assets/thumbnails/${labId}.webp`] ?? svgThumbnailAssets[`./assets/thumbnails/${labId}.svg`];
}

const text = defineText({
  vi: {
    buoyancy: { subject: "KHTN", tag: "THỰC HÀNH", title: "Lực đẩy Ác-si-mét", description: "Nhúng mẫu vào bình tràn, đọc lực kế và kiểm chứng độ lớn lực đẩy Ác-si-mét." },
    circuit: { subject: "VẬT LÝ", tag: "THỬ THÁCH", title: "Thắp sáng ý tưởng", description: "Tự lắp mạch điện và tìm cách làm LED sáng an toàn." },
    eye: { subject: "SINH HỌC", tag: "MÔ HÌNH 3D", title: "Thế giới qua đôi mắt", description: "Đi sâu vào cấu tạo mắt và theo dấu hành trình ánh sáng." },
    chemistry: { subject: "HÓA HỌC", tag: "THÍ NGHIỆM", title: "Những biến đổi kỳ diệu", description: "Khám phá phản ứng, quan sát hiện tượng và chất dư." },
    induction: { subject: "VẬT LÝ", tag: "THÍ NGHIỆM 3D", title: "Cảm ứng điện từ", description: "Đẩy, kéo nam châm và quay máy phát để thấy khi nào có dòng điện cảm ứng." },
    density: { subject: "VẬT LÝ", tag: "THỰC HÀNH", title: "Xác định khối lượng riêng", description: "Cân, đo thể tích và tính khối lượng riêng của khối gỗ, nước và hòn sỏi." },
    geneProtein: { subject: "SINH HỌC", tag: "MÔ HÌNH 3D", title: "Từ gene đến protein", description: "Tái bản DNA, phiên mã, dịch mã và quan sát một đột biến điểm làm thay đổi protein." },
    eyeOptics: { subject: "SINH HỌC", tag: "THÍ NGHIỆM 3D", title: "Mắt và điều tiết", description: "Gọi tên các bộ phận của mắt, rồi chỉnh thể thủy tinh và kính để ảnh rơi đúng màng lưới." },
    massConservation: { subject: "HÓA HỌC", tag: "THÍ NGHIỆM", title: "Bảo toàn khối lượng", description: "Quan sát phản ứng tạo kết tủa và đối chiếu khối lượng trước, sau phản ứng." },
    lever: { subject: "VẬT LÝ", tag: "THÍ NGHIỆM", title: "Moment lực và đòn bẩy", description: "Đo moment lực, tìm vị trí cân bằng và vận dụng đòn bẩy." },
    thermal: { subject: "VẬT LÝ", tag: "THÍ NGHIỆM", title: "Năng lượng nhiệt", description: "Đo điện năng cấp vào và độ tăng nhiệt độ của mẫu nước trong mô hình nhiệt lượng kế lý tưởng." },
    ecology: { subject: "SINH HỌC", tag: "MÔ PHỎNG", title: "Giới hạn sinh thái", description: "Đổi nhiệt độ nước ao để tìm giới hạn sinh thái của cá rô phi, rồi tính mật độ và đọc tháp tuổi." },
    foodWeb: { subject: "SINH HỌC", tag: "MÔ PHỎNG", title: "Lưới thức ăn", description: "Dựng chuỗi thức ăn, tính năng lượng qua các bậc và xem điều gì xảy ra khi một loài biến mất." },
    acidBase: { subject: "HÓA HỌC", tag: "KHÁM PHÁ", title: "Acid – base, chỉ thị và pH", description: "Tự pha dung dịch, nhúng quỳ tím, nhỏ phenolphthalein và đo pH; quan sát màu đổi khi trung hoà." },
    metalReactivity: { subject: "HÓA HỌC", tag: "KHÁM PHÁ", title: "Kim loại với acid và dung dịch muối", description: "Thả kẽm, sắt, đồng vào acid loãng và dung dịch CuSO₄ để so sánh mức độ hoạt động của kim loại." },
    reactionRate: { subject: "HÓA HỌC", tag: "KHÁM PHÁ", title: "Tốc độ phản ứng", description: "Cho đá vôi (viên hoặc bột) vào acid HCl, bấm giờ và đo khí thu được để so sánh tốc độ phản ứng theo nồng độ và dạng chất rắn." },
    labSafety: { subject: "HÓA HỌC", tag: "KHÁM PHÁ", title: "An toàn phòng thí nghiệm", description: "Đọc nhãn hóa chất, chọn đồ bảo hộ và khám phá cách xử lý ba tình huống trong phòng thí nghiệm." },
    solutionConcentration: { subject: "HÓA HỌC", tag: "KHÁM PHÁ", title: "Dung dịch và nồng độ", description: "Tự tính khối lượng chất tan, cân, hòa tan và thêm nước đến vạch để pha dung dịch NaCl 0,10 M và CuSO₄ 5 %; rồi kiểm tra nồng độ thực." },
    fl26Explore: { subject: "SINH HỌC", tag: "KHÁM PHÁ", title: "Lai Mendel một tính trạng", description: "Chọn cặp bố mẹ, lật từng ô bảng Punnett và tìm tỉ lệ kiểu gen, kiểu hình của đời con." },
    fl20Explore: { subject: "SINH HỌC", tag: "KHÁM PHÁ", title: "Giới hạn sinh thái: nhiệt độ", description: "Đổi nhiệt độ nước và tìm vùng sống của cá rô phi." },
    fl21Explore: { subject: "SINH HỌC", tag: "KHÁM PHÁ", title: "Lưới thức ăn và cân bằng", description: "Bỏ một loài khỏi lưới thức ăn và xem loài nào tăng, loài nào giảm." },
    fl27Explore: { subject: "SINH HỌC", tag: "KHÁM PHÁ", title: "Từ gene đến protein: đột biến", description: "Chọn biến thể gene, đọc mRNA, codon và xem một đột biến điểm đổi axit amin ra sao." },
    fl16Explore: { subject: "SINH HỌC", tag: "KHÁM PHÁ", title: "Cấu tạo mắt và điều tiết", description: "So sánh độ tụ mắt cần có khi nhìn gần, nhìn xa, khi cận thị và viễn thị." },
  },
  en: {
    labSafety: { subject: "CHEMISTRY", tag: "EXPLORE", title: "Laboratory safety", description: "Read chemical labels, choose protective equipment and explore three lab safety scenarios." },
    buoyancy: { subject: "SCIENCE", tag: "PRACTICAL", title: "Archimedes’ buoyancy force", description: "Immerse a specimen, read the dynamometer and verify the buoyant force." },
    circuit: { subject: "PHYSICS", tag: "CHALLENGE", title: "Light up an idea", description: "Build a circuit yourself and find a safe way to light the LED." },
    eye: { subject: "BIOLOGY", tag: "3D MODEL", title: "The world through your eyes", description: "Look inside the eye and follow the path of light." },
    chemistry: { subject: "CHEMISTRY", tag: "EXPERIMENT", title: "Amazing changes", description: "Explore reactions, observe what happens and what is left over." },
    induction: { subject: "PHYSICS", tag: "3D EXPERIMENT", title: "Electromagnetic induction", description: "Push and pull a magnet and turn a generator to see when an induced current appears." },
    density: { subject: "PHYSICS", tag: "PRACTICAL", title: "Measuring density", description: "Weigh, measure volume and work out the density of a wooden block, water and a pebble." },
    geneProtein: { subject: "BIOLOGY", tag: "3D MODEL", title: "From gene to protein", description: "Replicate DNA, transcribe and translate a gene, and see how one point mutation changes the protein." },
    eyeOptics: { subject: "BIOLOGY", tag: "3D EXPERIMENT", title: "The eye and accommodation", description: "Name the parts of the eye, then adjust the lens and glasses so the image lands on the retina." },
    massConservation: { subject: "CHEMISTRY", tag: "EXPERIMENT", title: "Conservation of mass", description: "Observe a precipitation reaction and compare the mass before and after." },
    lever: { subject: "PHYSICS", tag: "EXPERIMENT", title: "Lever equilibrium", description: "Explore force, distance, torque and balance." },
    thermal: { subject: "PHYSICS", tag: "EXPERIMENT", title: "Thermal energy", description: "Measure electrical input and water temperature rise in an ideal calorimeter model." },
    ecology: { subject: "BIOLOGY", tag: "SIMULATION", title: "Tolerance limits", description: "Change the pond temperature to find the tilapia's tolerance range, then work out density and read an age pyramid." },
    foodWeb: { subject: "BIOLOGY", tag: "SIMULATION", title: "Food webs", description: "Build a food chain, follow energy through the levels and see what happens when a species disappears." },
    acidBase: { subject: "CHEMISTRY", tag: "EXPLORE", title: "Acids, bases, indicators and pH", description: "Mix solutions, dip litmus paper, add phenolphthalein and measure pH; watch the colour change on neutralization." },
    metalReactivity: { subject: "CHEMISTRY", tag: "EXPLORE", title: "Metals with acid and salt solutions", description: "Drop zinc, iron and copper into dilute acid and CuSO₄ solution to compare how reactive the metals are." },
    reactionRate: { subject: "CHEMISTRY", tag: "EXPLORE", title: "Reaction rate", description: "Drop limestone (chips or powder) into hydrochloric acid, time it and measure the gas collected to compare rates by concentration and by form of the solid." },
    solutionConcentration: { subject: "CHEMISTRY", tag: "EXPLORE", title: "Solutions and concentration", description: "Work out the mass of solute, weigh, dissolve and fill to the mark to prepare 0.10 M NaCl and 5 % CuSO₄, then check the real concentration." },
    fl26Explore: { subject: "BIOLOGY", tag: "EXPLORE", title: "Mendel's monohybrid cross", description: "Pick two parents, reveal each Punnett cell and find the genotype and phenotype ratios." },
    fl20Explore: { subject: "BIOLOGY", tag: "EXPLORE", title: "Tolerance limits: temperature", description: "Change the water temperature and find where the tilapia can live." },
    fl21Explore: { subject: "BIOLOGY", tag: "EXPLORE", title: "Food webs and balance", description: "Remove one species from the food web and see which species rise or fall." },
    fl27Explore: { subject: "BIOLOGY", tag: "EXPLORE", title: "From gene to protein: mutation", description: "Pick a gene variant, read the mRNA and codons, and see how a point mutation changes an amino acid." },
    fl16Explore: { subject: "BIOLOGY", tag: "EXPLORE", title: "The eye and accommodation", description: "Compare the lens power the eye needs for near and far vision, and with myopia and hyperopia." },
  },
});
const t = text();


const catalogEntries = [
  { id: "buoyancy", ...t.buoyancy, className: "physics", number: "09", grade: 8 },
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
  { id: "thermal-energy", ...t.thermal, className: "physics", number: "10", grade: 8 },
  { id: "ecology-tolerance", ...t.ecology, className: "biology", number: "09", grade: 8 },
  { id: "eye-optics", ...t.eyeOptics, className: "biology", number: "10", grade: 8 },
  { id: "food-web", ...t.foodWeb, className: "biology", number: "11", grade: 8 },
  { id: "acid-base-indicators", ...t.acidBase, className: "chemistry", number: "12", grade: 8 },
  { id: "metal-reactivity", ...t.metalReactivity, className: "chemistry", number: "13", grade: 8 },
  { id: "solution-concentration", ...t.solutionConcentration, className: "chemistry", number: "14", grade: 8 },
  { id: "reaction-rate", ...t.reactionRate, className: "chemistry", number: "15", grade: 8 },
  { id: "lab-safety", ...t.labSafety, className: "chemistry", number: "16", grade: 8, localizedCopy: true },
  // Explore benches (Kit Sinh học, Dev 2). `artOf` reuses the thumbnail and icon of the Guided Lab on the same topic.
  { id: "fl-26-explore", ...t.fl26Explore, className: "biology", number: "26", grade: 9, artOf: "gene-protein" },
  { id: "fl-20-explore", ...t.fl20Explore, className: "biology", number: "20", grade: 8, artOf: "ecology-tolerance" },
  { id: "fl-21-explore", ...t.fl21Explore, className: "biology", number: "21", grade: 8, artOf: "food-web" },
  { id: "fl-27-explore", ...t.fl27Explore, className: "biology", number: "27", grade: 9, artOf: "gene-protein" },
  { id: "fl-16-explore", ...t.fl16Explore, className: "biology", number: "16", grade: 8, artOf: "eye-optics" },
];

export const labInfo = catalogEntries.map((entry) => {
  const artOf = "artOf" in entry ? entry.artOf : undefined;
  return {
    ...entry,
    localizedCopy: "localizedCopy" in entry && entry.localizedCopy,
    /** Lab id whose icon the card draws; Explore benches borrow the Guided Lab on the same topic. */
    artId: artOf ?? entry.id,
    // FL-26 has its own SVG banner instead of borrowing the gene-protein scene.
    thumbnail: thumbnailFor(entry.id === "fl-26-explore" ? entry.id : (artOf ?? entry.id)) ?? (entry.id === "buoyancy" ? thumbnailFor("density") : undefined),
  };
});
