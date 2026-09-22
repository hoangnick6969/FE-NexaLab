---
name: nexalab-ui
description: Chứa các quy tắc, triết lý và tiêu chuẩn thiết kế khắt khe dành riêng cho frontend của NexaLab (Educational Workbench). Cần đọc khi xây dựng UI, style components, hoặc đánh giá thiết kế.
---

# NexaLab UI Design Discipline

Kỹ năng này xác định các quy tắc thiết kế nghiêm ngặt mà bất kỳ AI agent nào làm việc với UI/UX của NexaLab đều phải tuân thủ. NexaLab là một "phòng thí nghiệm kỹ thuật số", không phải một SaaS app chung chung.

## 1. Triết Lý Cốt Lõi (Educational Workbench)
- **Giảm Tải Nhận Thức:** Môi trường tĩnh lặng. `blue-900` (Blue Coursera style) là điểm nhấn duy nhất. Không dùng gradient đa màu.
- **Màu Sắc Có Ngữ Nghĩa (Semantic Colors):** Màu teal (`accent-teal`), xanh lá (`accent-green`), hồng/đỏ cam (`accent-rose`) và màu trạng thái (verdict) bị khóa chặt với ý nghĩa của nó. Không tô ngẫu nhiên để trang trí.
- **Giao Diện Trung Thực (Honest UI):** Không shadow nhiều lớp, không vẽ trình duyệt giả, không dùng số liệu bịa đặt. Phân tách layout bằng nền (`bg-surface`, `bg-inset`) và viền (`border`).

## 2. Quy Tắc Typography Cứng (2+1 Font)
- Mặc định dùng **Lexend** (tăng khả năng đọc). Số liệu mô phỏng dùng **IBM Plex Mono**.
- **Cấm:** ALL CAPS không cần thiết, tiêu đề in nghiêng (italic headers), đổi màu chữ ngẫu nhiên.
- Nội dung phải căn trái. Độ dài dòng tối đa 75 ký tự.

## 3. Kháng Khuôn Mẫu "AI Slop"
- **Không dùng Emojis** (🚀, 💡, 🎨) làm icon. Dùng SVG (Lucide/Phosphor) 1.5px stroke.
- Không thêm mũi tên trang trí (`→`) ở cuối các nút nhấn.
- Không dùng shadow lan man. Chỉ 1 cấp shadow nhẹ (`0 1px 2px rgba(...)`) hoặc cho vật phẩm kéo thả.

## 4. Tương Tác & Trợ Năng (Pro-Max Standards)
- Component tương tác phải có đủ các trạng thái: default, hover (chỉ đổi màu, không đổi scale gây giật), focus-visible (viền 2px), active, disabled.
- **Touch Target:** Kích thước vùng chạm bấm tối thiểu `44x44px` trên di động.
- **Độ Tương Phản:** Chữ và nền phải đạt chuẩn WCAG AA. Không dùng xám nhạt cho văn bản.

## Khi Nào Kích Hoạt Kỹ Năng Này
- Khi viết các file component UI, React, CSS.
- Khi tạo các view mới cho người dùng.
- Khi đánh giá lại UI/UX của một module hiện tại.

Luôn đối chiếu code được tạo ra với các luật khắt khe này. Càng kỷ luật, UI của NexaLab càng thể hiện tính chuyên nghiệp và "thực" của một phòng Lab Giáo Dục.
