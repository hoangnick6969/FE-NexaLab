import { defineText } from "../../i18n";

export const richResourceText = defineText({
  vi: {
    names: { LAB: "Lab riêng của lớp", DOCUMENT: "Tài liệu đọc / xem", REPORT_TEMPLATE: "Mẫu báo cáo", LINK: "Liên kết tham khảo" },
    customize: "Tài nguyên Lab này dành cho luyện tập chung, chưa giao bài. Chọn nguồn và nội dung của lớp; muốn giao bài hãy vào mục Giao lab để chỉnh trong Lab Space. Mô hình và rubric nguồn giữ nguyên.",
    loadingLabs: "Đang tải Lab đã duyệt…", sourceLab: "Lab nguồn đã duyệt", chooseLab: "Chọn Lab nguồn",
    stale: "Nguồn đã có bản mới hoặc không còn khả dụng. Bản đã ghim không tự thay đổi. Nâng cấp nguồn rõ ràng trước khi chọn thử thách mới.",
    upgrade: "Dùng release mới", challenge: "Thử thách đã duyệt", chooseChallenge: "Chọn thử thách", pinnedChallenge: (id: string) => `Thử thách đã ghim: ${id}`,
    objective: "Mục tiêu học tập", instructions: "Hướng dẫn của giáo viên", prompts: "Câu hỏi báo cáo (mỗi dòng một câu, tối đa 20)",
    thumbnailUrl: "URL ảnh bìa riêng (HTTPS, tùy chọn)",
    description: "Mô tả / cách sử dụng", documentSource: "Nguồn tài liệu", linkSource: "Liên kết HTTPS / Google Drive", uploadSource: "Tải PDF, PNG, JPEG hoặc MP4",
    uploadHelp: "Tải trực tiếp PDF, PNG, JPEG, MP4. Với Word, Excel hoặc PowerPoint, chia sẻ liên kết Google Drive. Liên kết không cấp quyền Drive; hãy cho học sinh quyền xem tại nhà cung cấp.",
    url: "Liên kết HTTPS", checkedFile: "Tệp đã được kiểm tra trước khi đính kèm", uploading: "Đang tải và kiểm tra tệp…", fileReady: "Tệp đã sẵn sàng. Xem trước để kiểm tra nội dung.",
    classActivity: "Hoạt động của lớp", previewActivity: "Xem trước hoạt động", source: "Nguồn", teacherObjective: "Mục tiêu của giáo viên", teacherInstructions: "Hướng dẫn bổ sung của giáo viên",
    practiceHelp: "Giữ nguyên hướng dẫn và checkpoints của hoạt động nguồn. Luyện tập chung không chấm điểm.", openPractice: "Mở Lab để luyện tập", previewSource: "Xem hoạt động nguồn",
    sourcePreview: "Xem trước nguồn", openExternal: "Mở liên kết ngoài", openFile: "Mở tệp", popupBlocked: "Trình duyệt đã chặn cửa sổ mới. Cho phép cửa sổ bật lên cho trang này rồi nhấn Mở tệp lại.",
  },
  en: {
    names: { LAB: "Private class lab", DOCUMENT: "Reading / video material", REPORT_TEMPLATE: "Report template", LINK: "Reference link" },
    customize: "This Lab resource is for shared practice, before assignment. Choose the source and class content here; use Assign lab to design assigned work in Lab Space. The approved model and rubric remain pinned.",
    loadingLabs: "Loading approved labs…", sourceLab: "Approved source lab", chooseLab: "Choose a source lab",
    stale: "The source has a newer release or is unavailable. The pinned version stays unchanged. Explicitly upgrade the source before choosing a new challenge.",
    upgrade: "Use the new release", challenge: "Approved challenge", chooseChallenge: "Choose a challenge", pinnedChallenge: (id: string) => `Pinned challenge: ${id}`,
    objective: "Learning objective", instructions: "Teacher instructions", prompts: "Report prompts (one per line, up to 20)",
    thumbnailUrl: "Custom cover image URL (HTTPS, optional)",
    description: "Description / how to use", documentSource: "Material source", linkSource: "HTTPS / Google Drive link", uploadSource: "Upload PDF, PNG, JPEG or MP4",
    uploadHelp: "Upload PDF, PNG, JPEG or MP4 directly. Share Word, Excel or PowerPoint through a Google Drive link. A link does not grant Drive access; give students viewing permission with the provider.",
    url: "HTTPS link", checkedFile: "File checked before attachment", uploading: "Uploading and checking the file…", fileReady: "The file is ready. Preview it to check the content.",
    classActivity: "Class activity", previewActivity: "Activity preview", source: "Source", teacherObjective: "Teacher objective", teacherInstructions: "Additional teacher instructions",
    practiceHelp: "The source activity instructions and checkpoints remain unchanged. Shared practice is unscored.", openPractice: "Open lab practice", previewSource: "Preview the source activity",
    sourcePreview: "Source preview", openExternal: "Open external link", openFile: "Open file", popupBlocked: "Your browser blocked the new window. Allow pop-ups for this site, then select Open file again.",
  },
});
