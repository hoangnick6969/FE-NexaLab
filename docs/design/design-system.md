# NexaLab — Design System v1.1

> **Legacy reference:** tài liệu này trùng lặp và mâu thuẫn một phần với numbered docs. Các token và component trong đây chỉ được giữ để tra lịch sử, không dùng cho UI mới. Source of truth là [01. Design Foundations](01-DESIGN-FOUNDATIONS.md), [02. Component System](02-COMPONENT-SYSTEM.md), [08. Student P0 UX Definition](08-STUDENT-P0-UX-DEFINITION.md) và các tài liệu numbered còn lại.

Tài liệu quy chuẩn thiết kế UI/UX dành riêng cho môi trường giáo dục (Educational Workbench). Giao diện không phải là một "SaaS dashboard" trang trí, mà là một **phòng thí nghiệm kỹ thuật số** — nơi học sinh tập trung vào thao tác, số liệu và kiến thức.
Mọi quyết định thiết kế tuân theo tinh thần: **Rành mạch, Khoa học, và Phi trang trí.** Mọi màn hình dựng từ token và component trong đây — không tự phát sinh giá trị mới ngoài bảng.

---

## 1. Triết lý Thiết kế (Educational Philosophy)

NexaLab từ chối các khuôn mẫu "AI slop" và SaaS chung chung (như bóng đổ nhiều lớp, nền tối neon chói, text ALL CAPS không cần thiết, hoặc gradient vô nghĩa). Sự đa dạng kiến trúc (structural variety) quan trọng hơn sự màu mè.

Ba nguyên lý sư phạm chi phối mọi quyết định:

1. **Giảm thiểu tải nhận thức (Cognitive Load Reduction):** Môi trường học tập cần sự tĩnh lặng. `green-900` là điểm neo thị giác duy nhất (sidebar, banner, nút chính). Không có khối đậm thứ hai cạnh tranh sự chú ý.
2. **Màu sắc mang ý nghĩa tuyệt đối (Semantic Colors):** Màu sắc là dữ liệu. Màu vàng/xanh/tím và màu verdict bị khóa cứng với ý nghĩa của nó (môn học/kết quả), không bao giờ tô ngẫu nhiên để "trang trí cho đỡ trống".
3. **Mô phỏng chân thực, không giả tạo (Honest UI):** Phân lớp bằng màu nền và viền (Workbench), không dùng bóng đổ chồng lớp. Không sử dụng thanh trình duyệt giả (fake chrome) hay số liệu tự bịa.

---

## 2. Color System

### 2.1 Nền tảng (Neutral)

| Token | Hex | Dùng cho |
|---|---|---|
| `bg-app` | `#F5F5F3` | Nền trang |
| `bg-surface` | `#FFFFFF` | Thẻ, panel, bảng |
| `bg-inset` | `#F7F7F4` | Ô lồng trong thẻ, input nền, vùng render |
| `border` | `#E8E7E2` | Viền 1px mọi surface |
| `border-strong` | `#D3D1C8` | Viền input khi focus-adjacent, divider quan trọng |
| `text-primary` | `#16211C` | Tiêu đề, số liệu, nội dung chính |
| `text-secondary` | `#6B736F` | Mô tả, nhãn, metadata |
| `text-disabled` | `#A3A9A5` | Chữ ở trạng thái vô hiệu hóa |

### 2.2 Màu chủ đạo (Brand)

| Token | Hex | Dùng cho |
|---|---|---|
| `green-900` | `#1C3B31` | Sidebar, banner, nút chính, tab active, focus ring |
| `green-700` | `#2C5A4A` | Hover của nút chính |
| `green-500` | `#3E7A5E` | Progress fill, icon trạng thái tích cực |
| `green-200` | `#C9DCC4` | Progress track, dải lịch, nền badge nhạt |

### 2.3 Mã màu môn học / chỉ số — mỗi màu một nghĩa cố định, không đổi

| Token | Hex | Nghĩa cố định |
|---|---|---|
| `accent-amber` | `#F2C230` | Hóa học · thẻ chỉ số "Lab mới" |
| `accent-blue` | `#A8CFE8` | Vật lý · thẻ chỉ số "Tiến độ học" |
| `accent-violet` | `#B99BD4` | Sinh học · thẻ chỉ số "Bài được giao" |

### 2.4 Trạng thái chấm bài (Verdict) — tách biệt hoàn toàn khỏi §2.3

| Token | Hex | Trạng thái |
|---|---|---|
| `verdict-pass` | `#2F8F5B` | Đạt |
| `verdict-partial` | `#C98A1E` | Đạt một phần |
| `verdict-fail` | `#C4633F` | Chưa đạt |

### 2.5 Tỉ lệ sử dụng màu trên một màn hình (bắt buộc)

| Nhóm | Tỉ lệ diện tích tối đa | Ghi chú |
|---|---|---|
| Neutral (`bg-*`, `text-*`, `border`) | ~70% | Nền chủ đạo của mọi màn hình |
| `green-900` và biến thể | ~20% | Sidebar + banner + nút — không lặp thêm ở nơi khác |
| Accent + Verdict cộng lại | ~10% | Chỉ ở thẻ chỉ số, badge, dải màu môn — không làm nền lớn |

**Quy tắc cứng:** không dùng quá 2 màu accent trên cùng một khu vực nhìn liên tục, **trừ** hàng 3 thẻ chỉ số ở dashboard — đây là bộ ba cố định (đại diện đúng 3 môn/3 chỉ số), không phải ngoại lệ tùy hứng. Ngoài vị trí đó, không lặp lại cả 3 màu accent cạnh nhau.

### 2.6 Chống "AI slop" & Chuẩn mực UI/UX Pro (Hallmark Standards)

| Dấu hiệu AI-generated / Lỗi UX | NexaLab xử lý thế nào trong môi trường EdTech |
|---|---|
| Nền kem ấm + serif tương phản cao + accent cam đất | Dùng `#F5F5F3` xám-trung tính lạnh hơn, thuần sans-serif để tăng độ đọc, không cam đất. |
| Bố cục "SaaS-card kit" hoặc bóng đổ mờ nhạt (soft shadow) | Áp dụng cấu trúc **Workbench**: Không dùng shadow tràn lan, phân định mặt phẳng bằng viền và nền. Radius có phân cấp rõ ràng (§5). |
| Chrome giả (fake browser bar, URL pill) & Số liệu ảo | Cấm tuyệt đối "Honest UI". Không vẽ trình duyệt giả, không hiển thị biểu đồ không có dữ liệu thật. |
| Typography lười biếng (ALL CAPS, chữ in nghiêng trang trí) | Cấm tiêu đề in nghiêng (italic headers). Cấm eyebrow ALL CAPS. Không dùng `→` ở cuối nút. Mọi tiêu đề phải là `font-style: normal`. |
| Icon Emoji rẻ tiền (🚀, 💡) & Contrast thấp ở Light Mode | Dùng icon SVG thuần. Văn bản chính dùng `#16211C` đảm bảo độ tương phản cao (tối thiểu WCAG AA 4.5:1). Không dùng xám nhạt cho body text. |

---

## 3. Typography

Quy tắc "2+1 Font Discipline": Hai font chính có vai trò phân định rõ ràng, không dùng thêm font thứ ba.

| Vai trò | Font | Lý luận Sư phạm & UX |
|---|---|---|
| Display & UI | **Lexend** | Toàn bộ giao diện (tiêu đề, nội dung). Lexend được thiết kế khoa học để tăng độ lưu loát khi đọc, giảm hội chứng khó đọc (dyslexia) ở học sinh. |
| Số liệu mô phỏng | **IBM Plex Mono** | Chỉ dùng cho trị số Simulation trả ra (dòng điện, điện áp). Font monospace đảm bảo các số liệu gióng hàng thẳng tắp, biểu diễn sự chính xác của thiết bị đo lường thật. |

### 3.1 Thang cỡ chữ

| Token | Size / Line-height | Weight | Dùng cho |
|---|---|---|---|
| `display` | 40 / 48 | 600 | Tiêu đề trang, ngày lớn trong lịch |
| `h1` | 28 / 36 | 600 | Tên khóa học, tiêu đề banner |
| `h2` | 20 / 28 | 600 | Tiêu đề section, tên thẻ |
| `metric` | 32 / 40 | 700 | Con số trong thẻ chỉ số |
| `body` | 15 / 24 | 400 | Nội dung chính |
| `label` | 13 / 20 | 500 | Nhãn, tên mục sidebar, nút |
| `caption` | 12 / 16 | 400 | Metadata, hạn nộp, % hoàn thành |

### 3.2 Quy tắc dựng chữ (Typography Purity)

- **Cấm tiêu đề in nghiêng (No Italic Headers):** Mọi tiêu đề và chữ hiển thị cỡ lớn phải ở trạng thái thẳng (roman/upright). Nhấn mạnh bằng font-weight hoặc màu sắc, không dùng in nghiêng.
- Độ dài dòng nội dung chính (Line-length) ≤ 75 ký tự để mắt học sinh dễ theo dõi; ở panel hẹp giới hạn 40–50 ký tự.
- Không in hoa toàn bộ (ALL CAPS) cho nhãn/eyebrow. (Chữ thường dễ đọc hơn).
- Không bôi đậm/đổi màu ngẫu nhiên một từ giữa tiêu đề chỉ để "trang trí".
- Không thêm mũi tên `→` cuối nút hay liên kết (dấu hiệu của AI slop).
- Không nối metadata bằng dấu chấm giữa (`·`) — dùng dấu phẩy hoặc tách dòng rõ ràng.
- Đánh số thứ tự (1/2/3) chỉ dùng khi nội dung thực sự là một chuỗi bước tuần tự.

---

## 4. Spacing & Grid

Đơn vị gốc **4px**. Chỉ dùng: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 64`.

| Vị trí | Giá trị |
|---|---|
| Padding trong thẻ | 20 |
| Padding trong banner / modal | 32 |
| Gap giữa các thẻ cùng hàng | 16 |
| Gap giữa các section dọc | 24 |
| Padding ngoài vùng nội dung | 32 |
| Gap icon–chữ | 8 |
| Khoảng cách item trong list | 12 |

---

## 5. Radius & Elevation

| Token | Giá trị | Dùng cho |
|---|---|---|
| `radius-sm` | 8px | Input, ô bảng, thumbnail, tag |
| `radius-md` | 12px | Thẻ chỉ số, thẻ bài học, modal nhỏ |
| `radius-lg` | 16px | Banner, panel lớn, modal lớn |
| `radius-full` | 999px | Nút, badge, chip, avatar, ô ngày |

Bóng đổ: **một cấp duy nhất** `0 1px 2px rgba(22,33,28,.06)` cho surface nổi trên `bg-app`. Không chồng nhiều lớp shadow, không shadow trên phần tử đã có viền đậm. Vật thể kéo-thả được trong Lab Canvas/3D viewer dùng shadow đậm hơn một bậc `0 4px 12px rgba(22,33,28,.12)` để báo hiệu "cầm được" — đây là ngoại lệ duy nhất.

---

## 6. Layout

### 6.1 Khung trang

```
┌────┬──────────────────────────────────────────┬─────────────────┐
│ 72 │            main (flex, min 640)          │   rail  360     │
│ px │                                          │                 │
│    │  ┌────────────────────────────────────┐  │ ┌─────────────┐ │
│side│  │  Banner  green-900   radius-lg     │  │ │ Panel       │ │
│bar │  └────────────────────────────────────┘  │ │ radius-lg   │ │
│    │  ┌────────┐┌────────┐┌────────┐          │ │             │ │
│    │  │ amber  ││  blue  ││ violet │  stat    │ └─────────────┘ │
│    │  └────────┘└────────┘└────────┘          │ ┌─────────────┐ │
│    │  ┌────────────────────────────────────┐  │ │ Panel       │ │
│    │  │  List / Grid trong surface trắng   │  │ └─────────────┘ │
│    │  └────────────────────────────────────┘  │                 │
└────┴──────────────────────────────────────────┴─────────────────┘
```

- Header (lời chào + tìm kiếm + chuông) cao 72px, trên cùng vùng main.
- Vùng nội dung tối đa 1440px, căn giữa màn hình.
- **Căn trái tuyệt đối** — không có khối căn giữa nào ngoài modal/dialog. Số liệu trong stat card, tiêu đề banner, ngày lớn trong lịch đều căn trái.
- Grid 12 cột cho vùng main khi cần chia nhỏ (vd danh sách lab dạng thẻ: 3 cột ở ≥1280px).

### 6.2 Responsive

| Breakpoint | Hành vi |
|---|---|
| ≥ 1280 | 3 cột như trên |
| 1024–1279 | Rail xuống dưới main, full width, chia 2 cột |
| < 1024 | 1 cột, sidebar thành thanh dưới (bottom bar 5 icon), stat card cuộn ngang |

---

## 7. Shared Components (thư viện nền tảng)

Tập primitive dùng lại ở mọi màn hình — thiết kế trước, không lặp lại quyết định ở từng tính năng.

### 7.1 Button

| Loại | Nền | Chữ | Viền |
|---|---|---|---|
| Primary | `green-900` | trắng | không |
| Secondary | `bg-surface` | `text-primary` | 1px `border` |
| Ghost | trong suốt | `text-secondary` | không |
| Destructive | `verdict-fail` 10% | `verdict-fail` | không |

**Touch Target (A11y):** Kích thước vùng chạm tối thiểu phải đạt 44x44px cho di động/tablet. Nút mặc định cao 40, radius `full`, padding ngang 20, `label` weight 500.
Trạng thái bắt buộc thiết kế cho **mọi** loại nút (Interactive Discipline): `default · hover (tối/đậm hơn 8%) · active (tối hơn 12%) · disabled (opacity 40%, cursor-not-allowed) · focus-visible (viền 2px green-900 offset 2px - Yêu cầu bắt buộc để điều hướng bàn phím)`.
Nhãn là động từ trung thực (Honest Copy), nói đúng việc sẽ xảy ra ("Chạy thí nghiệm", "Nộp báo cáo"), không dùng "Submit/OK/Click here".

### 7.2 Input & Textarea
Nền `bg-inset`, viền 1px `border`, radius `sm`, cao 40, padding ngang 12. Focus: viền `green-900` 1.5px + nền đổi thành `bg-surface`. Lỗi: viền `verdict-fail`, dòng lỗi `caption` màu `verdict-fail` phía dưới, không dùng icon cảnh báo đỏ chớp nháy.

### 7.3 Select / Dropdown
Giống Input, thêm icon chevron phải 16px. Menu mở: `bg-surface`, radius `sm`, shadow cấp 2 (ngoại lệ §5), item cao 36, hover nền `bg-inset`.

### 7.4 Checkbox / Radio / Toggle
Kích thước 20×20 (checkbox/radio), toggle 40×22. Trạng thái on dùng `green-900`. Không dùng màu accent (vàng/xanh/tím) cho control chọn — giữ riêng cho dữ liệu.

### 7.5 Tag / Badge / Chip
Radius `full`, padding 4/12, `label`. Ba biến thể nghĩa cố định: **màu môn học** (viền mảnh, nền trong suốt), **verdict** (nền màu verdict 12%, chữ verdict đậm), **trung tính** (nền `bg-inset`, chữ `text-secondary`) — dùng cho filter/trạng thái chung.

### 7.6 Avatar
Tròn, 3 cỡ 24/32/40. Không có ảnh: hiển thị chữ cái đầu tên, nền `green-200`, chữ `green-900`.

### 7.7 Tooltip
Nền `text-primary` (đảo màu), chữ trắng `caption`, radius `sm`, padding 6/10, xuất hiện sau 400ms hover, không mũi tên trang trí lớn.

### 7.8 Modal / Dialog
Radius `lg`, padding 32, max-width 480 (xác nhận) hoặc 720 (form dài). Overlay `rgba(22,33,28,.32)`. Luôn có nút đóng góc trên phải và một hành động chính căn phải ở footer.

### 7.9 Toast / Snackbar
Góc dưới phải, `bg-surface`, viền trái 3px theo màu ngữ nghĩa (verdict hoặc `green-900` cho thông tin trung tính), radius `sm`, tự ẩn sau 4s trừ lỗi. Xếp chồng tối đa 2, thông báo thứ 3 thay thế thông báo cũ nhất.

### 7.10 Tabs
Segmented control: nền `bg-inset`, radius `full`, tab active nền `green-900` chữ trắng. Dùng cho chuyển view (Weekly/Monthly, Quiz/Flashcard...), không dùng cho điều hướng cấp trang.

### 7.11 Breadcrumb
`caption`, phân cách bằng icon chevron 12px (không dùng `/` hay `·`). Mục cuối `text-primary`, các mục trước `text-secondary`.

### 7.12 Pagination
Số trang dạng chip tròn 32px, trang hiện tại nền `green-900`. Ưu tiên infinite-scroll cho danh sách dài (bảng học sinh) thay vì phân trang khi có thể.

### 7.13 Progress bar / Stepper
Thanh ngang cao 6px, track `green-200`, fill `green-500`, radius `full` — dùng cho tiến độ tuyến tính (bài học, quiz). **Không** dùng cho bậc gợi ý AI Tutor — xem §8.4 Hint Ladder, bản chất không tuyến tính.

### 7.14 Skeleton / Loading
Khối `bg-inset` bo theo radius của component thật, hiệu ứng shimmer nhẹ ngang. Không dùng spinner tròn ở nơi có thể đoán trước hình dạng nội dung.

### 7.15 Empty state
Icon line-art đơn sắc 48px + `h2` mô tả tình trạng + `body` gợi ý hành động tiếp theo + 1 nút Primary. Không dùng minh họa nhân vật hoạt hình.

---

## 8. Domain Components (đặc thù NexaLab)

### 8.1 Banner (hero)
Nền `green-900`, `radius-lg`, padding 32. Trái: `h1` trắng + `body` mô tả `rgba(255,255,255,.72)` + nút Secondary-trên-nền-đậm (nền trắng, chữ `green-900`). Phải: minh họa line-art một vật thể trong bài học, đơn sắc, tối đa 40% chiều rộng banner.

### 8.2 Stat card
Cao 132, `radius-md`, padding 20, nền theo `accent` tương ứng §2.3, luôn thứ tự amber → blue → violet. Cấu trúc dọc: icon 20px + `label` → `metric` + chip thay đổi (nền trắng 60%, `radius-full`, padding 2/8) → `caption` mô tả.

### 8.3 Lesson / Lab card
`bg-surface`, viền 1px, `radius-md`, padding 16. Dải màu môn học 3px bám mép trái. Thứ tự: `h2` tiêu đề → `caption` tiến độ → thumbnail thật (`radius-sm`, 4:3) → progress bar §7.13 → `caption` %.

### 8.4 Hint Ladder (bậc gợi ý AI)
4 nấc dọc, cao 8px mỗi nấc, gap 4. Nấc đã dùng tô đặc màu môn học của lab đang mở; nấc chưa tới viền 1px `border`. Không quy đổi thành phần trăm hay progress bar ngang — lên bậc chỉ sau khi học sinh thử lại, không tự leo theo thời gian.

### 8.5 AI Tutor panel
`bg-surface`, `radius-lg`. Header: icon + "AI Tutor" + trạng thái `caption`. Thân: khung ghi chú `bg-inset` `radius-sm` — mở đầu bằng câu hỏi ở mức 1–2, không khẳng định thẳng. Không dùng bong bóng chat tròn kiểu messenger.

### 8.6 Simulation readout
`bg-inset`, `radius-sm`, padding 12, dạng lưới mặt đồng hồ đo. Mỗi chỉ số: `caption` (`text-secondary`) → trị số IBM Plex Mono 24/32 (`text-primary`) → đơn vị `caption`. Trị số **không** đổi màu theo đúng/sai — việc đó thuộc về Verdict badge riêng.

### 8.7 Verdict badge
Dùng Tag §7.5 biến thể verdict. Chỉ 3 trạng thái §2.4, không thêm trạng thái phụ.

### 8.8 Lab viewer (3D / Canvas)
Vùng render `bg-inset` chiếm ≥ 60% chiều cao khung. Toolbar nổi đáy: `bg-surface`, `radius-full`, padding 8, icon 20px, tooltip §7.7 cho từng công cụ. Panel chú thích phải rộng 320, cuộn độc lập với vùng render.

### 8.9 Calendar block
Segmented tab §7.10 cho Weekly/Monthly. Ngày lớn `display`. Dải 7 ngày nền `green-200` `radius-full`, hôm nay là vòng tròn trắng 32px trong dải.

### 8.10 Teacher table & evidence
Table dùng chuẩn §7 (header `bg-inset`, viền ngang 1px). Mỗi dòng nhận định AI kèm nút Ghost "Xem bằng chứng" mở modal §7.8 dẫn về Attempt/HintLog gốc — bắt buộc, không để nhận định "trôi nổi" không truy được nguồn.

### 8.11 Parent summary card
Chỉ 3 `metric` lớn, không biểu đồ, không icon cảnh báo đỏ. Ngôn ngữ theo bảng giọng viết §11.

---

## 9. Iconography & Illustration

- **Icon (No Emojis):** Cấm tuyệt đối dùng Emoji (🎨, 🚀, ⚙️) làm icon giao diện. Sử dụng bộ icon SVG duy nhất (Lucide/Phosphor), stroke 1.5px, kích thước 20 hoặc 24. Cố định `viewBox` (vd: `w-6 h-6`). Không trộn style.
- Minh họa (Honest Illustration): Line art 1.5px của dụng cụ/vật thể có thật trong bài học, tô một mảng màu môn học.
- **Cấm:** Khối 3D trừu tượng (AI slop blobs), ảnh stock vô hồn, chrome trình duyệt giả.
- Model 3D chân thực chỉ xuất hiện trong không gian Lab viewer §8.8, phục vụ thao tác thật, không dùng để trang trí dashboard.

---

## 10. Kỷ luật Thiết kế (Pro-Max Standards)

1. **Trợ năng (Accessibility - CRITICAL):** Mọi cặp chữ/nền đạt tối thiểu WCAG AA (4.5:1 cho `body`/`label`). Mọi phần tử tương tác bắt buộc có `focus-visible` (`2px green-900`, offset 2px) cho điều hướng bằng bàn phím.
2. **Điểm chạm (Touch Targets - CRITICAL):** Vùng chạm tối thiểu 44x44px trên mọi nền tảng, áp dụng cho cả icon-only button. Bắt buộc có class `cursor-pointer` cho mọi thẻ/hàng bấm được.
3. **Cấu trúc & Đa dạng (Structural Variety):** Bố cục trang phụ thuộc vào nội dung (Workbench, Document, Canvas), không ép mọi thứ vào thẻ SaaS-card nhàm chán.
4. **Thẩm mỹ phi trang trí (Restraint):** Không chồng nhiều lớp shadow. Radius tuân thủ tuyệt đối phân cấp §5. Không gradient nhiều màu. Lớp lang UI được phân cách bằng màu nền (`bg-surface`, `bg-inset`) và viền.
5. **Tương tác & Trạng thái (Microinteractions):** Mọi component tương tác bắt buộc phải thiết kế code đủ 8 trạng thái (default/hover/focus/active/disabled/loading/error/success). Trạng thái hover không được làm giật layout (dùng `transition-colors duration-200`, không dùng scale gây dịch chuyển khung).
6. **Nội dung trung thực (Honest Copy):** Copy nhất quán, không dùng số liệu bịa đặt, không vẽ thanh trình duyệt giả (fake UI chrome).
7. **Kiểm soát Màu sắc & Typography:** Accent có giới hạn diện tích (tuân §2.5). Không bao giờ dùng ALL CAPS cho nhãn phụ, tuyệt đối không dùng tiêu đề in nghiêng (italic headers). Cấm biểu họa emoji.

---

## 11. Giọng viết theo vai

| Vai | Nguyên tắc |
|---|---|
| Học sinh (qua AI Tutor) | Câu ngắn, chủ động, xưng "em", hỏi trước khi trả lời — không tiết lộ đáp án |
| Giáo viên | Trung tính, số liệu đi trước, không cảm thán |
| Phụ huynh | Không thuật ngữ kỹ thuật — nói "mạch đang hơi khó với con", không nói "current 0.42A" |
| Hệ thống (lỗi/rỗng) | Nêu rõ chuyện gì xảy ra và bước tiếp theo — không xin lỗi kiểu con người, không mơ hồ |

Áp dụng trực tiếp vào nội dung Toast §7.9 và Empty state §7.15.

---

## 12. Motion

| Sự kiện | Hiệu ứng | Thời lượng |
|---|---|---|
| Simulation trả kết quả | Số đếm từ 0 tới trị số thật | 400ms ease-out |
| Lên nấc Hint Ladder | Nấc sáng dần | 200ms |
| Hover thẻ | Viền đậm lên 1 cấp, không nhấc thẻ (không translateY) | 120ms |
| Mở modal/panel | Fade + scale 0.98→1 | 160ms |
| Toast xuất hiện | Slide-in 8px + fade | 160ms |

Không fade-slide-up hàng loạt khi cuộn trang. Tôn trọng `prefers-reduced-motion` — tắt toàn bộ transform, giữ lại thay đổi opacity tối thiểu.

---

## 13. Checklist duyệt màn hình

- [ ] Chỉ một khối `green-900` đậm trên màn hình
- [ ] Accent/verdict tuân tỉ lệ diện tích §2.5, không vượt 2 accent liền kề (trừ hàng 3 stat card)
- [ ] Mọi khoảng cách là bội số 4 trong §4
- [ ] Radius đúng cấp §5, không dùng một giá trị cho mọi thứ
- [ ] Không gradient nhiều màu, không ALL CAPS, không `→` cuối nút, không nối `·`
- [ ] Không blob 3D trang trí, không ảnh stock, không emoji trong UI
- [ ] Mọi component tương tác có đủ 5 trạng thái (Design Rule 10)
- [ ] Contrast đạt AA, focus-visible hiển thị rõ
- [ ] Simulation readout dùng IBM Plex Mono, không tô màu theo đúng/sai
- [ ] Nội dung căn trái, shadow chỉ một cấp

---

## 14. Còn cần tạo thêm bao nhiêu spec?

Bộ token + rule + toàn bộ Shared Components (§7) và Domain Components (§8) đã đủ để code song song với thiết kế. Phần còn thiếu chỉ là **áp các component này vào từng màn hình thật**, theo đúng phân tầng P0/P1/P2 của blueprint — không cần thêm token/màu/component nền tảng nào khác trừ khi một màn hình lộ ra pattern thực sự mới.

### P0 — bắt buộc trước khi code L0–L2 (9 màn hình)
1. Đăng nhập / Đăng ký / Quên mật khẩu (1 spec, 3 trạng thái)
2. Dashboard Học sinh
3. Trang Bài học (video + lý thuyết + quiz)
4. Lab Mạch điện — sandbox
5. Lab Mạch điện — Challenge + kết quả (3 verdict)
6. AI Tutor panel — đủ 4 mức gợi ý
7. Dashboard Giáo viên (lớp học, giao bài)
8. Bảng phân tích lớp (misconception + bằng chứng)
9. Mô hình 3D — Mắt người (viewer + chú thích + chế độ kiểm tra)

### P1 — nên có trước demo (5 màn hình)
10. Lab Hóa — chọn dụng cụ/chất, chạy phản ứng, kết quả
11. Quiz trắc nghiệm (làm bài + chấm)
12. Hồ sơ thí nghiệm đã lưu (danh sách + chi tiết)
13. Tổng hợp giáo viên toàn lớp (biểu đồ)
14. Soạn bài học (phía giáo viên, rich text)

### P2 — có thời gian thì làm (4 màn hình)
15. Cổng phụ huynh
16. Báo cáo tuần phụ huynh
17. Trang Admin (CRUD người dùng/lab)
18. Demo Computer Vision (mắt người + overlay bàn tay)

### State bổ sung cho component đã có (không phải trang mới)
- Table: loading / rỗng / lỗi tải
- Input mã lớp: validate realtime
- Lab Canvas: drag ghost, trạng thái nối dây sai
- Toast: xếp chồng 2 thông báo

**Tổng: 17–18 screen spec + 4 nhóm state.** Nếu một màn hình cần pattern không có trong §7/§8, bổ sung pattern đó vào design system trước, rồi mới build màn hình — không tạo component "riêng cho một trang".
