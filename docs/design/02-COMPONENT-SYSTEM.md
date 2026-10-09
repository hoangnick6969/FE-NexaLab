# Component System (Shared Library)

Tập primitive dùng lại ở mọi màn hình. Mỗi component nhận token từ [Foundations](01-DESIGN-FOUNDATIONS.md), không tự thêm màu mới theo từng feature.

## 1. Button

| Loại | Nền | Chữ | Viền |
| --- | --- | --- | --- |
| Primary | `primary` | trắng | không |
| Learning action | `action` | `text` | không |
| Secondary | `surface` | `text` | 1px `border` |
| Ghost | trong suốt | `text-muted` | không |
| Destructive | `state-error` | `state-error-ink` | không |

`Learning action` chỉ dùng cho một bước kế tiếp của lộ trình học trên một màn hình. Các hành động còn lại dùng `Primary`, `Secondary` hoặc `Ghost`.

**Trạng thái:** default, hover (tối hơn 8%), active (tối hơn 12%), disabled (opacity 40%), focus-visible (viền 2px `primary` offset 2px). Kích thước tap tối thiểu là 44×44px.

## 2. Input and textarea

Nền `surface-subtle`, viền 1px `border`, radius `sm`, cao 40, padding ngang 12.

- Focus: viền `primary` 1.5px + nền `surface`.
- Error: viền `state-error-ink`, dòng lỗi `caption` cùng màu phía dưới.

## 3. Select and dropdown

Giống Input, thêm icon chevron phải 16px. Menu mở: `surface`, radius `sm`, shadow cấp 2, item cao 36, hover nền `surface-subtle`.

## 4. Checkbox, radio and toggle

Kích thước 20×20. Trạng thái on dùng `primary`. Không dùng màu môn học cho control.

## 5. Tag, badge and chip

Radius `full`, padding 4/12.

- **Môn học:** nền `subject-*` và chữ `subject-*-ink`, chỉ khi tag đại diện cho môn học thực tế.
- **Verdict:** nền state 12%, icon và chữ state đậm.
- **Trung tính:** nền `surface-subtle`, chữ `text-muted`.

## 6. Avatar

Tròn, 3 cỡ 24/32/40. Không có ảnh: hiển thị chữ cái đầu tên, nền `surface-subtle`, chữ `primary`.

## 7. Tooltip

Nền `text` (đảo màu), chữ trắng `caption`, radius `sm`, padding 6/10, xuất hiện sau 400ms hover.

## 8. Modal and dialog

Radius `lg`, padding 32, max-width 480 (xác nhận) hoặc 720 (form dài). Overlay `rgba(20,32,43,.32)`.

## 9. Toast and snackbar

Góc dưới phải, `surface`, viền trái 3px màu ngữ nghĩa, radius `sm`, tự ẩn sau 4s. Tối đa xếp chồng 2.

## 10. Tabs

Nền `surface-subtle`, radius `full`, tab active nền `primary` chữ trắng. Dùng cho chuyển view, không cho điều hướng cấp trang.

## 11. Breadcrumb and pagination

Breadcrumb: `caption`, phân cách bằng chevron 12px. Pagination: chip tròn 32px, trang hiện tại nền `primary`.

## 12. Progress bar

Track `surface-subtle`, fill `primary`, radius `full` — dùng cho tiến độ tuyến tính. Khi progress thuộc một bài có môn xác định, fill có thể dùng `subject-*-ink`; không dùng màu môn cho mức độ thành công.

## 13. Skeleton and empty state

- Skeleton: khối `surface-subtle` bo theo radius component, shimmer ngang.
- Empty state: icon đơn sắc 48px + `h2` + `body` + một nút Primary.
