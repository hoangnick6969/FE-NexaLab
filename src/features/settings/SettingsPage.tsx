import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, useAuth } from "../../lib/api";
import { PROFILE_KEY, uploadAvatar, useProfile, type Profile } from "../../lib/profile";
import { Avatar } from "../../components/Avatar";
import { PageHeading } from "../../components/PageHeading";
import { ErrorBox, Field, InlineLoader, useAction } from "../../components/ui";

const roleLabel: Record<Profile["role"], string> = { STUDENT: "Học sinh", TEACHER: "Giáo viên", PARENT: "Phụ huynh", ADMIN: "Quản trị viên" };

/** Profile settings (acc-2): private avatar, account details, display name for adults, password. */
export function SettingsPage() {
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
  const data = profile.data;

  return (
    <>
      <PageHeading title="Hồ sơ và cài đặt" description="Ảnh đại diện, thông tin tài khoản và bảo mật." />
      <section className="panel narrow" aria-labelledby="profile-title">
        <h2 id="profile-title">Hồ sơ</h2>
        {profile.isLoading && <InlineLoader message="Đang tải hồ sơ…" />}
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
                  aria-label="Chọn ảnh đại diện"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) upload.mutate(file);
                    event.target.value = "";
                  }}
                />
                <button type="button" className="secondary" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
                  {upload.isPending ? "Đang tải ảnh…" : data.avatarUrl ? "Đổi ảnh đại diện" : "Tải ảnh đại diện"}
                </button>
                {data.avatarUrl && (
                  <button type="button" className="danger-text" disabled={remove.isPending} onClick={() => remove.mutate()}>
                    Gỡ ảnh
                  </button>
                )}
              </div>
              <p className="tiny muted">PNG, JPEG hoặc WebP, tối đa 2 MB. Ảnh chỉ hiển thị cho người đã đăng nhập.</p>
            </div>
            <ErrorBox error={upload.error || remove.error} />
            <dl className="profile-details">
              <dt>Vai trò</dt>
              <dd>{roleLabel[data.role]}</dd>
              {data.username && (
                <>
                  <dt>Tên đăng nhập</dt>
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
                  <dt>Khối lớp</dt>
                  <dd>Lớp {data.grade}</dd>
                </>
              )}
              <dt>Tham gia từ</dt>
              <dd>{new Date(data.createdAt).toLocaleDateString("vi-VN")}</dd>
            </dl>
            {data.canEditName ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setNameSaved(false);
                  rename.mutate(String(new FormData(event.currentTarget).get("fullName")));
                }}
              >
                <Field label="Tên hiển thị" name="fullName" defaultValue={data.fullName} required maxLength={120} />
                <button className="primary" disabled={rename.isPending}>
                  Lưu tên
                </button>
                <ErrorBox error={rename.error} />
                {nameSaved && <p className="notice" role="status">Đã lưu tên hiển thị.</p>}
              </form>
            ) : (
              <p className="tiny muted">Họ tên của học sinh do giáo viên quản lý. Nếu sai, em hãy báo giáo viên.</p>
            )}
          </>
        )}
      </section>
      <section className="panel narrow" aria-labelledby="password-title">
        <h2 id="password-title">Đổi mật khẩu</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            change.mutate(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <Field label="Mật khẩu hiện tại" name="currentPassword" type="password" autoComplete="current-password" required />
          <Field label="Mật khẩu mới (ít nhất 12 ký tự)" name="password" type="password" autoComplete="new-password" minLength={12} required />
          <button className="primary" disabled={change.isPending}>
            Đổi mật khẩu
          </button>
          <ErrorBox error={change.error} />
          {change.isSuccess && <p className="notice">Đã đổi mật khẩu và thu hồi các phiên làm mới cũ.</p>}
        </form>
      </section>
      {user.role === "STUDENT" && (
        <section className="panel narrow" aria-labelledby="parent-link-title">
          <h3 id="parent-link-title">Liên kết phụ huynh</h3>
          <p>
            Mã liên kết phụ huynh do giáo viên cấp sau khi xác minh người giám hộ. Em hãy nhờ giáo viên chủ nhiệm tạo mã và gửi trực tiếp cho phụ huynh; mã chỉ dùng
            được một lần.
          </p>
        </section>
      )}
    </>
  );
}
