import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, useAuth } from "../../lib/api";
import { PROFILE_KEY, uploadAvatar, useProfile, type Profile } from "../../lib/profile";
import { Avatar } from "../../components/Avatar";
import { PageHeading } from "../../components/PageHeading";
import { ErrorBox, Field, InlineLoader, useAction } from "../../components/ui";
import { setThemePreference, THEME_OPTIONS, useThemePreference, type ThemePreference } from "../../lib/theme";
import { defineText, formatDate, getLocale, LOCALE_OPTIONS, setLocale, type Locale } from "../../i18n";
import { commonText } from "../../i18n/common";

const text = defineText({
  vi: {
    title: "Hồ sơ và cài đặt",
    description: "Ảnh đại diện, thông tin tài khoản và bảo mật.",
    profile: "Hồ sơ",
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
    colourMode: "Chế độ màu",
    themes: { system: "Theo hệ thống", light: "Sáng", dark: "Tối" },
    systemHint: "\"Theo hệ thống\" dùng chế độ sáng hoặc tối của thiết bị.",
    language: "Ngôn ngữ",
    changePassword: "Đổi mật khẩu",
    currentPassword: "Mật khẩu hiện tại",
    newPassword: "Mật khẩu mới (ít nhất 12 ký tự)",
    passwordChanged: "Đã đổi mật khẩu và thu hồi các phiên làm mới cũ.",
    parentLink: "Liên kết phụ huynh",
    parentLinkBody: "Mã liên kết phụ huynh do giáo viên cấp sau khi xác minh người giám hộ. Em hãy nhờ giáo viên chủ nhiệm tạo mã và gửi trực tiếp cho phụ huynh; mã chỉ dùng được một lần.",
  },
  en: {
    title: "Profile and settings",
    description: "Profile picture, account details and security.",
    profile: "Profile",
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
    colourMode: "Colour mode",
    themes: { system: "Match system", light: "Light", dark: "Dark" },
    systemHint: "\"Match system\" follows the light or dark mode of your device.",
    language: "Language",
    changePassword: "Change password",
    currentPassword: "Current password",
    newPassword: "New password (at least 12 characters)",
    passwordChanged: "Password changed and older sessions signed out.",
    parentLink: "Parent link",
    parentLinkBody: "Parent link codes are issued by the teacher after checking the guardian. Ask your homeroom teacher to create one and give it directly to your parent; each code works once.",
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
  // Switching language remounts the app, so the profile copy is saved first and the switch follows.
  const saveLocale = useMutation({
    mutationFn: (next: Locale) => api<{ preferences: Profile["preferences"] }>("/me/preferences", "PATCH", { locale: next }),
    onSuccess: ({ preferences }) => queryClient.setQueryData<Profile>(PROFILE_KEY, (old) => (old ? { ...old, preferences } : old)),
    onSettled: (_, __, next) => setLocale(next),
  });
  const data = profile.data;

  return (
    <>
      <PageHeading title={t.title} description={t.description} />
      <section className="panel narrow" aria-labelledby="profile-title">
        <h2 id="profile-title">{t.profile}</h2>
        {profile.isLoading && <InlineLoader message={t.loading} />}
        <ErrorBox error={profile.error} />
        {data && (
          <>
            <div className="profile-avatar">
              <Avatar name={data.fullName} url={data.avatarUrl} />
              <div className="button-row">
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
                <button type="button" className="secondary" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
                  {upload.isPending ? t.uploading : data.avatarUrl ? t.changeAvatar : t.uploadAvatar}
                </button>
                {data.avatarUrl && (
                  <button type="button" className="danger-text" disabled={remove.isPending} onClick={() => remove.mutate()}>
                    {t.removeAvatar}
                  </button>
                )}
              </div>
              <p className="tiny muted">{t.avatarHint}</p>
            </div>
            <ErrorBox error={upload.error || remove.error} />
            <dl className="profile-details">
              <dt>{t.role}</dt>
              <dd>{commonText().roles[data.role]}</dd>
              {data.username && (
                <>
                  <dt>{t.username}</dt>
                  <dd>{data.username}</dd>
                </>
              )}
              {data.email && (
                <>
                  <dt>Email</dt>
                  <dd>{data.email}</dd>
                </>
              )}
              {data.role === "STUDENT" && (
                <>
                  <dt>{t.gradeLabel}</dt>
                  <dd>{t.grade(data.grade)}</dd>
                </>
              )}
              <dt>{t.joined}</dt>
              <dd>{formatDate(data.createdAt)}</dd>
            </dl>
            {data.canEditName ? (
              <form
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
              <p className="tiny muted">{t.nameLocked}</p>
            )}
          </>
        )}
      </section>
      <section className="panel narrow" aria-labelledby="appearance-title">
        <h2 id="appearance-title">{t.appearance}</h2>
        <fieldset className="theme-choice">
          <legend>{t.colourMode}</legend>
          {THEME_OPTIONS.map((option) => (
            <label key={option}>
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
              {t.themes[option]}
            </label>
          ))}
        </fieldset>
        <p className="tiny muted">{t.systemHint}</p>
        <ErrorBox error={saveTheme.error} />
        <fieldset className="theme-choice">
          <legend>{t.language}</legend>
          {LOCALE_OPTIONS.map((option) => (
            <label key={option.value} lang={option.value}>
              <input type="radio" name="locale" value={option.value} checked={chosenLocale === option.value} disabled={saveLocale.isPending} onChange={() => {
                  setChosenLocale(option.value);
                  saveLocale.mutate(option.value);
                }} />
              {option.label}
            </label>
          ))}
        </fieldset>
      </section>
      <section className="panel narrow" aria-labelledby="password-title">
        <h2 id="password-title">{t.changePassword}</h2>
        <form
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
      {user.role === "STUDENT" && (
        <section className="panel narrow" aria-labelledby="parent-link-title">
          <h3 id="parent-link-title">{t.parentLink}</h3>
          <p>
            {t.parentLinkBody}
          </p>
        </section>
      )}
    </>
  );
}
