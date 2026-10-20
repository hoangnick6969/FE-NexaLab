export const auditTargets: Record<string, string> = {
  User: "Người dùng", Asset: "Tệp", AssetVersion: "Phiên bản tệp", Assignment: "Bài giao", AssignmentSubmission: "Bài nộp",
  Class: "Lớp học", Classroom: "Lớp học", Enrollment: "Thành viên lớp", ClassResource: "Tài nguyên lớp", Lesson: "Bài học",
  Subject: "Môn học", Chapter: "Chương", Topic: "Chủ đề", LearningOutcome: "Mục tiêu học tập", Lab: "Phòng thực hành", AuditLog: "Nhật ký", SimulationVersion: "Phiên bản mô phỏng",
};
const domains: Record<string, string> = { user: "người dùng", asset: "tệp", assignment: "bài giao", class: "lớp", class_resource: "tài nguyên lớp", enrollment: "thành viên", student: "học sinh", lesson: "bài học", subject: "môn học", chapter: "chương", topic: "chủ đề", outcome: "mục tiêu", lab: "phòng thực hành", simulation: "mô phỏng", source: "nguồn tài liệu", content: "nội dung", practical: "bài thực hành" };
const actions: Record<string, string> = { create: "Tạo", update: "Cập nhật", delete: "Xóa", archive: "Lưu trữ", quarantine: "Cách ly", release: "Gỡ cách ly", reassign: "Chuyển chủ sở hữu", share: "Chia sẻ", provision: "Cấp tài khoản", enroll: "Ghi danh", approve: "Duyệt", reject: "Từ chối", remove: "Xóa khỏi lớp", publish: "Xuất bản", revise: "Tạo bản mới", update_draft: "Sửa bản nháp", import: "Nhập", activate: "Kích hoạt", disable: "Vô hiệu hóa", reactivate: "Kích hoạt lại", reset_link: "Gửi liên kết đặt lại mật khẩu", password_reset: "Cấp lại mật khẩu", deadline_revise: "Dời hạn nộp", late_reject: "Từ chối bài nộp trễ", submit: "Nộp bài", clone: "Tạo bản sao", access: "Truy cập", ready: "Xác nhận sẵn sàng", ingest: "Nhập dữ liệu nguồn", plan: "Lập kế hoạch phát hành", apply: "Áp dụng", retire: "Ngừng phát hành", rotate: "Tạo mã tham gia mới", release_review: "Ghi nhận duyệt phát hành", grant: "Cho phép", revoke: "Thu hồi" };
export function auditAction(value: string) {
  if (value === "audit.read") return "Xem nhật ký";
  const parts = value.split(".");
  const verb = actions[parts.at(-1)!];
  return verb && domains[parts[0]] ? `${verb} ${domains[parts[0]]}` : "Hoạt động hệ thống";
}
const fields: Record<string, string> = { status: "Trạng thái", title: "Tên", classId: "Lớp", dueDate: "Hạn nộp", dueAt: "Hạn nộp", deadlineRevision: "Lần cập nhật hạn", acceptedCount: "Số bài được chấp nhận", recipientCount: "Số người nhận", audience: "Người nhận", contentType: "Loại nội dung", contentVersion: "Phiên bản", contentId: "Nội dung", resourceKind: "Loại tài nguyên", resourceVersion: "Phiên bản tài nguyên", itemCount: "Số mục", submissionId: "Bài nộp", assignmentId: "Bài giao", timing: "Thời điểm nộp", ownerId: "Chủ sở hữu", scope: "Phạm vi", role: "Vai trò", name: "Tên", enabled: "Đang bật", requiresApproval: "Cần duyệt", grade: "Khối" };
const values: Record<string, string> = { ACTIVE: "Đang hoạt động", ARCHIVED: "Đã lưu trữ", DRAFT: "Bản nháp", PUBLISHED: "Đã xuất bản", SUBSET: "Nhóm học sinh", CLASS: "Cả lớp", TEST: "Bài kiểm tra", DECK: "Thẻ học", STUDY_QUIZ: "Luyện tập", lesson: "Bài học", lab: "Phòng thực hành", test: "Bài kiểm tra", LATE: "Nộp trễ", ON_TIME: "Đúng hạn", TEACHER_PRIVATE: "Riêng của giáo viên", SHARED_LIBRARY: "Thư viện chung" };
function display(value: unknown): string {
  if (value == null) return "Chưa có";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "object") return Array.isArray(value) ? `${value.length} mục` : "Có dữ liệu";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(text) && Number.isFinite(Date.parse(text))) return new Date(text).toLocaleString("vi-VN");
  return values[text] ?? text;
}
export function auditChanges(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  return [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].map((key) => `${fields[key] ?? "Thông tin bổ sung"}: ${display(before?.[key])} → ${display(after?.[key])}`);
}
