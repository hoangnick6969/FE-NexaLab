# Accessibility (Trợ Năng) & QA Checklist

## 1. Trợ Năng (Accessibility - CRITICAL)

- **Độ Tương Phản (Contrast):** Mọi cặp chữ/nền phải đạt tiêu chuẩn tối thiểu WCAG AA (tỉ lệ 4.5:1 cho `body`/`label`).
- **Bàn Phím (Keyboard Navigation):** Mọi phần tử tương tác bắt buộc có trạng thái `focus-visible` hiển thị rõ ràng (viền `2px green-900`, offset 2px).
- **Touch Targets:** Kích thước vùng chạm tối thiểu phải đạt `44x44px` trên di động/tablet, bao gồm cả icon-only buttons.
- **Con trỏ (Cursors):** Bắt buộc có class `cursor-pointer` cho mọi thẻ/hàng bấm được.
- **Motion:** Tôn trọng `prefers-reduced-motion` trong CSS, vô hiệu hóa transform, chỉ giữ lại opacity.

## 2. Checklist Duyệt Màn Hình (QA)

Sử dụng danh sách này trước khi hoàn thành một màn hình UI:

- [ ] Chỉ có tối đa một khối màu `green-900` đậm đóng vai trò neo thị giác trên màn hình.
- [ ] Màu Accent/Verdict tuân thủ đúng tỉ lệ diện tích, không dùng làm màu nền lớn. Không vượt quá 2 màu accent liền kề (ngoại lệ duy nhất: hàng 3 stat card).
- [ ] Mọi khoảng cách (padding, margin, gap) đều là bội số của 4 (theo §3 Spacing).
- [ ] Border radius sử dụng đúng cấp bậc (`sm/md/lg/full`), không gán cứng pixel lộn xộn.
- [ ] Không có gradient nhiều màu chói. Không dùng ALL CAPS cho chữ thường. Không nhồi nhét mũi tên `→` ở cuối nút/link sai mục đích.
- [ ] Không dùng blob 3D, ảnh stock, hay biểu tượng emoji (🚀, 💡) trong UI. Chỉ dùng icon SVG đơn sắc (stroke 1.5px).
- [ ] Mọi component bấm được đều có thiết kế đủ trạng thái (hover, focus, disabled).
- [ ] Simulation readout sử dụng font `IBM Plex Mono` và giữ màu trung tính, không bị tô màu theo logic Đúng/Sai.
- [ ] Các khối nội dung căn lề trái chuẩn xác. Bóng đổ (shadow) chỉ sử dụng một cấp độ tinh tế.
- [ ] Chữ không bị dùng in nghiêng (italic) làm tiêu đề.
- [ ] Lời văn trung thực, phản ánh đúng thực tế, tuân thủ đúng giọng điệu của vai người dùng.
