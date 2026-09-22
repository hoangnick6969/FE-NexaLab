# UX Patterns & Domain Components

Những thành phần giao diện mang tính chất đặc thù của miền giáo dục NexaLab.

## 1. Domain Components (Đặc thù NexaLab)

- **Banner (hero):** Nền `green-900`, `radius-lg`, padding 32. Trái: Nội dung (`h1`, nút). Phải: Minh họa line-art (tối đa 40% chiều rộng).
- **Stat card:** Cao 132, `radius-md`, padding 20, nền theo `accent` tương ứng.
- **Lesson / Lab card:** `bg-surface`, viền 1px, `radius-md`. Có dải màu môn học 3px bám mép trái. Thumbnail 4:3.
- **Hint Ladder (Bậc gợi ý AI):** 4 nấc dọc, cao 8px. Nấc đã dùng tô đặc màu môn học; nấc chưa tới viền 1px `border`.
- **AI Tutor panel:** `bg-surface`, `radius-lg`. Không dùng bong bóng chat tròn kiểu messenger.
- **Simulation readout:** Lưới mặt đồng hồ đo. Trị số dùng IBM Plex Mono. **Không** đổi màu theo đúng/sai.
- **Verdict badge:** 3 trạng thái cố định (Pass, Partial, Fail).
- **Lab viewer (3D / Canvas):** Vùng render `bg-inset` (≥ 60% cao). Toolbar nổi đáy: `bg-surface`, `radius-full`.
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
