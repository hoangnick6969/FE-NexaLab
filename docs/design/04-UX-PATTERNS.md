# UX Patterns & Domain Components

> Với vai trò Học sinh P0, đọc [08. Student P0 UX Definition](08-STUDENT-P0-UX-DEFINITION.md) trước. AI Tutor/Hint là P1 theo PRD, không phải một panel P0.

Những thành phần giao diện mang tính chất đặc thù của miền giáo dục NexaLab.

## 1. Domain Components (Đặc thù NexaLab)

- **Banner (hero):** Nền `subject-*` khi hero thuộc một bài học cụ thể, hoặc `surface` trong ngữ cảnh trung tính; `radius-lg`, padding 32. Trái: Nội dung (`h1`, một CTA). Phải: Minh họa line-art theo môn (tối đa 40% chiều rộng).
- **Stat card:** Cao 132, `radius-md`, padding 20, nền `surface`. Chỉ dùng nền `subject-*` khi con số thật sự thuộc một môn, không tô ba card chỉ số bằng ba màu môn cho cân đối thị giác.
- **Lesson / Lab card:** `surface`, viền 1px, `radius-md`. Có dải màu môn học 3px bám mép trái khi card mang một môn xác định. Thumbnail 4:3.
- **Hint Ladder và AI Tutor panel (P1):** giữ lại cho giai đoạn sau Release 1; không đưa vào luồng hoặc dashboard Học sinh P0.
- **Simulation readout:** Lưới mặt đồng hồ đo. Trị số dùng IBM Plex Mono. **Không** đổi màu theo đúng/sai.
- **Verdict badge:** 3 trạng thái cố định (Pass, Partial, Fail).
- **Lab viewer (3D / Canvas):** Vùng render `surface-subtle` (≥ 60% cao). Toolbar nổi đáy: `surface`, `radius-full`.
- **Teacher table & evidence:** Mỗi dòng nhận định AI kèm nút Ghost "Xem bằng chứng". Truy được nguồn.

## 2. Kỷ luật Thiết kế (Pro-Max Standards)

1. **Cấu trúc & Đa dạng (Structural Variety):** Bố cục trang phụ thuộc vào nội dung (Workbench, Document, Canvas), không ép mọi thứ vào thẻ SaaS-card nhàm chán.
2. **Thẩm mỹ phi trang trí (Restraint):** Không chồng nhiều lớp shadow. Radius tuân thủ tuyệt đối phân cấp. Lớp lang UI được phân cách bằng màu nền và viền.
3. **Tương tác & Trạng thái (Microinteractions):** Mọi component tương tác bắt buộc phải thiết kế đủ 8 trạng thái. Trạng thái hover không được làm giật layout.
4. **Nội dung trung thực (Honest Copy):** Copy nhất quán, không dùng số liệu bịa đặt, không vẽ thanh trình duyệt giả (fake UI chrome).
5. **Kiểm soát Màu sắc & Typography:** Accent có giới hạn diện tích. Cấm ALL CAPS cho nhãn phụ, tuyệt đối không dùng tiêu đề in nghiêng (italic headers). Cấm biểu họa emoji.
6. **Iconography & Illustration:** Dùng icon SVG thuần 1.5px. Minh họa line art đơn sắc, chân thực. Cấm khối 3D trừu tượng, ảnh stock vô hồn.

## 3. Motion & Animation
- **Simulation:** Số đếm tăng dần 400ms.
- **Hover thẻ:** Viền đậm, không translateY (120ms).
- **Mở modal:** Fade + scale 0.98→1 (160ms).
- **Toast:** Slide-in 8px + fade (160ms).
- Tôn trọng `prefers-reduced-motion`. Không fade-slide-up hàng loạt khi cuộn trang.
