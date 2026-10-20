import { useQuery } from "@tanstack/react-query";
import { api, useAuth } from "./api";
import type { ThemePreference } from "./theme";
import type { Locale } from "../i18n";
import { defineText } from "../i18n";

const text = defineText({
  vi: { avatarType: "Chỉ nhận ảnh PNG, JPEG hoặc WebP", avatarSize: "Ảnh đại diện tối đa 2 MB", uploadFailed: "Chưa tải được ảnh lên, hãy thử lại" },
  en: { avatarType: "Only PNG, JPEG or WebP images are accepted", avatarSize: "Profile pictures can be at most 2 MB", uploadFailed: "The picture could not be uploaded; please try again" },
});

export type Profile = {
  id: string;
  username: string | null;
  email: string | null;
  fullName: string;
  role: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";
  grade: number;
  emailVerifiedAt: string | null;
  createdAt: string;
  avatarUpdatedAt: string | null;
  avatarUrl: string | null;
  canEditName: boolean;
  preferences: { theme: ThemePreference; locale: Locale | null };
};

export const PROFILE_KEY = ["me-profile"] as const;

/** Own profile (acc-2). The avatar URL is presigned and short-lived, so it is refetched before it expires. */
export function useProfile() {
  const signedIn = useAuth((state) => Boolean(state.user));
  return useQuery<Profile>({ queryKey: PROFILE_KEY, queryFn: () => api("/me/profile"), enabled: signedIn, staleTime: 4 * 60_000, refetchInterval: 4 * 60_000 });
}

export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** Presigned upload straight to object storage, then server confirmation of size and type. */
export async function uploadAvatar(file: File) {
  if (!AVATAR_TYPES.includes(file.type)) throw new Error(text().avatarType);
  if (file.size > AVATAR_MAX_BYTES) throw new Error(text().avatarSize);
  const slot = await api<{ key: string; url: string; headers: Record<string, string> }>("/me/avatar/upload-url", "POST", { contentType: file.type, bytes: file.size });
  const put = await fetch(slot.url, { method: "PUT", headers: slot.headers, body: file });
  if (!put.ok) throw new Error(text().uploadFailed);
  return api<Profile>("/me/avatar", "POST", { key: slot.key });
}
