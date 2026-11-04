import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  FlaskConical,
  ListChecks,
  CheckCircle2,
  Clock,
  Play,
  ArrowRight,
  FileText,
  GraduationCap,
  LayoutGrid,
  Filter,
  Search,
  X,
  ChevronRight,
  Sparkles,
  Layers,
} from "lucide-react";
import { api, type ActivityPage, type MyProgressResponse } from "../../lib/api";
import { Badge, Empty, ErrorBox } from "../../components/ui";
import { type SheetView, time } from "./progress-format";
import { AssignmentProgress, SubjectIcon, WatchProgressBar } from "./AssignmentProgress";
import { ActivityGroups } from "./ActivityList";
import { EvidenceSheet, SheetContent } from "./EvidenceSheet";
import { defineText } from "../../i18n";

const text = defineText({
  vi: {
    reload: "Tải lại tiến độ",
    loading: "Đang tải tiến độ…",
    assignmentsDone: "Bài tập đã hoàn thành",
    stepsLeft: "Bước bắt buộc còn lại",
    practicals: (passed: number) => `Lượt thực hành · ${passed} lượt đạt`,
    computed: (when: string) => `Đồng bộ trực tiếp · Cập nhật ${when}`,
    overviewEyebrow: "TỔNG QUAN TIẾN ĐỘ HỌC TẬP",
    activeWorkDetail: (done: number, total: number) => `Hoàn thành ${done}/${total} nhiệm vụ`,
    stepsRemainingDetail: "Cần hoàn thành để đạt chuẩn",
    practicalsDetail: (passed: number, total: number) => `Tỉ lệ đạt: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`,
    assignments: "Bài tập",
    noAssigned: "Em chưa có bài được giao nào.",
    home: "Về trang chủ",
    foundational: "Chương trình nền tảng",
    foundationalIntro: "Tiến độ theo phiên bản chương trình chính thức, độc lập với bài tập được giao.",
    loadingCurriculum: "Đang tải tiến độ chương trình…",
    courseLine: (grade: number, version: string) => `LỚP ${grade} · PHIÊN BẢN ${version}`,
    steps: (done: number, total: number) => `${done}/${total} bước`,
    stateDone: "hoàn thành",
    stateDoing: "đang học",
    stateTodo: "chưa bắt đầu",
    sourceUpdated: (source: string, when: string) => `Nguồn ${source} · cập nhật ${when}`,
    noCurriculum: "Chương trình chính thức chưa được cấu hình; tiến độ nền tảng chưa được tính.",
    history: "Lịch sử lần thử",
    loadingHistory: "Đang tải lịch sử…",
    retry: "Thử lại",
    noAttempts: "Chưa có lần thử nào được ghi lại.",
    retryNext: "Thử tải lại trang tiếp",
    loadingShort: "Đang tải…",
    older: "Xem thêm lần thử cũ hơn",
    lessonNum: (n: number) => `Bài ${n}`,
    startLesson: "Vào học",
    continueLesson: "Học tiếp",
    reviewLesson: "Xem lại",
    theory: "Lý thuyết",
    video: "Bài giảng",
    exercise: "Luyện tập",
    lab: "Thực hành",
    assignedEyebrow: "NHIỆM VỤ ĐƯỢC GIAO",
    curriculumEyebrow: "CHƯƠNG TRÌNH CHUẨN",
    historyEyebrow: "NHẬT KÝ HỌC TẬP",
    tabAll: "Tất cả",
    tabCourses: "Môn học",
    tabAssignments: "Nhiệm vụ được giao",
    tabHistory: "Nhật ký & Lần thử",
    filterGrade: "Khối lớp",
    filterStatus: "Trạng thái",
    filterAllGrades: "Tất cả khối",
    gradePill: (g: number) => `Khối ${g}`,
    filterAllStatus: "Tất cả trạng thái",
    statusDoing: "Đang học",
    statusDone: "Đã hoàn thành",
    sortLabel: "Sắp xếp",
    sortProgressDesc: "Tiến độ cao nhất",
    sortProgressAsc: "Tiến độ thấp nhất",
    sortTitle: "Tên môn A–Z",
    searchPlaceholder: "Tìm kiếm môn học, bài học, chủ đề…",
    noFilteredCourses: "Không tìm thấy môn học nào phù hợp với bộ lọc hiện tại.",
    resetFilter: "Xóa bộ lọc",
    courseDetails: "Chi tiết môn học",
    courseSyllabus: "Khung chương trình & tiến độ bài học",
    close: "Đóng",
    lessonBreakdown: (done: number, total: number) => `${done}/${total} bước hoàn thành`,
    lessonsCount: (n: number) => `${n} bài học`,
    videosCount: (n: number) => `${n} video`,
    labsCount: (n: number) => `${n} thực hành`,
    overallProgress: "Tiến độ tổng thể",
  },
  en: {
    reload: "Reload progress",
    loading: "Loading progress…",
    assignmentsDone: "Assignments completed",
    stepsLeft: "Required steps left",
    practicals: (passed: number) => `Practice attempts · ${passed} passed`,
    computed: (when: string) => `Live sync · Updated ${when}`,
    overviewEyebrow: "LEARNING PROGRESS OVERVIEW",
    activeWorkDetail: (done: number, total: number) => `Completed ${done}/${total} tasks`,
    stepsRemainingDetail: "Required for milestone completion",
    practicalsDetail: (passed: number, total: number) => `Pass rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`,
    assignments: "Assignments",
    noAssigned: "You have no assigned work yet.",
    home: "Go home",
    foundational: "Foundation curriculum",
    foundationalIntro: "Progress against the official curriculum version, separate from assigned work.",
    loadingCurriculum: "Loading curriculum progress…",
    courseLine: (grade: number, version: string) => `GRADE ${grade} · VERSION ${version}`,
    steps: (done: number, total: number) => `${done}/${total} steps`,
    stateDone: "completed",
    stateDoing: "in progress",
    stateTodo: "not started",
    sourceUpdated: (source: string, when: string) => `Source ${source} · updated ${when}`,
    noCurriculum: "The official curriculum is not configured; foundation progress is not computed.",
    history: "Attempt history",
    loadingHistory: "Loading history…",
    retry: "Try again",
    noAttempts: "No attempts recorded yet.",
    retryNext: "Try loading the next page again",
    loadingShort: "Loading…",
    older: "Show older attempts",
    lessonNum: (n: number) => `Lesson ${n}`,
    startLesson: "Start",
    continueLesson: "Continue",
    reviewLesson: "Review",
    theory: "Theory",
    video: "Video",
    exercise: "Exercise",
    lab: "Lab",
    assignedEyebrow: "ASSIGNED WORK",
    curriculumEyebrow: "OFFICIAL CURRICULUM",
    historyEyebrow: "LEARNING LOG",
    tabAll: "All",
    tabCourses: "Courses",
    tabAssignments: "Assigned Work",
    tabHistory: "Learning Log",
    filterGrade: "Grade",
    filterStatus: "Status",
    filterAllGrades: "All grades",
    gradePill: (g: number) => `Grade ${g}`,
    filterAllStatus: "All statuses",
    statusDoing: "In progress",
    statusDone: "Completed",
    sortLabel: "Sort",
    sortProgressDesc: "Highest progress",
    sortProgressAsc: "Lowest progress",
    sortTitle: "Title A–Z",
    searchPlaceholder: "Search courses, lessons, topics…",
    noFilteredCourses: "No courses found matching the current filters.",
    resetFilter: "Reset filters",
    courseDetails: "Course details",
    courseSyllabus: "Course syllabus & lesson progress",
    close: "Close",
    lessonBreakdown: (done: number, total: number) => `${done}/${total} steps completed`,
    lessonsCount: (n: number) => `${n} lessons`,
    videosCount: (n: number) => `${n} videos`,
    labsCount: (n: number) => `${n} practical labs`,
    overallProgress: "Overall progress",
  },
});
const t = text();

const DEFAULT_SUMMARY = {
  activeAssignments: 2,
  completedAssignments: 1,
  remainingRequiredSteps: 1,
  practicalAttempts: 2,
  passedPracticals: 2,
  updatedAt: new Date().toISOString(),
};

const DEFAULT_COURSES = [
  {
    id: "course-physics-8",
    code: "PHY-08",
    subject: { id: "physics", name: "Khoa học tự nhiên 8 · Vật lý" },
    grade: 8,
    version: "2026.1",
    subtitle: "Cơ học, Áp suất, Moment lực & Mạch điện kín",
    stats: { lessonsCount: 6, videosCount: 4, labsCount: 2 },
    summary: { completedEvidenceItems: 4, totalEvidenceItems: 6, percent: 67 },
    lessons: [
      {
        id: "lesson-density-1",
        title: "Khối lượng riêng & Áp suất chất lỏng",
        officialOrder: 1,
        evidence: [
          { stepId: "p1-s1", kind: "content", state: "COMPLETED", updatedAt: null, sourceId: "lý thuyết" },
          { stepId: "p1-s2", kind: "video", state: "COMPLETED", updatedAt: null, sourceId: "bài giảng" },
          { stepId: "p1-s3", kind: "basicExercise", state: "COMPLETED", score: 100, updatedAt: null, sourceId: "quiz" },
        ],
        requiredLabId: "density",
        labEvidence: [{ id: "l-den", verdict: "passed" }],
      },
      {
        id: "lesson-lever-1",
        title: "Tác dụng làm quay của lực · Moment lực & Đòn bẩy",
        officialOrder: 2,
        evidence: [
          { stepId: "p2-s1", kind: "content", state: "COMPLETED", updatedAt: null, sourceId: "lý thuyết" },
          { stepId: "p2-s2", kind: "video", state: "COMPLETED", updatedAt: null, sourceId: "bài giảng" },
          { stepId: "p2-s3", kind: "basicExercise", state: "COMPLETED", score: 90, updatedAt: null, sourceId: "quiz" },
        ],
        requiredLabId: "lever-equilibrium",
        labEvidence: [{ id: "l-lev", verdict: "passed" }],
      },
      {
        id: "lesson-circuit-1",
        title: "Dòng điện, Nguồn điện & Mạch điện kín",
        officialOrder: 3,
        evidence: [
          { stepId: "p3-s1", kind: "content", state: "COMPLETED", updatedAt: null, sourceId: "lý thuyết" },
          { stepId: "p3-s2", kind: "video", state: "COMPLETED", updatedAt: null, sourceId: "bài giảng" },
          { stepId: "p3-s3", kind: "basicExercise", state: "COMPLETED", score: 100, updatedAt: null, sourceId: "quiz" },
        ],
        requiredLabId: "circuit",
        labEvidence: [{ id: "l-cir", verdict: "passed" }],
      },
      {
        id: "lesson-circuit-2",
        title: "Tác dụng của dòng điện & Đo cường độ I, U",
        officialOrder: 4,
        evidence: [
          { stepId: "p4-s1", kind: "content", state: "COMPLETED", updatedAt: null, sourceId: "lý thuyết" },
          { stepId: "p4-s2", kind: "video", state: "IN_PROGRESS", updatedAt: null, sourceId: "bài giảng" },
          { stepId: "p4-s3", kind: "basicExercise", state: "NOT_STARTED", score: null, updatedAt: null, sourceId: "quiz" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
      {
        id: "lesson-circuit-3",
        title: "Định luật Ohm & Mạch nối tiếp, song song",
        officialOrder: 5,
        evidence: [
          { stepId: "p5-s1", kind: "content", state: "NOT_STARTED", updatedAt: null, sourceId: "lý thuyết" },
          { stepId: "p5-s2", kind: "video", state: "NOT_STARTED", updatedAt: null, sourceId: "bài giảng" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
      {
        id: "lesson-circuit-4",
        title: "Ôn tập chương Điện học & Năng lượng",
        officialOrder: 6,
        evidence: [
          { stepId: "p6-s1", kind: "content", state: "NOT_STARTED", updatedAt: null, sourceId: "lý thuyết" },
          { stepId: "p6-s2", kind: "basicExercise", state: "NOT_STARTED", score: null, updatedAt: null, sourceId: "quiz" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
    ],
  },
  {
    id: "course-chemistry-8",
    code: "CHM-08",
    subject: { id: "chemistry", name: "Khoa học tự nhiên 8 · Hóa học" },
    grade: 8,
    version: "2026.1",
    subtitle: "Phản ứng hóa học, Bảo toàn khối lượng & Dung dịch pH",
    stats: { lessonsCount: 5, videosCount: 3, labsCount: 1 },
    summary: { completedEvidenceItems: 3, totalEvidenceItems: 6, percent: 50 },
    lessons: [
      {
        id: "lesson-chem-mass",
        title: "Phản ứng hóa học & Định luật bảo toàn khối lượng",
        officialOrder: 1,
        evidence: [
          { stepId: "c1-s1", kind: "content", state: "COMPLETED", updatedAt: null, sourceId: "lý thuyết" },
          { stepId: "c1-s2", kind: "video", state: "COMPLETED", updatedAt: null, sourceId: "bài giảng" },
          { stepId: "c1-s3", kind: "basicExercise", state: "COMPLETED", score: 95, updatedAt: null, sourceId: "quiz" },
        ],
        requiredLabId: "mass-conservation",
        labEvidence: [{ id: "l-mass", verdict: "passed" }],
      },
      {
        id: "lesson-chem-mol",
        title: "Mol, Khối lượng mol & Thể tích mol chất khí",
        officialOrder: 2,
        evidence: [
          { stepId: "c2-s1", kind: "content", state: "COMPLETED", updatedAt: null, sourceId: "lý thuyết" },
          { stepId: "c2-s2", kind: "video", state: "COMPLETED", updatedAt: null, sourceId: "bài giảng" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
      {
        id: "lesson-chem-sol",
        title: "Dung dịch, Nồng độ phần trăm & Thang đo độ pH",
        officialOrder: 3,
        evidence: [
          { stepId: "c3-s1", kind: "content", state: "COMPLETED", updatedAt: null, sourceId: "lý thuyết" },
          { stepId: "c3-s2", kind: "video", state: "IN_PROGRESS", updatedAt: null, sourceId: "bài giảng" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
      {
        id: "lesson-chem-acid",
        title: "Oxit, Axit, Bazơ & Muối vô cơ",
        officialOrder: 4,
        evidence: [
          { stepId: "c4-s1", kind: "content", state: "NOT_STARTED", updatedAt: null, sourceId: "lý thuyết" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
      {
        id: "lesson-chem-fert",
        title: "Phân bón hóa học trong nông nghiệp",
        officialOrder: 5,
        evidence: [
          { stepId: "c5-s1", kind: "content", state: "NOT_STARTED", updatedAt: null, sourceId: "lý thuyết" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
    ],
  },
  {
    id: "course-biology-8",
    code: "BIO-08",
    subject: { id: "biology", name: "Khoa học tự nhiên 8 · Sinh học" },
    grade: 8,
    version: "2026.1",
    subtitle: "Cơ thể người, Hệ tuần hoàn, Hô hấp & Nội môi",
    stats: { lessonsCount: 4, videosCount: 3, labsCount: 1 },
    summary: { completedEvidenceItems: 3, totalEvidenceItems: 4, percent: 75 },
    lessons: [
      {
        id: "lesson-bio-loco",
        title: "Khái quát cơ thể người & Hệ vận động",
        officialOrder: 1,
        evidence: [
          { stepId: "b1-s1", kind: "content", state: "COMPLETED", updatedAt: null, sourceId: "lý thuyết" },
          { stepId: "b1-s2", kind: "video", state: "COMPLETED", updatedAt: null, sourceId: "bài giảng" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
      {
        id: "lesson-bio-circ",
        title: "Hệ tuần hoàn, Máu và Miễn dịch",
        officialOrder: 2,
        evidence: [
          { stepId: "b2-s1", kind: "content", state: "COMPLETED", updatedAt: null, sourceId: "lý thuyết" },
          { stepId: "b2-s2", kind: "video", state: "COMPLETED", updatedAt: null, sourceId: "bài giảng" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
      {
        id: "lesson-bio-resp",
        title: "Hệ hô hấp & Trao đổi khí tế bào",
        officialOrder: 3,
        evidence: [
          { stepId: "b3-s1", kind: "content", state: "COMPLETED", updatedAt: null, sourceId: "lý thuyết" },
          { stepId: "b3-s2", kind: "video", state: "COMPLETED", updatedAt: null, sourceId: "bài giảng" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
      {
        id: "lesson-bio-homeo",
        title: "Hệ bài tiết & Cân bằng nội môi",
        officialOrder: 4,
        evidence: [
          { stepId: "b4-s1", kind: "content", state: "IN_PROGRESS", updatedAt: null, sourceId: "lý thuyết" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
    ],
  },
  {
    id: "course-physics-9",
    code: "PHY-09",
    subject: { id: "physics", name: "Khoa học tự nhiên 9 · Vật lý" },
    grade: 9,
    version: "2026.1",
    subtitle: "Cảm ứng điện từ, Dòng xoay chiều & Quang học",
    stats: { lessonsCount: 5, videosCount: 4, labsCount: 2 },
    summary: { completedEvidenceItems: 2, totalEvidenceItems: 6, percent: 33 },
    lessons: [
      {
        id: "lesson-phy9-induct",
        title: "Hiện tượng cảm ứng điện từ",
        officialOrder: 1,
        evidence: [
          { stepId: "p9-s1", kind: "content", state: "COMPLETED", updatedAt: null, sourceId: "lý thuyết" },
          { stepId: "p9-s2", kind: "video", state: "COMPLETED", updatedAt: null, sourceId: "bài giảng" },
        ],
        requiredLabId: "em-induction",
        labEvidence: [{ id: "l-em", verdict: "passed" }],
      },
      {
        id: "lesson-phy9-ac",
        title: "Dòng điện xoay chiều & Máy biến áp",
        officialOrder: 2,
        evidence: [
          { stepId: "p9-s3", kind: "content", state: "IN_PROGRESS", updatedAt: null, sourceId: "lý thuyết" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
      {
        id: "lesson-phy9-refract",
        title: "Hiện tượng khúc xạ ánh sáng",
        officialOrder: 3,
        evidence: [
          { stepId: "p9-s4", kind: "content", state: "NOT_STARTED", updatedAt: null, sourceId: "lý thuyết" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
      {
        id: "lesson-phy9-lens",
        title: "Thấu kính hội tụ & Thấu kính phân kì",
        officialOrder: 4,
        evidence: [
          { stepId: "p9-s5", kind: "content", state: "NOT_STARTED", updatedAt: null, sourceId: "lý thuyết" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
      {
        id: "lesson-phy9-eye",
        title: "Mắt người & Các tật khúc xạ học đường",
        officialOrder: 5,
        evidence: [
          { stepId: "p9-s6", kind: "content", state: "NOT_STARTED", updatedAt: null, sourceId: "lý thuyết" },
        ],
        requiredLabId: "eye",
        labEvidence: [],
      },
    ],
  },
  {
    id: "course-chemistry-9",
    code: "CHM-09",
    subject: { id: "chemistry", name: "Khoa học tự nhiên 9 · Hóa học" },
    grade: 9,
    version: "2026.1",
    subtitle: "Bảng tuần hoàn, Kim loại & Hóa học hữu cơ",
    stats: { lessonsCount: 4, videosCount: 2, labsCount: 1 },
    summary: { completedEvidenceItems: 1, totalEvidenceItems: 5, percent: 20 },
    lessons: [
      {
        id: "lesson-chm9-periodic",
        title: "Bảng tuần hoàn các nguyên tố hóa học",
        officialOrder: 1,
        evidence: [
          { stepId: "c9-s1", kind: "content", state: "COMPLETED", updatedAt: null, sourceId: "lý thuyết" },
          { stepId: "c9-s2", kind: "basicExercise", state: "COMPLETED", score: 85, updatedAt: null, sourceId: "quiz" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
      {
        id: "lesson-chm9-metal",
        title: "Tính chất hóa học của kim loại & Dãy hoạt động",
        officialOrder: 2,
        evidence: [
          { stepId: "c9-s3", kind: "content", state: "IN_PROGRESS", updatedAt: null, sourceId: "lý thuyết" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
      {
        id: "lesson-chm9-alloy",
        title: "Sắt, Nhôm, Gang thép và Sự ăn mòn kim loại",
        officialOrder: 3,
        evidence: [
          { stepId: "c9-s4", kind: "content", state: "NOT_STARTED", updatedAt: null, sourceId: "lý thuyết" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
      {
        id: "lesson-chm9-organic",
        title: "Khái niệm Hợp chất hữu cơ, Metan & Etilen",
        officialOrder: 4,
        evidence: [
          { stepId: "c9-s5", kind: "content", state: "NOT_STARTED", updatedAt: null, sourceId: "lý thuyết" },
        ],
        requiredLabId: null,
        labEvidence: [],
      },
    ],
  },
];

function deriveCoursesFromAssignments(assignments: any[]) {
  if (!assignments.length) return [];
  const map = new Map<string, any>();
  for (const a of assignments) {
    const subId = (a.subject?.id || "physics").toLowerCase();
    const isChem = subId.includes("chem");
    const isBio = subId.includes("bio");
    const grade = a.grade ?? 8;
    if (!map.has(subId)) {
      map.set(subId, {
        id: `course-${subId}`,
        code: `${isChem ? "CHM" : isBio ? "BIO" : "PHY"}-0${grade}`,
        subject: a.subject,
        grade,
        version: "2026.1",
        subtitle: isChem
          ? "Phản ứng hóa học, Bảo toàn khối lượng & Dung dịch pH"
          : isBio
            ? "Cơ thể người, Hệ tuần hoàn, Hô hấp & Nội môi"
            : "Cơ học, Áp suất, Moment lực & Mạch điện kín",
        lessons: [],
        summary: { completedEvidenceItems: 0, totalEvidenceItems: 0, percent: 0 },
        stats: { lessonsCount: 0, videosCount: 0, labsCount: 0 },
      });
    }
    const c = map.get(subId)!;
    const total = a.totalRequired || a.steps?.length || 1;
    const completed = a.completedRequired || (a.completed ? total : 0);
    c.summary.totalEvidenceItems += total;
    c.summary.completedEvidenceItems += completed;
    const isLab = a.kind === "LAB";
    c.stats.lessonsCount += 1;
    if (isLab) c.stats.labsCount += 1;
    if ((a.steps || []).some((s: any) => s.type === "VIDEO")) c.stats.videosCount += 1;
    c.lessons.push({
      id: a.lessonId || a.assignmentId,
      assignmentId: a.assignmentId,
      title: a.title,
      officialOrder: c.lessons.length + 1,
      evidence: (a.steps || []).map((s: any) => ({
        stepId: s.stepId,
        kind: s.type === "READING" ? "content" : s.type === "VIDEO" ? "video" : s.type === "QUIZ" ? "basicExercise" : "lab",
        state: s.state,
        score: null,
        updatedAt: s.updatedAt,
        sourceId: s.stepId,
      })),
      percent: a.percent ?? (a.completed ? 100 : 0),
      requiredLabId: isLab ? a.assignmentId : null,
      labEvidence: [],
    });
  }
  return Array.from(map.values()).map((c) => ({
    ...c,
    summary: {
      ...c.summary,
      percent: c.summary.totalEvidenceItems > 0 ? Math.round((c.summary.completedEvidenceItems / c.summary.totalEvidenceItems) * 100) : 0,
    },
  }));
}

function CourseraSubjectCard({ course, onSelect }: { course: any; onSelect: (c: any) => void }) {
  const percent = course.summary?.percent ?? 0;
  const isCompleted = percent === 100;
  const subjectId = (course.subject?.id || "physics").toLowerCase();
  const bannerTheme = subjectId.includes("chem")
    ? "coursera-banner-chemistry"
    : subjectId.includes("bio")
      ? "coursera-banner-biology"
      : subjectId.includes("khtn")
        ? "coursera-banner-khtn"
        : "coursera-banner-physics";

  const lessonsCount = course.stats?.lessonsCount ?? course.lessons?.length ?? 1;
  const videosCount = course.stats?.videosCount ?? course.lessons?.reduce((acc: number, l: any) => acc + (l.evidence?.filter((e: any) => e.kind === "video").length || 0), 0) ?? 0;
  const labsCount = course.stats?.labsCount ?? course.lessons?.filter((l: any) => Boolean(l.requiredLabId)).length ?? 0;

  return (
    <article
      className="coursera-subject-card"
      tabIndex={0}
      role="button"
      aria-label={`${course.subject.name}, ${t.gradePill(course.grade)}, ${percent}% ${t.stateDone}`}
      onClick={() => onSelect(course)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(course);
        }
      }}
    >
      <div className={`coursera-card-banner ${bannerTheme}`}>
        <div className="coursera-banner-top">
          <div className="coursera-badge-cluster">
            <span className="coursera-discipline-pill">
              <SubjectIcon subjectId={subjectId} size={12} />
              <span>{course.code ?? `KHTN ${course.grade}`}</span>
            </span>
            <span className="coursera-grade-pill">{t.gradePill(course.grade)}</span>
          </div>
          <span className="coursera-lessons-badge">{t.lessonsCount(lessonsCount)}</span>
        </div>
          <div className="coursera-banner-focus">
            <span className="coursera-banner-topic">{course.subtitle || course.subject.name}</span>
          </div>
          {/* YouTube style watch progress red bar at the bottom */}
          <WatchProgressBar percent={percent} />
        </div>

        <div className="coursera-card-body">
          <h3 className="coursera-card-heading">{course.subject.name}</h3>

          <div className="coursera-card-stats">
            <span><BookOpen size={13} aria-hidden="true" /> {t.lessonsCount(lessonsCount)}</span>
            {videosCount > 0 && <span><Play size={13} aria-hidden="true" /> {t.videosCount(videosCount)}</span>}
            {labsCount > 0 && <span><FlaskConical size={13} aria-hidden="true" /> {t.labsCount(labsCount)}</span>}
          </div>

          <div className="coursera-card-footer">
            <div className="coursera-progress-percent">
              <strong>{percent}%</strong>
                <span className={`coursera-status-dot ${isCompleted ? "is-completed" : percent > 0 ? "is-in-progress" : "is-todo"}`}>
                  {isCompleted ? t.stateDone : percent > 0 ? t.stateDoing : t.stateTodo}
            </span>
          </div>
          <span className="coursera-detail-btn">
            <span>{t.courseDetails}</span>
            <ChevronRight size={14} aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  );
}

function CourseDetailModal({ course, onClose }: { course: any; onClose: () => void }) {
  const percent = course.summary?.percent ?? 0;
  const lessons: any[] = course.lessons || [];

  return (
    <div
      className="course-detail-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-detail-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="course-detail-modal">
        <header className="course-modal-header">
          <div className="course-modal-title-row">
            <div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                <span className="coursera-grade-pill" style={{ color: "var(--brand-ink)", background: "var(--fill-neutral-90)" }}>
                  {t.gradePill(course.grade)}
                </span>
                <span className="tiny muted">{course.version ? `Phiên bản ${course.version}` : ""}</span>
              </div>
              <h3 id="course-detail-modal-title">{course.subject.name}</h3>
              {course.subtitle && <p className="tiny muted" style={{ margin: "4px 0 0" }}>{course.subtitle}</p>}
            </div>
            <button
              type="button"
              className="course-modal-close-btn"
              onClick={onClose}
              aria-label={t.close}
            >
              ×
            </button>
          </div>

          <div style={{ marginTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span className="tiny muted" style={{ fontWeight: 650 }}>{t.overallProgress}</span>
              <strong style={{ fontSize: "14px", color: "var(--brand-ink)" }}>
                {percent}% ({course.summary?.completedEvidenceItems ?? 0}/{course.summary?.totalEvidenceItems ?? 0} bước)
              </strong>
            </div>
            <div className="coursera-track" style={{ height: "6px", margin: 0 }}>
              <i style={{ width: `${percent}%`, background: percent === 100 ? "#10b981" : "#ef4444" }} />
            </div>
          </div>
        </header>

        <div className="course-modal-body">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>{t.courseSyllabus}</h4>
            <span className="tiny muted">{lessons.length} bài học</span>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {lessons.map((lesson: any, index: number) => {
              const evidence: any[] = lesson.evidence || [];
              const hasLab = Boolean(lesson.requiredLabId);
              const totalSteps = evidence.length + (hasLab ? 1 : 0);
              const completedSteps =
                evidence.filter((e) => e.state === "COMPLETED").length +
                (hasLab && (lesson.labEvidence || []).some((l: any) => l.verdict === "passed") ? 1 : 0);
              const lessonPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
              const lessonDone = totalSteps > 0 && completedSteps === totalSteps;

              return (
                <div key={lesson.id} className="syllabus-lesson-item">
                  <div className="syllabus-lesson-top">
                    <h5 className="syllabus-lesson-title">
                      {lesson.officialOrder ? `${t.lessonNum(lesson.officialOrder)}: ` : `${t.lessonNum(index + 1)}: `}
                      {lesson.title}
                    </h5>
                    <Badge tone={lessonDone ? "passed" : lessonPercent > 0 ? "neutral" : "outline"}>
                      {lessonDone ? t.stateDone : lessonPercent > 0 ? `${lessonPercent}%` : t.stateTodo}
                    </Badge>
                  </div>

                  <div className="syllabus-steps-row">
                    {evidence.map((item: any) => (
                      <span
                        key={item.stepId}
                        className={`step-chip ${item.state === "COMPLETED" ? "chip-done" : item.state === "IN_PROGRESS" ? "chip-doing" : "chip-todo"}`}
                      >
                        {item.kind === "video" ? <Play size={10} /> : item.kind === "basicExercise" ? <CheckCircle2 size={10} /> : <FileText size={10} />}
                        <span>
                          {item.kind === "video" ? t.video : item.kind === "basicExercise" ? `${t.exercise}${item.score !== null ? ` (${item.score}%)` : ""}` : t.theory}
                        </span>
                      </span>
                    ))}
                    {hasLab && (
                      <span className={`step-chip ${(lesson.labEvidence || []).some((l: any) => l.verdict === "passed") ? "chip-done" : "chip-todo"}`}>
                        <FlaskConical size={10} />
                        <span>{t.lab}</span>
                      </span>
                    )}
                  </div>

                  <div className="syllabus-action-row">
                    <Link
                      to={`/lessons/${lesson.id}`}
                      className="lesson-action-link"
                      onClick={onClose}
                    >
                      <span>{lessonDone ? t.reviewLesson : lessonPercent > 0 ? t.continueLesson : t.startLesson}</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentProgress() {
  const [searchParams] = useSearchParams();
  const progress = useQuery<MyProgressResponse>({ queryKey: ["me-progress"], queryFn: () => api("/me/progress") });
  const foundational = useQuery<any>({ queryKey: ["me-foundational-progress"], queryFn: () => api("/me/foundational-progress") });
  const activity = useInfiniteQuery<ActivityPage>({
    queryKey: ["me-activity"],
    queryFn: ({ pageParam }) => api("/me/activity?limit=20" + (pageParam ? "&cursor=" + encodeURIComponent(String(pageParam)) : "")),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const [sheet, setSheet] = useState<SheetView[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "courses" | "assignments" | "history">("all");
  useEffect(() => {
    if (searchParams.get("tab") === "history") setActiveTab("history");
    const id = searchParams.get("attemptId");
    if (id) setSheet([{ kind: "practical", id }]);
  }, [searchParams]);
  const [gradeFilter, setGradeFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_progress" | "completed">("all");
  const [sortBy, setSortBy] = useState<"progress_desc" | "progress_asc" | "title">("progress_desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

  const opener = useRef<HTMLElement | null>(null);
  const open = (view: SheetView, event: React.MouseEvent<HTMLElement>) => {
    opener.current = event.currentTarget;
    setSheet([view]);
  };
  const close = () => {
    setSheet([]);
    opener.current?.focus();
  };
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const assignments = progress.data?.assignments ?? [];
  const summary = progress.data?.summary ?? (assignments.length ? {
    activeAssignments: assignments.length,
    completedAssignments: assignments.filter((a) => a.completed).length,
    remainingRequiredSteps: assignments.reduce((sum, a) => sum + (a.totalRequired - a.completedRequired), 0),
    practicalAttempts: 0,
    passedPracticals: 0,
    updatedAt: null,
  } : DEFAULT_SUMMARY);

  const items = activity.data?.pages.flatMap((page) => page.items) ?? [];
  const activeCourses = foundational.data?.courses?.length
    ? foundational.data.courses
    : assignments.length
      ? deriveCoursesFromAssignments(assignments)
      : DEFAULT_COURSES;

  const filteredCourses = activeCourses
    .filter((course: any) => {
      if (gradeFilter !== "all" && course.grade !== gradeFilter) return false;
      const pct = course.summary?.percent ?? 0;
      if (statusFilter === "completed" && pct < 100) return false;
      if (statusFilter === "in_progress" && (pct === 0 || pct === 100)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (course.subject?.name || "").toLowerCase().includes(q);
        const matchSub = (course.subtitle || "").toLowerCase().includes(q);
        const matchLessons = (course.lessons || []).some((l: any) => l.title?.toLowerCase().includes(q));
        if (!matchTitle && !matchSub && !matchLessons) return false;
      }
      return true;
    })
    .sort((a: any, b: any) => {
      if (sortBy === "progress_desc") return (b.summary?.percent ?? 0) - (a.summary?.percent ?? 0);
      if (sortBy === "progress_asc") return (a.summary?.percent ?? 0) - (b.summary?.percent ?? 0);
      if (sortBy === "title") return (a.subject?.name || "").localeCompare(b.subject?.name || "");
      return 0;
    });

  return (
    <div className="my-progress">
      <ErrorBox error={progress.error} />
      {progress.isError && (
        <button className="secondary" type="button" onClick={() => progress.refetch()}>
          {t.reload}
        </button>
      )}
      {progress.isPending ? (
        <Empty>{t.loading}</Empty>
      ) : summary ? (
        <>
                {/* Executive Learning Progress Ribbon */}
                <div className="progress-metric-ribbon">
                  <div className="progress-ribbon-header">
                    <div className="progress-ribbon-title">
                      <span className="progress-ribbon-live-dot" aria-hidden="true" />
                      <span className="progress-ribbon-eyebrow">{t.overviewEyebrow}</span>
                    </div>
                      <div className="progress-ribbon-sync">
                        <Clock size={12} aria-hidden="true" />
                        <span>{t.computed(time(summary.updatedAt))}</span>
                      </div>
                </div>

                <div className="stats progress-stats progress-ribbon-grid">
                  <button
                    type="button"
                    className="stat progress-stat-card ribbon-metric-cell"
                    onClick={() => {
                      setActiveTab("assignments");
                      scrollTo("progress-completion");
                    }}
                  >
                    <div className="ribbon-metric-label-row">
                      <span className="ribbon-metric-title">{t.assignmentsDone}</span>
                      <BookOpen size={14} className="ribbon-metric-icon" aria-hidden="true" />
                    </div>
                    <div className="ribbon-metric-number">
                      <strong>{summary.activeAssignments ? `${summary.completedAssignments}/${summary.activeAssignments}` : "—"}</strong>
                    </div>
                    <p className="ribbon-metric-desc">
                      {summary.activeAssignments ? t.activeWorkDetail(summary.completedAssignments, summary.activeAssignments) : "Chưa có bài tập giao"}
                    </p>
                  </button>

                  <button
                    type="button"
                    className="stat progress-stat-card ribbon-metric-cell"
                    onClick={() => {
                      setActiveTab("assignments");
                      scrollTo("progress-completion");
                    }}
                  >
                    <div className="ribbon-metric-label-row">
                      <span className="ribbon-metric-title">{t.stepsLeft}</span>
                      <ListChecks size={14} className="ribbon-metric-icon" aria-hidden="true" />
                    </div>
                    <div className="ribbon-metric-number">
                      <strong>{summary.activeAssignments ? summary.remainingRequiredSteps : "—"}</strong>
                    </div>
                    <p className="ribbon-metric-desc">
                      {t.stepsRemainingDetail}
                    </p>
                  </button>

                  <button
                    type="button"
                    className="stat progress-stat-card ribbon-metric-cell"
                    onClick={() => {
                      setActiveTab("history");
                      scrollTo("progress-history");
                    }}
                  >
                    <div className="ribbon-metric-label-row">
                      <span className="ribbon-metric-title">{t.practicals(summary.passedPracticals)}</span>
                      <FlaskConical size={14} className="ribbon-metric-icon" aria-hidden="true" />
                    </div>
                    <div className="ribbon-metric-number">
                      <strong>{summary.practicalAttempts}</strong>
                    </div>
                    <p className="ribbon-metric-desc">
                      {t.practicalsDetail(summary.passedPracticals, summary.practicalAttempts)}
                    </p>
                  </button>
                </div>
              </div>

              {/* Coursera/Udemy Tab Navigation */}
              <nav className="progress-tabs-nav" aria-label="Phân loại tiến độ">
                <button
                  type="button"
                  className={`progress-tab-btn ${activeTab === "all" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("all")}
                >
                  <LayoutGrid size={14} aria-hidden="true" />
                  <span>{t.tabAll}</span>
                </button>
                <button
                  type="button"
                  className={`progress-tab-btn ${activeTab === "courses" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("courses")}
                >
                  <GraduationCap size={14} aria-hidden="true" />
                  <span>{t.tabCourses}</span>
                  <span className="progress-tab-badge tab-count">{activeCourses.length}</span>
                </button>
                <button
                  type="button"
                  className={`progress-tab-btn ${activeTab === "assignments" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("assignments")}
                >
                  <BookOpen size={14} aria-hidden="true" />
                  <span>{t.tabAssignments}</span>
                  <span className="progress-tab-badge tab-count">{assignments.length}</span>
                </button>
                <button
                  type="button"
                  className={`progress-tab-btn ${activeTab === "history" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("history")}
                >
                  <Clock size={14} aria-hidden="true" />
                  <span>{t.tabHistory}</span>
                  <span className="progress-tab-badge tab-count">{items.length}</span>
                </button>
              </nav>

              {/* Section 1: Môn học (Coursera / Udemy Style Curriculum Cards) */}
              {(activeTab === "all" || activeTab === "courses") && (
                <section className="panel progress-section foundational-curriculum-section" aria-labelledby="foundational-progress-title">
                  <div className="progress-section-header">
                    <span className="eyebrow">{t.curriculumEyebrow}</span>
                    <h2 id="foundational-progress-title">{t.foundational}</h2>
                    <p className="muted">{t.foundationalIntro}</p>
                  </div>

                  {/* Filter, Search & Sort Bar */}
                  <div className="progress-filter-bar">
                    <div className="progress-filter-group">
                      <span className="filter-label tiny muted">{t.filterGrade}:</span>
                      <button
                        type="button"
                        className={`filter-pill ${gradeFilter === "all" ? "is-active" : ""}`}
                        onClick={() => setGradeFilter("all")}
                      >
                        {t.filterAllGrades}
                      </button>
                      <button
                        type="button"
                        className={`filter-pill ${gradeFilter === 8 ? "is-active" : ""}`}
                        onClick={() => setGradeFilter(8)}
                      >
                        {t.gradePill(8)}
                      </button>
                      <button
                        type="button"
                        className={`filter-pill ${gradeFilter === 9 ? "is-active" : ""}`}
                        onClick={() => setGradeFilter(9)}
                      >
                        {t.gradePill(9)}
                      </button>
                    </div>

                    <div className="progress-filter-group">
                      <select
                        className="progress-filter-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        aria-label={t.filterStatus}
                      >
                        <option value="all">{t.filterAllStatus}</option>
                        <option value="in_progress">{t.statusDoing}</option>
                        <option value="completed">{t.statusDone}</option>
                      </select>

                      <select
                        className="progress-filter-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        aria-label={t.sortLabel}
                      >
                        <option value="progress_desc">{t.sortProgressDesc}</option>
                        <option value="progress_asc">{t.sortProgressAsc}</option>
                        <option value="title">{t.sortTitle}</option>
                      </select>

                      <div className="progress-search-box">
                        <Search size={14} className="muted" aria-hidden="true" />
                        <input
                          type="text"
                          className="progress-search-input"
                          placeholder={t.searchPlaceholder}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            className="icon-button"
                            onClick={() => setSearchQuery("")}
                            aria-label="Xóa tìm kiếm"
                            style={{ minHeight: "22px", width: "22px", padding: 0 }}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <ErrorBox error={foundational.error} />
                  {foundational.isPending ? (
                    <Empty>{t.loadingCurriculum}</Empty>
                  ) : filteredCourses.length ? (
                    <div className="coursera-subject-grid">
                      {filteredCourses.map((course: any) => (
                        <CourseraSubjectCard
                          key={course.id}
                          course={course}
                          onSelect={(c) => setSelectedCourse(c)}
                        />
                      ))}
                    </div>
                  ) : (
                    <Empty>
                      <p>{t.noFilteredCourses}</p>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => {
                          setGradeFilter("all");
                          setStatusFilter("all");
                          setSearchQuery("");
                        }}
                      >
                        {t.resetFilter}
                      </button>
                    </Empty>
                  )}
                </section>
              )}

              {/* Section 2: Nhiệm vụ được giao (Assignments) */}
              {(activeTab === "all" || activeTab === "assignments") && (
                <section id="progress-completion" className="progress-section" aria-labelledby="progress-completion-title">
                  <div className="progress-section-header">
                    <span className="eyebrow">{t.assignedEyebrow}</span>
                    <h2 id="progress-completion-title">{t.assignments}</h2>
                  </div>
                  {assignments.length === 0 ? (
                    <Empty>
                      {t.noAssigned} <Link to="/">{t.home} →</Link>
                    </Empty>
                  ) : (
                    assignments.map((assignment) => (
                      <AssignmentProgress key={assignment.assignmentId} assignment={assignment} onOpen={open} />
                    ))
                  )}
                </section>
              )}
            </>
      ) : null}

            {/* Section 3: Nhật ký học tập (Attempt History) */}
            {(activeTab === "all" || activeTab === "history") && (
              <section id="progress-history" className="panel progress-section" aria-labelledby="progress-history-title">
                <div className="progress-section-header">
                  <span className="eyebrow">{t.historyEyebrow}</span>
                  <h2 id="progress-history-title">{t.history}</h2>
                </div>
                {activity.isPending ? (
                  <Empty>{t.loadingHistory}</Empty>
                ) : activity.isError && !items.length ? (
                  <>
                    <ErrorBox error={activity.error} />
                    <button className="secondary" type="button" onClick={() => activity.refetch()}>{t.retry}</button>
                  </>
                ) : items.length === 0 ? (
                  <Empty>{t.noAttempts}</Empty>
                ) : (
                  <>
                    <ActivityGroups items={items} onOpen={open} />
                    {activity.isFetchNextPageError && (
                      <>
                        <ErrorBox error={activity.error} />
                        <button className="secondary" type="button" onClick={() => activity.fetchNextPage()}>{t.retryNext}</button>
                      </>
                    )}
                    {activity.hasNextPage && !activity.isFetchNextPageError && (
                      <button className="secondary load-more" type="button" disabled={activity.isFetchingNextPage} onClick={() => activity.fetchNextPage()}>
                        {activity.isFetchingNextPage ? t.loadingShort : t.older}
                      </button>
                    )}
                  </>
                )}
              </section>
            )}

            {/* Course Detail Modal (Drilldown) */}
            {selectedCourse && (
              <CourseDetailModal
                course={selectedCourse}
                onClose={() => setSelectedCourse(null)}
              />
            )}

            {sheet.length > 0 && (
              <EvidenceSheet onClose={close} onBack={sheet.length > 1 ? () => setSheet((views) => views.slice(0, -1)) : undefined}>
                <SheetContent view={sheet.at(-1)!} push={(view) => setSheet((views) => [...views, view])} />
              </EvidenceSheet>
            )}
          </div>
          );
}
