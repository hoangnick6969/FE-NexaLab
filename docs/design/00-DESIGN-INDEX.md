# NexaLab Design System Index

Chào mừng đến với hệ thống tài liệu thiết kế (Design System) của NexaLab. Tài liệu này quy chuẩn thiết kế UI/UX dành riêng cho môi trường giáo dục (Educational Workbench).

Giao diện không phải là một "SaaS dashboard" trang trí, mà là một **phòng thí nghiệm kỹ thuật số** — nơi học sinh tập trung vào thao tác, số liệu và kiến thức.
Mọi quyết định thiết kế tuân theo tinh thần: **Rành mạch, Khoa học, và Phi trang trí.** Mọi màn hình dựng từ token và component trong hệ thống này — không tự phát sinh giá trị mới ngoài bảng.

## Mục lục tài liệu

- [01. Foundations (Màu sắc, Typography, Spacing)](01-DESIGN-FOUNDATIONS.md)
- [02. Component System (Thư viện UI nền tảng)](02-COMPONENT-SYSTEM.md)
- [03. Layout & Responsive (Cấu trúc màn hình)](03-LAYOUT-RESPONSIVE.md)
- [04. UX Patterns & Domain Components (Thành phần đặc thù)](04-UX-PATTERNS.md)
- [05. Screen Specs (Đặc tả các màn hình)](05-SCREEN-SPECS.md)
- [06. Content & Copywriting (Giọng văn)](06-CONTENT-I18N.md)
- [07. Accessibility & QA (Trợ năng và Kiểm thử)](07-ACCESSIBILITY-QA.md)

---

## Triết lý Thiết kế (Educational Philosophy)

NexaLab từ chối các khuôn mẫu "AI slop" và SaaS chung chung (như bóng đổ nhiều lớp, nền tối neon chói, text ALL CAPS không cần thiết, hoặc gradient vô nghĩa). Sự đa dạng kiến trúc (structural variety) quan trọng hơn sự màu mè.

Ba nguyên lý sư phạm chi phối mọi quyết định:

1. **Giảm thiểu tải nhận thức (Cognitive Load Reduction):** Môi trường học tập cần sự tĩnh lặng. `green-900` là điểm neo thị giác duy nhất (sidebar, banner, nút chính). Không có khối đậm thứ hai cạnh tranh sự chú ý.
2. **Màu sắc mang ý nghĩa tuyệt đối (Semantic Colors):** Màu sắc là dữ liệu. Màu vàng/xanh/tím và màu verdict bị khóa cứng với ý nghĩa của nó (môn học/kết quả), không bao giờ tô ngẫu nhiên để "trang trí cho đỡ trống".
3. **Mô phỏng chân thực, không giả tạo (Honest UI):** Phân lớp bằng màu nền và viền (Workbench), không dùng bóng đổ chồng lớp. Không sử dụng thanh trình duyệt giả (fake chrome) hay số liệu tự bịa.
