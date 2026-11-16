# PERF.md: nhật ký hiệu năng (frontend)

Mỗi thay đổi ghi số đo trước và sau; thay đổi không vượt nhiễu đo thì bỏ. Báo cáo gốc ở BE:
`_bmad-output/specs/perf-review/perf-review-2026-11-16.md`. Cách đo bundle: `npm run build`, đọc bảng kích thước của Vite.
Lighthouse: `npm run build && npx vite preview --port 4173`, rồi `npx lighthouse@13.6.0 http://127.0.0.1:4173/ --only-categories=performance --form-factor=mobile` (giả lập mobile mặc định, trang đăng nhập), chạy 3–4 lần, bỏ lần đầu nếu lệch.

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
| 2026-11-17 | 3 | Bỏ `@import` Google Fonts ở `src/styles.css`; tự host bằng `@fontsource/be-vietnam-pro` 5.3.0 (400–800) và `@fontsource-variable/manrope` 5.3.0 (`"Manrope Variable", "Manrope"` ở 6 chỗ dùng). 450/550/650/750 không có file riêng (Google cũng chỉ trả 400–800), hiển thị không đổi | Lighthouse mobile trang đăng nhập (sau mục 1): FCP/LCP 1 937–1 949 ms, điểm 94; render-blocking: CSS Google Fonts 875 ms + CSS app 456 ms; font 90,9 kB qua 2 domain bên thứ ba | FCP/LCP 1 059–1 060 ms (−0,88 s), điểm 94–96; render-blocking chỉ còn CSS app; font 167,9 kB (+77 kB: file fontsource còn hinting, Google gửi bản bỏ hinting cho Chrome; tải sau, `font-display: swap`, không chặn render); không còn gửi IP học sinh cho Google. TBT 87–97 → 160–225 ms (vẫn dưới 300, chưa rõ có phải nhiễu) | **Kept**. `test:regression` 90/90, Playwright two-mode-d5 3/3 |
| 2026-11-17 | 2a | Trình soạn thảo tiptap (`RichEditor`) tách khỏi `LessonEditorFields.tsx` sang `RichEditor.tsx`, nạp bằng `React.lazy` trong `Lessons.tsx` (giáo viên/admin được nạp trước khi vào trang) | `Lessons-*.js` 442,15 kB / 139,53 kB gzip (học sinh cũng tải tiptap + prosemirror ~400 kB) | `Lessons` 46,48 kB / 14,25 kB gzip (−90 %); chunk `RichEditor` 395,99 kB / 125,77 kB chỉ cho giáo viên/admin | **Kept**. Test tạm (mock) mở form tạo bài học, gõ và chèn ký hiệu trên bản build. Phát hiện lỗi có sẵn (không do thay đổi này): ký tự gõ đầu tiên trong khoảng 1–2 s sau khi mở form bị mất, tái hiện 4/5 lần ở bản build 981f1cb |
| 2026-11-17 | 2b | `resolve.dedupe: ["katex"]` trong `vite.config.ts`: `rehype-katex` 7 kéo katex 0.16.47 riêng, bundle thêm một bản KaTeX vào `LessonDetail` cạnh katex 0.19.1 của app (CSS đang dùng là 0.19). `rehype-katex` chỉ gọi `renderToString`. `chunkSizeWarningLimit` 1400 → 500 | `LessonDetail-*.js` 524,77 kB / 161,21 kB gzip (253 kB là bản katex thứ hai, đo bằng sourcemap); trang bài học tải `LessonDetail` + `katex.min` = 239 kB gzip | `LessonDetail` 262,66 kB / 84,14 kB gzip (−48 %); trang bài học 162 kB gzip. Cảnh báo > 500 kB còn một chunk: `OrbitControls` 839,89 kB (3D, chưa xử lý). `pdf` 483 kB đã là `import()` động | **Kept**. Playwright (bản build) lesson-passage-ask (gồm công thức), lesson-catalog, lesson-lab-navigation, exercise-question-hints 24/25; lỗi còn lại `TEACHER sees the lesson Lab tab` cũng lỗi trên `main` eda2982 (cùng `confirmed-ui-fixes` :22, :50). `test:regression` 90/90 |
