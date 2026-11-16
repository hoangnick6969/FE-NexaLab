# PERF.md: nhật ký hiệu năng (frontend)

Mỗi thay đổi ghi số đo trước và sau; thay đổi không vượt nhiễu đo thì bỏ. Báo cáo gốc ở BE:
`_bmad-output/specs/perf-review/perf-review-2026-11-16.md`. Cách đo bundle: `npm run build`, đọc bảng kích thước của Vite.
Chưa chạy Lighthouse (bước tiếp theo: `npm run build && npx vite preview`, `npx lighthouse` trang đăng nhập và dashboard, "Fast 4G").

## Baseline 2026-11-16 (`main` eda2982, nhánh `perf/baseline-and-quick-wins`)

| Asset | Kích thước | gzip |
|---|---|---|
| `index-*.js` (entry) | 781,93 kB | 243,88 kB |
| `index-*.css` | 326,19 kB | 56,34 kB |
| `LessonDetail-*.js` | 524,77 kB | 161,21 kB |
| `Lessons-*.js` | 442,15 kB | 139,53 kB |
| `pdf-*.js` | 483,14 kB | 144,26 kB |
| `katex.min-*.js` | 261,86 kB | 77,88 kB |

Ghi chú: entry đã lớn hơn số trong báo cáo (514 kB) vì các Lab mới; ngân sách JS trang đầu 200 kB gzip đang vượt khoảng 44 kB.
Font: `src/styles.css` dòng 1 vẫn `@import` Google Fonts (9 trọng số Be Vietnam Pro, 5 Manrope), `index.html` không có `preconnect`.

| Ngày | Mục | Thay đổi | Trước | Sau | Kết luận |
|---|---|---|---|---|---|
| 2026-11-16 | 1 | `Dashboard` và `LabLibrary` chuyển sang `React.lazy` trong `src/app/App.tsx` (route đã nằm trong `<Suspense>`) | entry `index-*.js` 781,93 kB / 243,88 kB gzip | entry 339,84 kB / 110,25 kB gzip (−55 % gzip, dưới ngân sách 200 kB); chunk mới `Dashboard` 33,81 kB / 10,91 kB, `LabLibrary` 18,02 kB / 6,04 kB | **Kept**. Playwright two-mode-d5, class-explore, lens-explore, explore-pinned-config 26/26; `test:regression` 90/90 |
