import { lazy, Suspense, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Camera,
  Check,
  FlaskConical,
  Info,
  Trash2,
} from "lucide-react";
import { api, useAuth, type ActivityPage, type MyProgressResponse } from "../../lib/api";
import { PROFILE_KEY, uploadAvatar, useProfile, type Profile } from "../../lib/profile";
import { Avatar } from "../../components/Avatar";
import { PageHeading } from "../../components/PageHeading";
import { ErrorBox, Field, InlineLoader, useAction } from "../../components/ui";
import { setThemePreference, THEME_OPTIONS, useThemePreference, type ThemePreference } from "../../lib/theme";
import { defineText, formatDate, getLocale, LOCALE_OPTIONS, setLocale, type Locale } from "../../i18n";
import { commonText } from "../../i18n/common";

const TeacherAiUsageSettings = lazy(() => import("../ai-usage/TeacherAiUsageSettings"));

const text = defineText({
  vi: {
    title: "Hồ sơ và cài đặt",
    description: "Ảnh đại diện, thông tin tài khoản và bảo mật.",
    profile: "Hồ sơ",
    profileSubtitle: "Thông tin cá nhân và định danh tài khoản",
    loading: "Đang tải hồ sơ…",
    chooseAvatar: "Chọn ảnh đại diện",
    uploading: "Đang tải ảnh…",
    changeAvatar: "Đổi ảnh đại diện",
    uploadAvatar: "Tải ảnh đại diện",
    removeAvatar: "Gỡ ảnh",
    avatarHint: "PNG, JPEG hoặc WebP, tối đa 2 MB. Ảnh chỉ hiển thị cho người đã đăng nhập.",
    role: "Vai trò",
    username: "Tên đăng nhập",
    gradeLabel: "Khối lớp",
    grade: (grade: number) => `Lớp ${grade}`,
    joined: "Tham gia từ",
    displayName: "Tên hiển thị",
    saveName: "Lưu tên",
    nameSaved: "Đã lưu tên hiển thị.",
    nameLocked: "Họ tên của học sinh do giáo viên quản lý. Nếu sai, em hãy báo giáo viên.",
    appearance: "Giao diện",
    appearanceSubtitle: "Tùy chỉnh chế độ hiển thị và ngôn ngữ",
    colourMode: "Chế độ màu",
    themes: { system: "Theo hệ thống", light: "Sáng", dark: "Tối" },
    systemHint: "\"Theo hệ thống\" dùng chế độ sáng hoặc tối của thiết bị.",
    language: "Ngôn ngữ",
    changePassword: "Đổi mật khẩu",
    securitySubtitle: "Cập nhật mật khẩu để bảo mật tài khoản",
    currentPassword: "Mật khẩu hiện tại",
    newPassword: "Mật khẩu mới (ít nhất 12 ký tự)",
    passwordChanged: "Đã đổi mật khẩu và thu hồi các phiên làm mới cũ.",
    parentLink: "Liên kết phụ huynh",
    parentLinkSubtitle: "Kết nối tài khoản phụ huynh với tiến trình học",
    parentLinkBody: "Mã liên kết phụ huynh do giáo viên cấp sau khi xác minh người giám hộ. Em hãy nhờ giáo viên chủ nhiệm tạo mã và gửi trực tiếp cho phụ huynh; mã chỉ dùng được một lần.",
    learningSnapshot: "Tổng quan học tập",
    learningIntro: "Tiến độ cá nhân được ghi nhận từ các hoạt động học tập.",
    assignmentsCompleted: "Bài được giao hoàn thành",
    attempts: "Lượt thực hành",
    labsTried: "Lab đã thử gần đây",
    loadingLearning: "Đang tải tiến độ học…",
    learningUnavailable: "Chưa tải được dữ liệu học tập.",
    noLabAttempts: "Chưa có lượt thử lab được ghi nhận.",
    noAssignments: "Chưa có bài được giao.",
    viewProgress: "Xem tiến độ chi tiết",
    viewLabs: "Khám phá phòng lab",
    latestLabsNote: "Dựa trên tối đa 50 hoạt động gần nhất.",
    foundationProgress: "Chương trình nền tảng",
    foundationUnavailable: "Chương trình nền tảng chưa được cấu hình.",
    evidenceSteps: "bằng chứng hoàn thành",
  },
  en: {
    title: "Profile and settings",
    description: "Profile picture, account details and security.",
    profile: "Profile",
    profileSubtitle: "Personal details and account identity",
    loading: "Loading profile…",
    chooseAvatar: "Choose a profile picture",
    uploading: "Uploading…",
    changeAvatar: "Change profile picture",
    uploadAvatar: "Upload profile picture",
    removeAvatar: "Remove picture",
    avatarHint: "PNG, JPEG or WebP, up to 2 MB. Only signed-in users can see it.",
    role: "Role",
    username: "Username",
    gradeLabel: "Grade",
    grade: (grade: number) => `Grade ${grade}`,
    joined: "Member since",
    displayName: "Display name",
    saveName: "Save name",
    nameSaved: "Display name saved.",
    nameLocked: "Student names are managed by the teacher. If yours is wrong, tell your teacher.",
    appearance: "Appearance",
    appearanceSubtitle: "Customize appearance and display language",
    colourMode: "Colour mode",
    themes: { system: "Match system", light: "Light", dark: "Dark" },
    systemHint: "\"Match system\" follows the light or dark mode of your device.",
    language: "Language",
    changePassword: "Change password",
    securitySubtitle: "Update your password to keep your account secure",
    currentPassword: "Current password",
    newPassword: "New password (at least 12 characters)",
    passwordChanged: "Password changed and older sessions signed out.",
    parentLink: "Parent link",
    parentLinkSubtitle: "Connect a parent account to learning progress",
    parentLinkBody: "Parent link codes are issued by the teacher after checking the guardian. Ask your homeroom teacher to create one and give it directly to your parent; each code works once.",
    learningSnapshot: "Learning overview",
    learningIntro: "Personal progress recorded from your learning activity.",
    assignmentsCompleted: "Assigned work completed",
    attempts: "Practice attempts",
    labsTried: "Labs tried recently",
    loadingLearning: "Loading learning progress…",
    learningUnavailable: "Learning data could not be loaded.",
    noLabAttempts: "No lab attempts recorded yet.",
    noAssignments: "No assigned work yet.",
    viewProgress: "View detailed progress",
    viewLabs: "Explore labs",
    latestLabsNote: "Based on up to the 50 most recent activities.",
    foundationProgress: "Foundation curriculum",
    foundationUnavailable: "The foundation curriculum is not configured yet.",
    evidenceSteps: "completed evidence items",
  },
});


/** Profile settings (acc-2): private avatar, account details, display name for adults, password. */
export function SettingsPage() {
  const t = text();
  const user = useAuth((s) => s.user)!;
  const profile = useProfile();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [nameSaved, setNameSaved] = useState(false);
  const change = useAction((b: any) => api("/auth/password", "POST", b));
  const applyProfile = (next: Profile) => {
    queryClient.setQueryData(PROFILE_KEY, next);
    // Keep the signed-in user (sidebar name) in step with the profile.
    useAuth.setState((state) => (state.user ? { user: { ...state.user, fullName: next.fullName } } : state));
  };
  const upload = useMutation({ mutationFn: uploadAvatar, onSuccess: applyProfile });
  const remove = useMutation({ mutationFn: () => api<Profile>("/me/avatar", "DELETE"), onSuccess: applyProfile });
  const rename = useMutation({
    mutationFn: (fullName: string) => api<Profile>("/me/profile", "PATCH", { fullName }),
    onSuccess: (next) => {
      applyProfile(next);
      setNameSaved(true);
    },
  });
  const theme = useThemePreference();
  // Applied at once on this device; the profile copy follows the user to other devices.
  const saveTheme = useMutation({
    mutationFn: (next: ThemePreference) => api<{ preferences: Profile["preferences"] }>("/me/preferences", "PATCH", { theme: next }),
    onSuccess: ({ preferences }) => queryClient.setQueryData<Profile>(PROFILE_KEY, (old) => (old ? { ...old, preferences } : old)),
  });
  const [chosenLocale, setChosenLocale] = useState(getLocale());
  // Switching language reloads the page, so the profile copy is saved first and the switch follows.
  const saveLocale = useMutation({
    mutationFn: (next: Locale) => api<{ preferences: Profile["preferences"] }>("/me/preferences", "PATCH", { locale: next }),
    onSuccess: ({ preferences }) => queryClient.setQueryData<Profile>(PROFILE_KEY, (old) => (old ? { ...old, preferences } : old)),
    onSettled: (_, __, next) => setLocale(next),
  });
  const data = profile.data;

  return (
    <div className="settings-container">
      <PageHeading title={t.title} description={t.description} />
      <div className="settings-layout">
        <div className="settings-col-main">
          <section className="panel settings-card profile-card" aria-labelledby="profile-title">
            <div className="settings-card-header">
              <h2 id="profile-title">{t.profile}</h2>
              <p className="settings-subtitle">{t.profileSubtitle}</p>
            </div>
            {profile.isLoading && <InlineLoader message={t.loading} />}
            <ErrorBox error={profile.error} />
            {data && (
              <>
                <div className="profile-hero">
                  <div className="profile-avatar-wrap">
                    <Avatar name={data.fullName} url={data.avatarUrl} />
                    <button
                      type="button"
                      className="avatar-edit-overlay"
                      aria-label={data.avatarUrl ? t.changeAvatar : t.uploadAvatar}
                      title={data.avatarUrl ? t.changeAvatar : t.uploadAvatar}
                      disabled={upload.isPending}
                      onClick={() => fileInput.current?.click()}
                    >
                      <Camera size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="profile-hero-info">
                    <div className="profile-hero-name-row">
                      <strong className="profile-hero-name">{data.fullName}</strong>
                      <span className="role-badge-pill">{commonText().roles[data.role]}</span>
                    </div>
                    {data.username && <p className="profile-hero-handle">@{data.username}</p>}
                    <div className="button-row profile-avatar-actions">
                      <input
                        ref={fileInput}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        aria-label={t.chooseAvatar}
                        hidden
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) upload.mutate(file);
                          event.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        className="secondary settings-btn-compact"
                        disabled={upload.isPending}
                        onClick={() => fileInput.current?.click()}
                      >
                        <Camera size={14} aria-hidden="true" />
                        <span>{upload.isPending ? t.uploading : data.avatarUrl ? t.changeAvatar : t.uploadAvatar}</span>
                      </button>
                      {data.avatarUrl && (
                        <button
                          type="button"
                          className="danger-text settings-btn-compact"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate()}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          <span>{t.removeAvatar}</span>
                        </button>
                      )}
                    </div>
                    <p className="tiny muted profile-avatar-hint">{t.avatarHint}</p>
                  </div>
                </div>
                <ErrorBox error={upload.error || remove.error} />
                <dl className="profile-details apple-grouped-list">
                  <div className="apple-grouped-row">
                    <dt>{t.role}</dt>
                    <dd>{commonText().roles[data.role]}</dd>
                  </div>
                  {data.username && (
                    <div className="apple-grouped-row">
                      <dt>{t.username}</dt>
                      <dd>{data.username}</dd>
                    </div>
                  )}
                  {data.email && (
                    <div className="apple-grouped-row">
                      <dt>Email</dt>
                      <dd>{data.email}</dd>
                    </div>
                  )}
                  {data.role === "STUDENT" && (
                    <div className="apple-grouped-row">
                      <dt>{t.gradeLabel}</dt>
                      <dd>{t.grade(data.grade)}</dd>
                    </div>
                  )}
                  <div className="apple-grouped-row">
                    <dt>{t.joined}</dt>
                    <dd>{formatDate(data.createdAt)}</dd>
                  </div>
                </dl>
                {data.canEditName ? (
                  <form
                    className="profile-edit-name-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      setNameSaved(false);
                      rename.mutate(String(new FormData(event.currentTarget).get("fullName")));
                    }}
                  >
                    <Field label={t.displayName} name="fullName" defaultValue={data.fullName} required maxLength={120} />
                    <button className="primary" disabled={rename.isPending}>
                      {t.saveName}
                    </button>
                    <ErrorBox error={rename.error} />
                    {nameSaved && <p className="notice" role="status">{t.nameSaved}</p>}
                  </form>
                ) : (
                  <div className="settings-notice-box">
                    <Info size={16} aria-hidden="true" />
                    <p className="tiny muted">{t.nameLocked}</p>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="panel settings-card security-card" aria-labelledby="password-title">
            <div className="settings-card-header">
              <h2 id="password-title">{t.changePassword}</h2>
              <p className="settings-subtitle">{t.securitySubtitle}</p>
            </div>
            <form
              className="settings-password-form"
              onSubmit={(e) => {
                e.preventDefault();
                change.mutate(Object.fromEntries(new FormData(e.currentTarget)));
              }}
            >
              <Field label={t.currentPassword} name="currentPassword" type="password" autoComplete="current-password" required />
              <Field label={t.newPassword} name="password" type="password" autoComplete="new-password" minLength={12} required />
              <button className="primary" disabled={change.isPending}>
                {t.changePassword}
              </button>
              <ErrorBox error={change.error} />
              {change.isSuccess && <p className="notice">{t.passwordChanged}</p>}
            </form>
          </section>
        </div>

        <div className="settings-col-side">
          {user.role === "TEACHER" && (
            <Suspense fallback={null}>
              <TeacherAiUsageSettings />
            </Suspense>
          )}
          <section className="panel settings-card appearance-card" aria-labelledby="appearance-title">
            <div className="settings-card-header">
              <h2 id="appearance-title">{t.appearance}</h2>
              <p className="settings-subtitle">{t.appearanceSubtitle}</p>
            </div>
            <fieldset className="settings-fieldset theme-choice">
              <legend>{t.colourMode}</legend>
              <div className="apple-theme-grid">
                {THEME_OPTIONS.map((option) => (
                  <label key={option} className={`apple-theme-item ${theme === option ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="theme"
                      value={option}
                      checked={theme === option}
                      onChange={() => {
                        setThemePreference(option);
                        saveTheme.mutate(option);
                      }}
                    />
                    <div className="apple-window-frame" data-theme-preview={option}>
                      {option === "system" ? (
                        <div className="apple-preview-split">
                          <div className="apple-preview-half light">
                            <div className="apple-preview-dots">
                              <span />
                              <span />
                            </div>
                            <div className="apple-preview-content">
                              <div className="preview-bar" />
                              <div className="preview-line short" />
                            </div>
                          </div>
                          <div className="apple-preview-half dark">
                            <div className="apple-preview-dots">
                              <span />
                              <span />
                            </div>
                            <div className="apple-preview-content">
                              <div className="preview-bar" />
                              <div className="preview-line short" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={`apple-preview-window ${option}`}>
                          <div className="apple-preview-dots">
                            <span />
                            <span />
                            <span />
                          </div>
                          <div className="apple-preview-content">
                            <div className="preview-bar" />
                            <div className="preview-line short" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="apple-theme-meta">
                      <span className="apple-radio-dot" aria-hidden="true" />
                      <span className="apple-theme-label">{t.themes[option]}</span>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="tiny muted settings-theme-hint">{t.systemHint}</p>
            <ErrorBox error={saveTheme.error} />
            <fieldset className="settings-fieldset language-choice">
              <legend>{t.language}</legend>
              <div className="apple-grouped-list apple-language-list">
                {LOCALE_OPTIONS.map((option) => (
                  <label key={option.value} lang={option.value} className={`apple-language-row ${chosenLocale === option.value ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="locale"
                      value={option.value}
                      checked={chosenLocale === option.value}
                      disabled={saveLocale.isPending}
                      onChange={() => {
                        setChosenLocale(option.value);
                        saveLocale.mutate(option.value);
                      }}
                    />
                    <span className="apple-language-label">{option.label}</span>
                    {chosenLocale === option.value && <Check size={16} className="apple-language-check" aria-hidden="true" />}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          {user.role === "STUDENT" && <LearningSnapshot />}

          {user.role === "STUDENT" && (
            <section className="panel settings-card parent-link-card" aria-labelledby="parent-link-title">
              <div className="settings-card-header">
                <h3 id="parent-link-title">{t.parentLink}</h3>
                <p className="settings-subtitle">{t.parentLinkSubtitle}</p>
              </div>
              <p className="parent-link-body-text">
                {t.parentLinkBody}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function LearningSnapshot() {
  const t = text();
  const progress = useQuery<MyProgressResponse>({ queryKey: ["me-progress"], queryFn: () => api("/me/progress") });
  const foundation = useQuery<{ courses: Array<{ id: string; subject: { name: string }; summary: { completedEvidenceItems: number; totalEvidenceItems: number; percent: number | null } }> }>({
    queryKey: ["me-foundational-progress"],
    queryFn: () => api("/me/foundational-progress"),
  });
  const activity = useQuery<ActivityPage>({
    queryKey: ["me-activity", "settings"],
    queryFn: () => api("/me/activity?limit=50"),
  });
  const labs = [...new Set((activity.data?.items ?? []).filter((item) => item.kind === "PRACTICAL" && item.labTitle).map((item) => item.labTitle!))];
  const summary = progress.data?.summary;
  const foundationCourses = foundation.data?.courses ?? [];
  const foundationDone = foundationCourses.reduce((sum, course) => sum + course.summary.completedEvidenceItems, 0);
  const foundationTotal = foundationCourses.reduce((sum, course) => sum + course.summary.totalEvidenceItems, 0);

  return (
    <section className="panel settings-card learning-snapshot" aria-labelledby="learning-snapshot-title">
      <div className="settings-card-header">
        <h2 id="learning-snapshot-title">{t.learningSnapshot}</h2>
        <p className="settings-subtitle">{t.learningIntro}</p>
      </div>
      {(progress.isPending || activity.isPending) && <p className="tiny muted" role="status">{t.loadingLearning}</p>}
      {(progress.isError || activity.isError) && <p className="tiny muted" role="status">{t.learningUnavailable}</p>}
      {summary && (
        <div className="learning-metrics">
          <div className="learning-metric"><strong>{summary.activeAssignments ? `${summary.completedAssignments}/${summary.activeAssignments}` : "0"}</strong><span>{t.assignmentsCompleted}</span></div>
          <div className="learning-metric"><strong>{summary.practicalAttempts}</strong><span>{t.attempts}</span></div>
          <div className="learning-metric"><strong>{labs.length}</strong><span>{t.labsTried}</span></div>
        </div>
      )}
      {activity.isSuccess && (labs.length ? (
        <ul className="settings-lab-list" aria-label={t.labsTried}>
          {labs.slice(0, 3).map((lab) => <li key={lab}><FlaskConical aria-hidden="true" /><span>{lab}</span></li>)}
        </ul>
      ) : <p className="tiny muted">{t.noLabAttempts}</p>)}
      {progress.isSuccess && summary?.activeAssignments === 0 && <p className="tiny muted">{t.noAssignments}</p>}
      <div className="settings-foundation" aria-labelledby="settings-foundation-title">
        <h3 id="settings-foundation-title">{t.foundationProgress}</h3>
        {foundation.isPending ? <p className="tiny muted" role="status">{t.loadingLearning}</p> : foundation.isError ? <p className="tiny muted">{t.learningUnavailable}</p> : foundationCourses.length ? (
          <>
            <p className="tiny muted">{foundationDone}/{foundationTotal} {t.evidenceSteps}</p>
            {foundationCourses.slice(0, 2).map((course) => (
              <div className="settings-foundation-course" key={course.id}>
                <div><span>{course.subject.name}</span><strong>{course.summary.percent ?? 0}%</strong></div>
                <div className="settings-foundation-track" role="progressbar" aria-label={course.subject.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={course.summary.percent ?? 0}><i style={{ width: `${course.summary.percent ?? 0}%` }} /></div>
              </div>
            ))}
          </>
        ) : <p className="tiny muted">{t.foundationUnavailable}</p>}
      </div>
      <p className="tiny muted settings-snapshot-note">{t.latestLabsNote}</p>
      <div className="settings-snapshot-actions">
        <Link to="/progress">{t.viewProgress}<ArrowRight aria-hidden="true" /></Link>
        <Link to="/labs">{t.viewLabs}<ArrowRight aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
