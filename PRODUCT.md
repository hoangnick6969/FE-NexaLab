# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Học sinh THCS (Lớp 8–9)** (Trọng tâm hàng đầu): Học sinh tự khám phá kiến thức khoa học (KHTN: Vật lý, Hóa học, Sinh học) qua các bài học mở, mô hình 3D tương tác và phòng lab mô phỏng; học thông qua chu trình thử, xem kết quả và điều chỉnh.
- **Giáo viên:** Soạn bài học với editor, quản lý lớp/học sinh, giao bài tập/lab theo lớp hoặc nhóm, theo dõi lượt thử và bằng chứng làm bài của học sinh.
- **Phụ huynh:** Liên kết tài khoản con qua mã liên kết, theo dõi tổng quan tiến độ học tập và mức độ hỗ trợ mà không can thiệp sâu vào chi tiết hội thoại.
- **Quản trị viên (Admin):** Quản lý tài khoản, môn học, khối lớp, siêu dữ liệu bài học và kiểm soát trạng thái phát hành các phòng lab/asset.

## Product Purpose

NexaLab là nền tảng học tập trên trình duyệt dành cho học sinh THCS tại Việt Nam ("Chạm vào khoa học. Học qua từng lần thử"). Sản phẩm ra đời nhằm giải quyết việc học lý thuyết khô khan, thiếu phòng thí nghiệm thực tế tại trường học bằng cách cung cấp các phòng thực hành tương tác (Vật lý, Hóa học, Sinh học) và mô hình 3D trực quan. Thành công được định nghĩa bằng việc học sinh hiểu bản chất hiện tượng khoa học qua việc trực tiếp thao tác, thử nghiệm và rút kinh nghiệm từ các lần làm sai.

## Positioning

NexaLab định vị là nền tảng học tập khoa học thực nghiệm có cơ chế tính toán mô phỏng 2 tầng độc lập:
1. Client xem trước tức thời qua engine `@nexalab/sim` (và mô hình 3D Three.js / React Flow / cử chỉ MediaPipe).
2. Server backend (`BE-NexaLab`) tính toán và xác thực kết quả khoa học chính thức có thẩm quyền.
Khác với các ứng dụng học tập thông thường dùng game hóa bề nổi (điểm thưởng, streak, bảng xếp hạng cạnh tranh), NexaLab tập trung vào việc học thực chất: minh bạch số liệu, truy xuất được bằng chứng tiến độ từng lần thử, so sánh học sinh với chính mình và hướng dẫn gợi ý từng bước (multi-level hints) thay vì đưa ngay đáp án.

## Operating Context

- Môi trường trình duyệt web hiện đại (Desktop, tablet, laptop tại phòng máy trường học hoặc máy tính ở nhà).
- Phân chia 2 không gian học tập:
  - **Open Curriculum:** Chương trình mở theo khung KHTN THCS (Lớp 8–9). Không bị khóa bởi bài kiểm tra hay điều kiện tiên quyết; học sinh tự do chọn Khối → Môn → Chương/Chủ đề → Bài học → Lab nền tảng.
  - **Class Space:** Không gian lớp học do giáo viên quản lý; nơi nhận bài tập được giao, làm bài kiểm tra tính điểm và thực hành lab chuyên sâu theo yêu cầu của lớp.
- Thiết bị hỗ trợ: Chuột, bàn phím, cảm ứng chạm; hỗ trợ tùy chọn điều khiển cử chỉ tay qua webcam máy tính bằng MediaPipe xử lý hoàn toàn tại client (không ghi hay gửi video lên server).

## Capabilities and Constraints

- **Năng lực cốt lõi:**
  - 3 phòng khám phá: *Thắp sáng ý tưởng* (Mạch điện Vật lý 2D React Flow), *Thế giới qua đôi mắt* (Mô hình giải phẫu Mắt 3D Three.js), *Những biến đổi kỳ diệu* (Phản ứng Hóa học).
  - Trình đọc bài học đa phương tiện (TipTap, Markdown, KaTeX, video, bài tập trắc nghiệm cơ bản).
  - Hệ thống theo dõi tiến độ chi tiết (Activity History, Evidence Sheet, lượt thử nghiệm).
- **Ràng buộc kỹ thuật & sư phạm:**
  - Kết quả mô phỏng trên client chỉ mang tính preview hỗ trợ học tập; server là nguồn quyết định điểm số và chứng thực dữ liệu.
  - Mô phỏng mang tính giáo dục lý tưởng hóa an toàn, không có nguy cơ cháy nổ hay nguy hiểm ngoài đời thực.
  - Bảo mật phân quyền RBAC nghiêm ngặt tại Backend (Student, Teacher, Parent, Admin), giao diện ẩn hiện theo vai trò không thay thế cho kiểm tra quyền tại server.
  - Tài khoản học sinh sử dụng định dạng username (do giáo viên/nhà trường cấp); các vai trò khác sử dụng email.

## Brand Commitments

- Tên sản phẩm: **NexaLab**
- Slogan / Thông điệp: *"Chạm vào khoa học. Học qua từng lần thử."*
- Giọng văn (Tone of Voice): Tích cực, ngắn gọn, cụ thể, mang tính động viên và tôn trọng nỗ lực học tập của học sinh (ví dụ: *"Em đã thử 2 lần. Hãy điều chỉnh điện trở rồi thử lại"* thay vì khẩu hiệu cường điệu).
- Ngôn ngữ giao diện: Tiếng Việt chuẩn mực, hỗ trợ thuật ngữ khoa học chính xác.
- Font chữ: **Be Vietnam Pro** cho toàn bộ văn bản UI tiếng Việt; monospace/tabular font chỉ dành riêng cho các bảng đo chỉ số khoa học.

## Evidence on Hand

- Triển khai thực tế trên frontend tại `nexalab-fe/src`:
  - Labs: `src/features/labs/` (Circuit, Chemistry, Eye, CircuitBulbActivity).
  - Lessons & Ebook: `src/features/lessons/`, `src/features/ebook/`.
  - Roles & UI: `src/app/App.tsx`, `src/components/`, `src/styles.css`.
- Tài liệu kiến trúc và đặc tả:
  - `nexalab-fe/README.md`, `nexalab-fe/AGENTS.md`.
  - `nexalab-fe/docs/design/08-STUDENT-P0-UX-DEFINITION.md`.
  - Backend specs & PRD tại `../BE-NexaLab`.
- Asset: `public/vision/` (MediaPipe model/WASM), `vendor/nexalab-sim-1.1.0.tgz`.

## Product Principles

1. **Học qua hành động (Action-First, Trial-and-Retry):** Học sinh học nhanh nhất khi được tự tay thử nghiệm, quan sát sai số và điều chỉnh. Mọi màn hình luôn dẫn tới hành động thực nghiệm tiếp theo.
2. **So sánh với chính mình (Self-Comparison, No Artificial Competition):** Tuyệt đối không dùng bảng xếp hạng đối đầu, chuỗi ngày streak hay gem/coin ảo. Thước đo thành công là sự tiến bộ cá nhân và số lượng bài học/thí nghiệm em đã làm chủ.
3. **Minh bạch và có thể giải thích (Explainable Evidence):** Mọi điểm số, tỷ lệ % hoàn thành hay nhận định đều phải bấm vào để xem được bằng chứng lịch sử (lượt thử, thông số mạch, kết quả phản ứng).
4. **Mô phỏng giáo dục trung thực (Scientifically Sound, Pedagogy-First):** Mô phỏng client mượt mà, nhưng số liệu khoa học và điểm số luôn được kiểm chứng trung thực bởi server.

## Accessibility & Inclusion

- Chuẩn tiếp cận: Định hướng tuân thủ tiêu chuẩn WCAG AA cho độ tương phản màu sắc giữa nền và chữ.
- Cỡ chữ tối thiểu: 16px trên màn hình di động cho nội dung đọc chính.
- Khả năng điều khiển đa dạng: Hỗ trợ đầy đủ chuột, bàn phím và thanh trượt; camera cử chỉ tay là tính năng tăng cường tùy chọn, không bao giờ là yêu cầu bắt buộc để hoàn thành bài lab.

