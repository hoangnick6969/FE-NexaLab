# Screen Specs (Blueprint)

Hệ thống thiết kế đã cung cấp đầy đủ token và component để xây dựng mọi màn hình. Không tạo thêm pattern mới nếu không thực sự cần thiết. Các màn hình được phân loại theo mức độ ưu tiên.

## P0 — Cốt lõi (Bắt buộc)
1. **Xác thực theo đối tượng**:
   - Học sinh đăng nhập mặc định bằng username và mật khẩu do giáo viên cấp, không tự đăng ký và không dùng email để khôi phục.
   - Lần đăng nhập đầu tiên bắt buộc đổi mật khẩu tạm trước khi vào ứng dụng.
   - Giáo viên, phụ huynh và quản trị viên chuyển sang tab người lớn để đăng nhập bằng email.
   - Chỉ phụ huynh được tự đăng ký ở MVP; quên mật khẩu qua email chỉ dành cho người lớn.
   - Giáo viên cấp hoặc reset tài khoản học sinh trong lớp và nhận thẻ credential chỉ hiển thị một lần.
2. **Dashboard Học sinh**: Tương quan Hero banner, Stat cards, Assignments.
3. **Trang Bài học**: Video + lý thuyết + quiz.
4. **Lab Mạch điện (Sandbox)**: Trải nghiệm tự do.
5. **Lab Mạch điện (Challenge)**: Thử thách, chấm điểm với 3 verdict.
6. **AI Tutor panel**: Trạng thái 4 mức gợi ý.
7. **Dashboard Giáo viên**: Quản lý lớp, giao bài.
8. **Bảng phân tích lớp**: Nhận định lỗi sai (misconception) và xem bằng chứng gốc.
9. **Mô hình 3D (Mắt người)**: Viewer + chú thích + chế độ kiểm tra.

## P1 — Mở rộng chức năng
10. **Lab Hóa học**: Chọn dụng cụ/chất, chạy phản ứng, kết quả.
11. **Quiz trắc nghiệm**: Làm bài + chấm.
12. **Hồ sơ thí nghiệm đã lưu**: Danh sách + chi tiết.
13. **Tổng hợp giáo viên toàn lớp**: Biểu đồ hiển thị.
14. **Soạn bài học**: Phía giáo viên, giao diện rich text.

## P2 — Khám phá thêm
15. **Cổng phụ huynh**.
16. **Báo cáo tuần phụ huynh**.
17. **Trang Admin**: CRUD người dùng/lab.
18. **Demo Computer Vision**: Nhận diện cử chỉ tay tương tác mô hình mắt người.

## State bổ sung cho các trang
- **Table**: loading / rỗng / lỗi tải.
- **Input mã lớp**: validate realtime.
- **Lab Canvas**: drag ghost, trạng thái nối dây sai.
- **Toast**: xếp chồng nhiều thông báo.

---

## Topbar Component Spec

### Layout
- `position: sticky; top: 0; z-index: 100` trong `.main-wrap`
- Cao `68px`, `background: #fff`, có `border-bottom: 1px solid var(--line)`
- 3 cột: `[Breadcrumb] [Search] [Actions]`

### Search (`.topbar-search`)
- Input thực tế, `autoComplete="off"`, focus mở dropdown kết quả
- Dropdown `.search-results`: list các kết quả mock gồm icon màu môn học + tên bài + metadata
- Tự ẩn khi click ra ngoài (`mousedown` listener)

### Notification Dropdown (`.notif-dropdown`)
- Trigger: nút Bell `36×36px`, badge đỏ số chưa đọc
- Dropdown `360px`, tối đa `360px` height rồi scroll
- Item chưa đọc: nền `#EFF6FF`, có `.notif-dot` xanh
- Footer link "Xem tất cả thông báo"

### Profile Dropdown (`.profile-dropdown`)
- Trigger: Avatar `29px` (chữ cái đầu), ring outline khi mở
- Header: avatar `42px` + tên + role
- Menu items theo role:
  - **Tất cả**: Thông tin cá nhân, Tình trạng học tập, Cài đặt, Trợ giúp, Đăng xuất
  - **STUDENT thêm**: Báo cáo giáo viên

### Đóng dropdown
- Click outside (`mousedown`) đóng tất cả
- Mở cái này tự đóng cái kia
- Animation: `dropdownIn` 0.18s ease
