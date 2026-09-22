# Layout & Responsive Rules

## Khung trang (Floating App Shell)

```
┌───────────────── Vùng nền ngoài (Body: #F1F5F9) ──────────────────┐
│                                                                   │
│ ┌────────────────────── App Shell (radius-xl) ──────────────────┐ │
│ │                                                             │ │
│ │ Sidebar │ Topbar (Tìm kiếm, Streak, Badge)                  │ │
│ │ 248px   ├───────────────────────────────────────────────────┤ │
│ │         │ .main-wrap (#F8FAFC)                              │ │
│ │         │ ┌───────────────────────────────────────────────┐ │ │
│ │         │ │ .lab-card / .panel (radius-lg, shadow mềm)    │ │ │
│ │         │ └───────────────────────────────────────────────┘ │ │
│ │         │                                                   │ │
│ └─────────┴───────────────────────────────────────────────────┘ │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

- Header (lời chào + tìm kiếm + chuông) cao 72px, trên cùng vùng main.
- Vùng nội dung tối đa 1440px, căn giữa màn hình.
- **Căn trái tuyệt đối**: Không có khối căn giữa nào ngoài modal/dialog. Số liệu trong stat card, tiêu đề banner, ngày lớn trong lịch đều căn trái.
- Grid 12 cột cho vùng main khi cần chia nhỏ (vd: danh sách lab dạng thẻ).

## Responsive Breakpoints

| Breakpoint | Hành vi |
|---|---|
| **≥ 1280px (Desktop)** | Layout 3 cột đầy đủ (Sidebar, Main Content, Right Rail). Danh sách thẻ chia 3 cột. |
| **1024px – 1279px (Tablet Landscape)** | Right Rail chuyển xuống dưới vùng Main, dàn full width, nội dung trong Rail chia thành 2 cột. |
| **< 1024px (Mobile/Tablet Portrait)** | 1 cột duy nhất. Sidebar thu gọn thành thanh điều hướng dưới cùng (Bottom bar 5 icon). Stat cards cuộn ngang (horizontal scroll). |

## Khoảng cách (Spacing)
- Luôn bám sát hệ thống grid 4px.
- Vùng lề an toàn ngoài khung main: 32px (Desktop), 16px (Mobile).
