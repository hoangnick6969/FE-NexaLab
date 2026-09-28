# Component System (Shared Library)

Tập primitive dùng lại ở mọi màn hình — thiết kế trước, không lặp lại quyết định ở từng tính năng.

## 1. Button
| Loại | Nền | Chữ | Viền |
|---|---|---|---|
| Primary | `blue-900` | trắng | không |
| Secondary | `bg-surface` | `text-primary` | 1px `border` |
| Ghost | trong suốt | `text-secondary` | không |
| Destructive | `verdict-fail` 10% | `verdict-fail` | không |

**Trạng thái (Interactive Discipline):** default, hover (tối hơn 8%), active (tối hơn 12%), disabled (opacity 40%), focus-visible (viền 2px blue-900 offset 2px).

## 2. Input & Textarea
Nền `bg-inset`, viền 1px `border`, radius `sm`, cao 40, padding ngang 12. 
- Focus: viền `blue-900` 1.5px + nền `bg-surface`.
- Error: viền `verdict-fail`, dòng lỗi `caption` màu `verdict-fail` phía dưới.

## 3. Select / Dropdown
Giống Input, thêm icon chevron phải 16px. Menu mở: `bg-surface`, radius `sm`, shadow cấp 2, item cao 36, hover nền `bg-inset`.

## 4. Checkbox / Radio / Toggle
Kích thước 20×20. Trạng thái on dùng `blue-900`. Không dùng màu accent cho control.

## 5. Tag / Badge / Chip
Radius `full`, padding 4/12.
- **Màu môn học**: viền mảnh, nền trong suốt.
- **Verdict**: nền màu verdict 12%, chữ verdict đậm.
- **Trung tính**: nền `bg-inset`, chữ `text-secondary`.

## 6. Avatar
Tròn, 3 cỡ 24/32/40. Không có ảnh: hiển thị chữ cái đầu tên, nền `blue-200`, chữ `blue-900`.

## 7. Tooltip
Nền `text-primary` (đảo màu), chữ trắng `caption`, radius `sm`, padding 6/10, xuất hiện sau 400ms hover.

## 8. Modal / Dialog
Radius `lg`, padding 32, max-width 480 (xác nhận) hoặc 720 (form dài). Overlay `rgba(22,33,28,.32)`.

## 9. Toast / Snackbar
Góc dưới phải, `bg-surface`, viền trái 3px màu ngữ nghĩa, radius `sm`, tự ẩn sau 4s. Tối đa xếp chồng 2.

## 10. Tabs (Segmented control)
Nền `bg-inset`, radius `full`, tab active nền `blue-900` chữ trắng. Dùng cho chuyển view, không cho điều hướng cấp trang.

## 11. Breadcrumb & Pagination
Breadcrumb: `caption`, phân cách bằng chevron 12px.
Pagination: Chip tròn 32px, trang hiện tại nền `blue-900`.

## 12. Progress bar
Track `blue-200`, fill `green-500`, radius `full` — dùng cho tiến độ tuyến tính.

## 13. Skeleton & Empty state
- Skeleton: Khối `bg-inset` bo theo radius component, shimmer ngang.
- Empty state: Icon đơn sắc 48px + `h2` + `body` + nút Primary.
