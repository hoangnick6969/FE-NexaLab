# Design Foundations

NexaLab là một không gian học Khoa học tự nhiên. Màu sắc cần cho học sinh biết **đang học môn nào**, **cần làm gì tiếp theo** và **hệ thống đang ở trạng thái nào**. Ba ý nghĩa này không được trộn lẫn.

## 1. Color system

### 1.1 Neutral and brand tokens

| Token | Hex | Use |
| --- | --- | --- |
| `bg-frame` | `#C9D3E3` | Khung ngoài của ứng dụng |
| `bg-app` | `#F2F7FA` | Canvas học tập |
| `surface` | `#FFFFFF` | Card, panel, bảng nội dung |
| `surface-subtle` | `#E7EFF3` | Khu vực lồng, input nền, toolbar lab |
| `border` | `#D5E1E7` | Viền nhẹ, divider |
| `text` | `#14202B` | Nội dung và số liệu chính |
| `text-muted` | `#506070` | Mô tả, metadata, nhãn phụ |
| `text-disabled` | `#82909D` | Trạng thái vô hiệu hóa |
| `primary` | `#1F6F78` | Điều hướng active, control chuẩn, link hành động |
| `primary-hover` | `#16565D` | Hover/pressed của `primary` |
| `action` | `#F6C945` | Một CTA dẫn sang bước học kế tiếp |
| `action-hover` | `#E5B72D` | Hover/pressed của `action` |

`primary` tạo sự ổn định cho điều hướng và thao tác. `action` chỉ xuất hiện một lần trong một màn hình học khi nó dẫn đến bước tiếp theo của lộ trình, ví dụ **Xem video** hoặc **Làm quiz**. Không đặt cả hai thành hai CTA cùng cấp.

### 1.2 Subject tokens: material, not generic accents

| Subject | Surface | Ink | Motif | Approved use |
| --- | --- | --- | --- | --- |
| Vật lý | `subject-physics #D3ECF7` | `subject-physics-ink #075985` | Lưới đo, tia sáng, đường sóng mảnh | Nhãn môn, hero bài học, tiến độ bài Vật lý, minh họa dụng cụ đo |
| Hóa học | `subject-chemistry #F5DFC0` | `subject-chemistry-ink #7C3D12` | Điểm nguyên tử, vòng phản ứng, kính thủy tinh | Nhãn môn, hero bài học, tiến độ bài Hóa học, minh họa vật liệu |
| Sinh học | `subject-biology #D9EBC7` | `subject-biology-ink #2E5D22` | Gân lá, vòng tế bào, đường sinh trưởng | Nhãn môn, hero bài học, tiến độ bài Sinh học, minh họa quan sát |

Các màu này lấy cảm hứng từ hiện tượng và vật liệu của từng môn: ánh sáng và phép đo, khoáng chất và phản ứng, lá và sự sống. Motif chỉ dùng rất mờ trong hero hoặc nhãn môn; không phủ lên toàn bộ card, không dùng gradient và không đưa vào dữ liệu.

Màu môn **không** biểu thị mức độ tốt/xấu, hạn nộp hay loại chỉ số. Một card “Bài còn lại” là card trung tính cho đến khi nó thực sự đại diện cho một môn cụ thể.

### 1.3 Learning and system states

| Token | Surface / ink | Meaning |
| --- | --- | --- |
| `state-success` | `#D9EBC7` / `#2E5D22` | Đạt, hoàn thành |
| `state-progress` | `#FFF1C2` / `#7A5A00` | Đang làm, đạt một phần |
| `state-practice` | `#F8D9EE` / `#8A2F6A` | Cần luyện thêm |
| `state-error` | `#FDE0DC` / `#A3281C` | Lỗi hệ thống, không dùng để chấm học sinh |

Mỗi trạng thái luôn có icon và chữ. `Cần luyện thêm` là phản hồi học tập, không phải lỗi hay phán xét năng lực.

### 1.4 Contrast baseline

Các cặp token chính đã được kiểm tra theo công thức tương phản WCAG trước khi ghi vào hệ thống:

| Foreground on background | Ratio |
| --- | --- |
| `#FFFFFF` trên `primary` | 5.83:1 |
| `text` trên `action` | 10.51:1 |
| `subject-physics-ink` trên `subject-physics` | 6.16:1 |
| `subject-chemistry-ink` trên `subject-chemistry` | 6.39:1 |
| `subject-biology-ink` trên `subject-biology` | 6.16:1 |
| `text-muted` trên `bg-app` | 5.99:1 |

Mục tiêu mặc định là AA: tối thiểu 4.5:1 cho chữ thường, 3:1 cho chữ lớn. Mọi cặp mới phải được kiểm lại trong bối cảnh render thật, gồm hover, disabled và ảnh/minh họa phía sau chữ.

### 1.5 Color budget

- Neutral: khoảng 75% diện tích một màn hình.
- `primary`: khoảng 15%, chủ yếu là điều hướng và control.
- Màu môn: tối đa khoảng 8%, chỉ nơi có ngữ cảnh môn học.
- Màu trạng thái: dưới 2%, chỉ cho feedback có ý nghĩa.

---

## 2. Typography

**Be Vietnam Pro** là font giao diện mặc định để đọc tiếng Việt rõ ràng ở mọi thiết bị. Dùng một font monospace có tabular figures chỉ cho trị số scientific readout trong lab; không dùng monospace cho copy học tập.

| Token | Size / line-height | Weight | Use |
| --- | --- | --- | --- |
| `display` | 40 / 48 | 700 | Tiêu đề trang lớn |
| `h1` | 28 / 36 | 700 | Tên bài học, heading chính |
| `h2` | 20 / 28 | 700 | Heading section, tên card |
| `metric` | 32 / 40 | 800 | Số liệu có thể mở evidence |
| `body` | 16 / 24 | 400 | Nội dung chính |
| `label` | 13 / 20 | 600 | Nhãn, nút, điều hướng |
| `caption` | 12 / 16 | 400 | Metadata, hạn nộp |

---

## 3. Spacing and grid

Đơn vị gốc **4px**. Các mức: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 64`.

- Padding trong thẻ: 20
- Padding trong banner / modal: 32
- Gap giữa các thẻ cùng hàng: 16
- Gap giữa các section dọc: 24
- Padding ngoài vùng nội dung: 32
- Khoảng cách item trong list: 12

---

## 4. Radius and elevation

| Token | Value | Use |
| --- | --- | --- |
| `radius-sm` | 12px | Input, ô bảng, thanh tìm kiếm nhỏ |
| `radius-md` | 16px | Thẻ con, modal nhỏ |
| `radius-lg` | 20px–24px | Card bài học, panel lớn |
| `radius-xl` | 32px | App shell nổi ngoài cùng |
| `radius-full` | 999px | Nút, badge, chip, avatar |

Surface chỉ dùng một cấp shadow: `0 1px 2px rgba(20,32,43,.06)`. Vật thể kéo thả trong lab có thể dùng `0 4px 12px rgba(20,32,43,.12)` để cho biết có thể thao tác.
