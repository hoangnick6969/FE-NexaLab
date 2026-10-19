import { useQuery } from "@tanstack/react-query";
import { FlaskConical, BookOpen, ArrowUpRight, ArrowRight, Check, Lock, ClipboardList, Clock3 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { api, type StudentPathway, type User } from "../../lib/api";
import { Badge, Empty, ErrorBox, verdictLabel, InlineLoader } from "../../components/ui";
import { LabCards } from "../labs/LabLibrary";
import { labInfo } from "../labs/lab-info";

export function StudentDashboard({
  user,
  stats,
  assignments,
}: {
  user: User;
  stats: any;
  assignments: any;
}) {
  const reduceMotion = useReducedMotion();
  const assignment = assignments.data?.[0];
  const assignmentDetail = useQuery<any>({
    queryKey: ["assignment", assignment?.id],
    queryFn: () => api("/assignments/" + assignment.id),
    enabled: Boolean(assignment?.id),
  });
  const lessonId = assignmentDetail.data?.contentType === "lesson"
    ? assignmentDetail.data.content.id
    : null;
  const pathwayQuery = useQuery<StudentPathway>({
    queryKey: ["lesson-pathway", lessonId],
    queryFn: () => api("/lessons/" + lessonId + "/pathway"),
    enabled: Boolean(lessonId),
  });
  const progress = stats.data?.progress ?? [];
  const attempts = stats.data?.attempts ?? [];
  const pathway = pathwayQuery.data;
  const nextStep = pathway?.steps.find((step) => step.id === pathway.nextStepId);
  const stepNames: Record<string, string> = {
    READING: "Đọc nội dung",
    VIDEO: "Xem video",
    STUDY_CARDS: "Ôn thẻ ghi nhớ",
    QUIZ: "Làm bài kiểm tra nhỏ",
    LAB: "Bắt đầu thực hành",
    CHALLENGE: "Mở thử thách",
  };
  const continueNames: Record<string, string> = {
    READING: "Bắt đầu đọc bài",
    VIDEO: "Xem nội dung video",
    STUDY_CARDS: "Bắt đầu ôn thẻ",
    QUIZ: "Làm bài kiểm tra nhỏ",
    LAB: "Bắt đầu thực hành",
    CHALLENGE: "Bắt đầu thử thách",
  };
  const subjectName = pathway?.lesson.subject.name;
  const subjectTone = subjectName?.includes("Vật lý")
    ? "physics"
    : subjectName?.includes("Hóa học")
      ? "chemistry"
      : subjectName?.includes("Sinh học")
        ? "biology"
        : "neutral";
  const recentAttempts = attempts.slice(0, 4);
  const lessonCount = progress.filter((item: any) => item.status === "completed").length;
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7);
  const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return { date, label: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][index], count: 0 };
  });
  const addActivityDate = (value: string) => {
    const date = new Date(value);
    const day = Math.floor((date.setHours(0, 0, 0, 0) - weekStart.getTime()) / 86400000);
    if (!Number.isNaN(day) && day >= 0 && day < weeklyActivity.length) weeklyActivity[day].count += 1;
  };
  progress.forEach((item: any) => item.updatedAt && addActivityDate(item.updatedAt));
  attempts.forEach((attempt: any) => attempt.createdAt && addActivityDate(attempt.createdAt));
  const activeDays = weeklyActivity.filter((day) => day.count > 0).length;
  const maxActivity = Math.max(1, ...weeklyActivity.map((day) => day.count));

  return (
    <div className="student-dashboard">
      <header className="student-dashboard-heading">
        <div>
          <p className="eyebrow">KHÔNG GIAN HỌC TẬP · LỚP {user.grade}</p>
          <h1>Chào {user.fullName.split(" ").at(-1)}</h1>
          <p className="student-heading-copy">Bài học, bài tập và những lần em tự thử.</p>
        </div>
        <Badge tone="outline">KHOA HỌC TỰ NHIÊN</Badge>
      </header>

      <section className="student-stats" aria-label="Tóm tắt hoạt động học tập">
        <StudentStat
          label="Bài học hoàn thành"
          value={stats.isLoading || stats.error || !progress.length ? "—" : lessonCount}
          detail={stats.isLoading ? "Đang tải tiến độ" : stats.error ? "Chưa tải được dữ liệu" : progress.length ? lessonCount ? "Xem tiến độ của em" : "Chưa hoàn thành bài nào" : "Chưa có dữ liệu học"}
          icon={<BookOpen />}
          to="/progress"
          reduceMotion={reduceMotion}
          index={0}
        />
        <StudentStat
          label="Bài tập"
          value={assignments.isLoading || assignments.error || !assignments.data?.length ? "—" : assignments.data.length}
          detail={assignments.isLoading ? "Đang tải bài giao" : assignments.error ? "Chưa tải được dữ liệu" : assignments.data?.length ? "Sắp đến hạn trước" : "Chưa có bài được giao"}
          icon={<ClipboardList />}
          to="/assignments"
          reduceMotion={reduceMotion}
          index={1}
        />
        <StudentStat
          label="Lượt thử mô phỏng"
          value={stats.isLoading || stats.error || !attempts.length ? "—" : attempts.length}
          detail={stats.isLoading ? "Đang tải lịch sử" : stats.error ? "Chưa tải được dữ liệu" : attempts.length ? "Xem lịch sử thực hành" : "Chưa có lần thử nào"}
          icon={<FlaskConical />}
          to="/progress"
          reduceMotion={reduceMotion}
          index={2}
        />
      </section>

      {(stats.error || assignments.error) && (
        <div className="student-dashboard-error" role="alert">
          <ErrorBox error={stats.error || assignments.error} />
        </div>
      )}

      <div className="student-dashboard-columns">
        <div className="student-dashboard-main">
          <section className={`student-continue-card subject-${subjectTone}`}>
            <div className="student-continue-copy">
              <span className="student-card-kicker">
                {assignment ? subjectName || "BÀI HỌC & BÀI TẬP" : "BẮT ĐẦU TỪ KIẾN THỨC NỀN"}
              </span>
              <h2>
                {assignment
                  ? pathway?.lesson.title || assignmentDetail.data?.content?.title || assignment.title
                  : assignments.isLoading
                    ? "Đang tìm bài học tiếp theo"
                    : "Bài học tiếp theo của em"}
              </h2>
              <p>
                {assignment
                  ? pathway?.lesson.learningObjective || assignmentDetail.data?.content?.learningObjective || assignment.classroom.name
                  : assignments.isLoading
                    ? "Đang kiểm tra bài tập của em."
                    : "Đọc, xem nội dung và làm bài kiểm tra nhỏ trước khi mở phần thực hành."}
              </p>
              {pathway && nextStep && (
                <p className="student-step-position">
                  Bước {pathway.steps.findIndex((step) => step.id === nextStep.id) + 1}/{pathway.steps.length}
                  {" · "}{stepNames[nextStep.type]}
                </p>
              )}
              {pathway && !nextStep && <p className="student-step-position">Em đã xem hết các bước trong bài này.</p>}
              <Link
                className="student-continue-action"
                to={assignment ? (nextStep && ["READING", "VIDEO", "STUDY_CARDS"].includes(nextStep.type) && lessonId ? `/lessons/${lessonId}` : "/assignments/" + assignment.id) : "/lessons"}
              >
                {assignment
                  ? nextStep
                    ? ["READING", "VIDEO", "STUDY_CARDS"].includes(nextStep.type) ? `Bài học · ${continueNames[nextStep.type]}` : `Bài tập · ${continueNames[nextStep.type]}`
                    : pathway
                      ? "Xem lại lộ trình bài học"
                      : "Mở bài tập"
                  : "Chọn bài học để bắt đầu"}
                <ArrowRight size={18} />
              </Link>
              {assignmentDetail.error && <ErrorBox error={assignmentDetail.error} />}
              {pathwayQuery.error && <ErrorBox error={pathwayQuery.error} />}
            </div>
            {assignment && (
              <div className="student-continue-art" aria-hidden="true">
                <svg viewBox="0 0 240 210" fill="none">
                  <ellipse cx="120" cy="105" rx="96" ry="34" transform="rotate(-28 120 105)" />
                  <ellipse cx="120" cy="105" rx="96" ry="34" transform="rotate(34 120 105)" />
                  <ellipse cx="120" cy="105" rx="96" ry="34" transform="rotate(90 120 105)" />
                  <circle cx="120" cy="105" r="22" className="illustration-core" />
                  <circle cx="43" cy="128" r="6" className="illustration-dot" />
                  <circle cx="166" cy="29" r="5" className="illustration-dot" />
                  <circle cx="195" cy="157" r="7" className="illustration-dot" />
                </svg>
              </div>
            )}
          </section>

          {pathway && (
            <section className="student-pathway-card" aria-label="Lộ trình học tập và bài tập">
              <div className="student-pathway-heading">
                <div><span className="eyebrow">BÀI HỌC & BÀI TẬP</span><h3>{pathway.lesson.title}</h3></div>
                <span>{pathway.steps.filter((step) => step.state === "COMPLETED").length}/{pathway.steps.length} bước</span>
              </div>
              {([["Bài học", ["READING", "VIDEO", "STUDY_CARDS"]], ["Bài tập", ["QUIZ", "LAB", "CHALLENGE"]]] as const).map(([groupName, types]) => <div className="student-pathway-group" key={groupName}>
              <h4>{groupName}</h4>
              <ol className="student-pathway-steps">
                {pathway.steps.filter((step) => (types as readonly string[]).includes(step.type)).map((step) => {
                  const isLocked = step.state === "LOCKED";
                  return (
                    <li key={step.id} className={`student-pathway-step ${step.state.toLowerCase()}`}>
                      {isLocked ? (
                        <button disabled title={step.lockReasonCode === "QUIZ_NOT_PASSED" ? "Hoàn thành bài kiểm tra để mở khóa." : "Hoàn thành bước trước để mở khóa."}>
                          <Lock size={15} strokeWidth={1.75} /><span>{stepNames[step.type]}</span>
                        </button>
                      ) : (
                        <Link to={lessonId && ["READING", "VIDEO", "STUDY_CARDS"].includes(step.type) ? `/lessons/${lessonId}` : `/assignments/${assignment.id}#step-${step.id}`}>
                          {step.state === "COMPLETED" ? <Check size={15} strokeWidth={2} /> : <Clock3 size={15} strokeWidth={1.75} />}
                          <span>{stepNames[step.type]}</span>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
              </div>)}
            </section>
          )}

          <section className="student-weekly-card" aria-labelledby="student-weekly-title">
            <div className="student-section-heading">
              <div><p className="eyebrow">HOẠT ĐỘNG CỦA EM</p><h2 id="student-weekly-title">Tuần này</h2></div>
              <span className="student-weekly-summary">
                {stats.isLoading ? "Đang tải…" : activeDays ? `${activeDays} ngày có hoạt động` : "Chưa có hoạt động tuần này"}
              </span>
            </div>
            {stats.isLoading ? (
              <InlineLoader message="Đang tải dữ liệu hoạt động…" size="sm" />
            ) : stats.error ? (
              <Empty>Chưa thể tải hoạt động tuần này.</Empty>
            ) : activeDays ? (
              <div className="student-weekly-chart" role="img" aria-label={`Hoạt động từ thứ Hai đến Chủ nhật: ${weeklyActivity.map((day) => `${day.label} ${day.count} lượt`).join(", ")}`}>
                {weeklyActivity.map((day) => (
                  <div className="student-weekly-day" key={day.label} title={`${day.date.toLocaleDateString("vi-VN")}: ${day.count} lượt ghi nhận`}>
                    <span className="student-weekly-count">{day.count || ""}</span>
                    <span className="student-weekly-track"><i style={{ height: day.count ? `${Math.max(12, (day.count / maxActivity) * 100)}%` : "4px" }} /></span>
                    <span className="student-weekly-label">{day.label}</span>
                  </div>
                ))}
              </div>
            ) : <div className="student-weekly-empty">Chưa có hoạt động tuần này.</div>}
          </section>

          <section className="student-related-work">
            <div className="student-section-heading">
              <div><p className="eyebrow">SAU KHI ĐÃ HỌC</p><h2>Mô phỏng và thực hành</h2></div>
            <Link to="/assignments">Xem bài tập <ArrowRight size={15} /></Link>
            </div>
            <p className="student-related-intro">Mỗi mô phỏng gắn với kiến thức em vừa học. Hoàn thành các bước nền tảng để mở phần thực hành phù hợp.</p>
            <LabCards guided />
          </section>
        </div>

        <aside className="student-dashboard-aside">
          <section id="student-exercises" className="student-side-card" aria-labelledby="student-assignments-title">
            <div className="student-section-heading">
              <div><p className="eyebrow">THEO HẠN HOÀN THÀNH</p><h2 id="student-assignments-title">Bài tập</h2></div>
              <span className="student-side-count">{assignments.data?.length || "—"}</span>
            </div>
            {assignments.isLoading ? <InlineLoader message="Đang nạp bài được giao…" size="sm" /> : assignments.error ? (
              <div role="alert"><ErrorBox error={assignments.error} /><button onClick={() => assignments.refetch()}>Thử lại</button></div>
            ) : assignments.data?.length ? (
              <div className="student-list">
                {assignments.data.map((item: any) =>
                  item.canOpen === false ? (
                    <div key={item.id} className="student-assignment-row" aria-disabled="true">
                      <span className="student-list-icon"><BookOpen size={17} /></span>
                      <span className="student-assignment-copy"><b>{item.title}</b><small>{item.classroom.name} · {item.notice}</small></span>
                    </div>
                  ) : (
                    <Link key={item.id} className="student-assignment-row" to={`/assignments/${item.id}`}>
                      <span className="student-list-icon"><BookOpen size={17} /></span>
                      <span className="student-assignment-copy"><b>{item.title}</b><small>{item.classroom.name} · {item.dueDate ? "Hạn " + new Date(item.dueDate).toLocaleDateString("vi-VN") : "Không có hạn nộp"}</small>{item.overdue && <small className="student-overdue">Đã quá hạn · vẫn có thể học</small>}{item.notice && <small>{item.notice}</small>}</span>
                      <ArrowUpRight size={17} />
                    </Link>
                  ),
                )}
              </div>
            ) : (
              <div className="student-empty"><ClipboardList size={22} /><p>Chưa có bài tập được giao.</p><Link to="/assignments">Mở danh sách bài tập</Link></div>
            )}
          </section>

          <section className="student-side-card" aria-labelledby="student-attempts-title">
            <div className="student-section-heading">
              <div><p className="eyebrow">NHỮNG LẦN EM ĐÃ THỬ</p><h2 id="student-attempts-title">Gần đây</h2></div>
              <Link to="/progress" aria-label="Xem toàn bộ lịch sử thực hành"><ArrowRight size={17} /></Link>
            </div>
            {stats.isLoading ? <InlineLoader message="Đang nạp lịch sử thực hành…" size="sm" /> : stats.error ? (
              <div role="alert"><ErrorBox error={stats.error} /><button onClick={() => stats.refetch()}>Thử lại</button></div>
            ) : recentAttempts.length ? (
              <div className="student-list">
                {recentAttempts.map((attempt: any) => {
                  const lab = labInfo.find((item) => item.id === attempt.challengeId);
                  return (
                    <Link className="student-attempt-row" key={attempt.id} to="/progress">
                      <span><FlaskConical size={18} /></span>
                      <span className="student-attempt-copy"><b>{lab?.title || "Lượt thực hành"}</b><small>{new Date(attempt.createdAt).toLocaleDateString("vi-VN")}</small></span>
                      <Badge tone={attempt.verdict}>{verdictLabel(attempt.verdict)}</Badge>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="student-empty"><FlaskConical size={22} /><p>Chưa có lần thử nào được ghi lại.</p></div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function StudentStat({
  label,
  value,
  detail,
  icon,
  to,
  reduceMotion,
  index,
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: React.ReactNode;
  to: string;
  reduceMotion: boolean | null;
  index: number;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.35, delay: reduceMotion ? 0 : index * 0.06 }}
    >
      <Link className="student-stat" to={to}>
        <span className="student-stat-icon">{icon}</span>
        <span className="student-stat-content"><span>{label}</span><strong>{value}</strong><small>{detail}</small></span>
        <ArrowRight className="student-stat-arrow" size={17} />
      </Link>
    </motion.div>
  );
}
