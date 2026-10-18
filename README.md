# NexaLab — Frontend

**Chạm vào khoa học. Học qua từng lần thử.**

NexaLab là nền tảng học tập trên trình duyệt dành cho học sinh THCS. Các bài thực hành **Sinh học — Hóa học — Vật lý** được thể hiện qua mô hình 3D và thí nghiệm ảo, giúp học sinh tự khám phá thay vì chỉ đọc mô tả hoặc xem hình minh họa.

Repository này chứa giao diện tiếng Việt, các phòng lab tương tác và không gian làm việc cho học sinh, giáo viên, phụ huynh và quản trị viên.

[Backend & hướng dẫn API](https://github.com/hoangnick6969/BE-NexaLab) · [Frontend](https://github.com/hoangnick6969/FE-NexaLab)

## Trải nghiệm học tập

**Học bài → Khám phá mô hình → Làm thử → Xem kết quả → Nhận gợi ý → Điều chỉnh.**

NexaLab cho phép học sinh thử và sửa bài làm. Engine tính kết quả khoa học; Tutor quan sát trạng thái để đặt câu hỏi và hướng dẫn theo từng mức.

### Ba phòng khám phá

| Phòng lab | Trải nghiệm |
| --- | --- |
| **Thắp sáng ý tưởng — Vật lý** | Kéo thả linh kiện, nối dây, chỉnh điện áp/điện trở, đóng công tắc và tìm cách làm LED sáng an toàn |
| **Thế giới qua đôi mắt — Sinh học** | Xoay, phóng to, tách các phần, ẩn củng mạc, cắt tiết diện và kiểm tra tên tám bộ phận |
| **Những biến đổi kỳ diệu — Hóa học** | Chọn một trong sáu phản ứng, thay đổi lượng chất và quan sát hiện tượng/chất dư |

## Không gian theo vai trò

- **Học sinh:** dashboard, bài được giao, thư viện bài học, quiz, ba lab, bốn mức gợi ý, tiến độ và thí nghiệm đã lưu.
- **Giáo viên:** tạo bài với editor, upload học liệu, quản lý lớp/thành viên, giao bài cả lớp hoặc nhóm, xem lượt thử và bằng chứng gợi ý.
- **Phụ huynh:** liên kết với con bằng mã, xem tiến độ và mức trợ giúp; không hiển thị hội thoại chi tiết.
- **Admin:** quản lý người dùng/môn, metadata, trạng thái và asset của các lab.

Phân quyền được kiểm tra thêm tại backend, không chỉ bằng việc ẩn nút trên giao diện.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Nền tảng | React 18, TypeScript, Vite |
| Điều hướng | React Router |
| Dữ liệu & trạng thái | TanStack Query, Zustand, state theo từng lab |
| Mạch điện 2D | React Flow |
| Mô hình 3D | Three.js, React Three Fiber, drei |
| Cử chỉ tay | MediaPipe Tasks Vision, xử lý trên thiết bị |
| Soạn nội dung | TipTap, DOMPurify |
| Giao diện | CSS responsive riêng, Lucide icons |
| Xem trước mô phỏng | Package `@nexalab/sim` cùng phiên bản với backend |
| Kiểm thử | Playwright, TypeScript, production build |

## Bắt đầu

Yêu cầu Node.js **22.19+**, npm và backend NexaLab đang chạy.

```bash
git clone https://github.com/hoangnick6969/FE-NexaLab.git
cd FE-NexaLab
npm ci
npm run dev
```

Mở **http://localhost:5173**. Trong môi trường dev, Vite proxy `/api` sang `http://127.0.0.1:4000`.

Backend có hướng dẫn tạo database, migration và seed tại [README BE](https://github.com/hoangnick6969/BE-NexaLab#bắt-đầu). Các tài khoản seed:

| Vai trò | Email |
| --- | --- |
| Học sinh | `student@nexalab.local` |
| Giáo viên | `teacher@nexalab.local` |
| Phụ huynh | `parent@nexalab.local` |
| Admin | `admin@nexalab.local` |

Mật khẩu do người thiết lập backend chọn qua `SEED_PASSWORD`. Mã lớp mẫu là `NEXA8A`.

### Cấu hình API

Sao chép `.env.example` thành `.env` nếu cần thay endpoint:

```dotenv
VITE_API_URL=/api
```

Chỉ đặt cấu hình public trong biến `VITE_*`. JWT secret, database password và khóa Claude thuộc backend.

## Thử một kịch bản

1. Đăng nhập học sinh và mở **Thắp sáng ý tưởng**.
2. Chạy khi chưa nối dây để quan sát mạch hở và nhận gợi ý.
3. Nối nguồn, điện trở, LED và công tắc thành một vòng kín.
4. Với nguồn 9 V, LED có sụt áp giả định 2 V và điện trở 330 Ω, engine báo quá dòng.
5. Đổi điện trở thành 350 Ω: dòng 20 mA đáp ứng ngưỡng của mô hình.
6. Lưu thí nghiệm, xem tiến độ và mở lại cấu hình đã lưu.

Đây là mô hình giáo dục lý tưởng. Kết quả chính thức được tính lại trên server; phần xem trước tại client không quyết định điểm.

## Điều khiển bằng camera

Camera chỉ được yêu cầu khi người dùng bấm bật. Nhận dạng chạy trong trình duyệt; ứng dụng không ghi, lưu hoặc gửi khung hình lên server. Tắt camera hoặc rời lab sẽ dừng video tracks.

Demo một tay hỗ trợ:

- Di chuyển ngang để xoay mô hình.
- Di chuyển dọc để thay đổi độ tách rời.
- Chụm ngón để chọn bộ phận tiếp theo.

Chuột, bàn phím và thanh trượt vẫn dùng được khi không có camera hoặc từ chối quyền. WASM/model được lưu tại `public/vision`; [nguồn và giấy phép](public/vision/README.md) đi kèm trong repo. Chất lượng tracking trên webcam vật lý và fps trên nhiều thiết bị chưa được xác nhận.

## Cấu trúc thư mục

```text
src/
├── main.tsx            Điểm vào: error boundary, React Query, router
├── app/                Định tuyến, khung giao diện theo vai trò, QueryClient
├── lib/api.ts          API client và phiên đăng nhập
├── components/         Thành phần giao diện dùng chung
├── features/<domain>/  Trang theo nghiệp vụ: auth, dashboard, lessons, learning,
│                       ebook, labs, progress, classes, admin, landing, saved, settings
└── styles.css          Giao diện responsive
public/vision/          Model và WASM MediaPipe
vendor/                Tarball engine mô phỏng version hóa
tests/                 Các kịch bản Playwright
```

Chi tiết và quy ước: [docs/architecture/project-structure.md](docs/architecture/project-structure.md).

## Kiểm thử & build

```bash
npm run lint
npm run build
npm run test:e2e
```

Playwright hiện dùng Edge cài sẵn. Cần chạy cả BE/FE và seed database; đặt `SEED_PASSWORD` trong môi trường chạy test trùng với backend. Test yêu cầu biến này và không lưu mật khẩu đăng nhập trong source.

Bốn kịch bản hiện có: mạch điện từ sai đến đúng/gợi ý/lưu, phản ứng vừa đủ, gọi tên tám bộ phận mắt và dashboard mobile không tràn ngang. Test tạo lịch sử thực hành bằng tài khoản mẫu. Trên Linux có thể cài Edge bằng Playwright hoặc chỉnh browser channel trong config.

## Triển khai

`npm run build` tạo thư mục `dist/`. Cấu hình `VITE_API_URL` trước khi build và phục vụ SPA qua static hosting. Repo có `vercel.json` cho fallback route. API cần reverse proxy hoặc endpoint được cấu hình riêng; ưu tiên cùng site để cookie refresh hoạt động với chính sách backend.

CI hiện chạy cài dependency, kiểm tra TypeScript và build. E2E chạy trong môi trường có backend/database; chưa có workflow tự động deploy.

## Trạng thái & hướng phát triển

Đây là **MVP**, chưa hoàn thành toàn bộ blueprint:

- Mắt 3D là mesh minh họa tự dựng, chưa phải mô hình giải phẫu được chuyên gia duyệt. Asset GLB từ admin chưa tự thay thế cảnh dựng sẵn.
- Lab Hóa dùng số mol; thao tác rót/đun và nồng độ/thể tích chưa triển khai.
- Tutor mặc định dùng gợi ý theo luật; Claude cần được cấu hình ở backend.
- Các tối ưu LOD, benchmark thiết bị, báo cáo định kỳ và bộ cử chỉ mở rộng là hướng phát triển tiếp theo.

Các giả định khoa học được mô tả trong [tài liệu engine](https://github.com/hoangnick6969/BE-NexaLab/blob/main/docs/SCIENTIFIC-MODELS.md).
