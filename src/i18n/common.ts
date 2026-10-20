import { defineText } from ".";

/** Copy shared across features (acc-5). */
export const commonText = defineText({
  vi: {
    roles: { STUDENT: "Học sinh", TEACHER: "Giáo viên", PARENT: "Phụ huynh", ADMIN: "Quản trị viên" },
    close: "Đóng",
    loading: "Đang tải dữ liệu…",
    pageLoading: "Đang mở không gian khám phá…",
    pageLoadingCaption: "NexaLab · Quan sát, thử nghiệm và khám phá",
    verdicts: { passed: "Đạt", partial: "Đạt một phần", not_passed: "Chưa đạt", needs_practice: "Cần luyện thêm" } as Record<string, string>,
    noDueDate: "Không có hạn nộp",
    due: (date: string) => `Hạn ${date}`,
  },
  en: {
    roles: { STUDENT: "Student", TEACHER: "Teacher", PARENT: "Parent", ADMIN: "Administrator" },
    close: "Close",
    loading: "Loading…",
    pageLoading: "Opening your discovery space…",
    pageLoadingCaption: "NexaLab · Observe, experiment and discover",
    verdicts: { passed: "Passed", partial: "Partly passed", not_passed: "Not passed", needs_practice: "Needs more practice" },
    noDueDate: "No due date",
    due: (date: string) => `Due ${date}`,
  },
});
