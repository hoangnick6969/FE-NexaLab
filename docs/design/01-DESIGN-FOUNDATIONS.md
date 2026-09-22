# Design Foundations

## 1. Color System

### 1.1 Nền tảng (Neutral)
| Token | Hex | Dùng cho |
|---|---|---|
| `bg-app` | `#F8FAFC` | Nền trang |
| `bg-surface` | `#FFFFFF` | Thẻ, panel, bảng |
| `bg-inset` | `#F1F5F9` | Ô lồng trong thẻ, input nền, vùng render |
| `border` | `#E2E8F0` | Viền 1px mọi surface |
| `border-strong` | `#CBD5E1` | Viền input khi focus-adjacent, divider quan trọng |
| `text-primary` | `#0F172A` | Tiêu đề, số liệu, nội dung chính |
| `text-secondary` | `#64748B` | Mô tả, nhãn, metadata |
| `text-disabled` | `#94A3B8` | Chữ ở trạng thái vô hiệu hóa |

### 1.2 Màu chủ đạo (Brand)
| Token | Hex | Dùng cho |
|---|---|---|
| `blue-900` | `#1E3A8A` | Sidebar, banner, nút chính, tab active, focus ring |
| `blue-700` | `#1D4ED8` | Hover của nút chính |
| `blue-500` | `#3B82F6` | Progress fill, icon trạng thái tích cực |
| `blue-200` | `#BFDBFE` | Progress track, dải lịch, nền badge nhạt |

### 1.3 Mã màu môn học / chỉ số
| Token | Hex | Nghĩa cố định |
|---|---|---|
| `accent-teal` | `#14B8A6` | Vật lý · thẻ chỉ số "Lab mới" |
| `accent-green` | `#22C55E` | Sinh học · thẻ chỉ số "Tiến độ học" |
| `accent-rose` | `#F43F5E` | Hóa học · thẻ chỉ số "Bài được giao" |

### 1.4 Trạng thái chấm bài (Verdict)
| Token | Hex | Trạng thái |
|---|---|---|
| `verdict-pass` | `#2F8F5B` | Đạt |
| `verdict-partial` | `#C98A1E` | Đạt một phần |
| `verdict-fail` | `#C4633F` | Chưa đạt |

### 1.5 Tỉ lệ sử dụng màu trên một màn hình
- Neutral (`bg-*`, `text-*`, `border`): ~70% (Nền chủ đạo)
- `blue-900`: ~20% (Sidebar + banner + nút)
- Accent + Verdict: ~10% (Thẻ chỉ số, badge)

---

## 2. Typography

Quy tắc "2+1 Font Discipline":
- **Lexend**: Toàn bộ giao diện (tiêu đề, nội dung). Giảm hội chứng khó đọc (dyslexia).
- **IBM Plex Mono**: Chỉ dùng cho trị số Simulation trả ra.

### 2.1 Thang cỡ chữ
| Token | Size / Line-height | Weight | Dùng cho |
|---|---|---|---|
| `display` | 40 / 48 | 600 | Tiêu đề trang, ngày lớn trong lịch |
| `h1` | 28 / 36 | 600 | Tên khóa học, tiêu đề banner |
| `h2` | 20 / 28 | 600 | Tiêu đề section, tên thẻ |
| `metric` | 32 / 40 | 700 | Con số trong thẻ chỉ số |
| `body` | 15 / 24 | 400 | Nội dung chính |
| `label` | 13 / 20 | 500 | Nhãn, tên mục sidebar, nút |
| `caption` | 12 / 16 | 400 | Metadata, hạn nộp, % hoàn thành |

---

## 3. Spacing & Grid

Đơn vị gốc **4px**. Các mức: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 64`.

- Padding trong thẻ: 20
- Padding trong banner / modal: 32
- Gap giữa các thẻ cùng hàng: 16
- Gap giữa các section dọc: 24
- Padding ngoài vùng nội dung: 32
- Khoảng cách item trong list: 12

---

## 4. Radius & Elevation

| Token | Giá trị | Dùng cho |
|---|---|---|
| `radius-sm` | 12px | Input, ô bảng, thanh tìm kiếm nhỏ |
| `radius-md` | 16px | Thẻ chỉ số, modal nhỏ |
| `radius-lg` | 20px-24px | Thẻ bài học (`.lab-card`), Panel lớn |
| `radius-xl` | 32px | Container nổi ngoài cùng (`.app-shell`) |
| `radius-full` | 999px | Nút nhấn, badge, chip, tag, avatar |

**Shadow**: Một cấp duy nhất `0 1px 2px rgba(22,33,28,.06)` cho surface. Vật thể kéo thả dùng `0 4px 12px rgba(22,33,28,.12)`.
