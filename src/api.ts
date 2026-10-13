import { create } from "zustand";
export type User = {
  id: string;
  username?: string | null;
  email?: string | null;
  fullName: string;
  role: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";
  grade: number;
  mustChangePassword?: boolean;
};
export const useAuth = create<{
  user: User | null;
  token: string | null;
  set: (user: User | null, token: string | null) => void;
}>((set) => ({
  user: null,
  token: null,
  set: (user, token) => set({ user, token }),
}));
const base = import.meta.env.VITE_API_URL ?? "/api";
let refreshPromise: Promise<boolean> | null = null;
export async function restore() {
  if (!refreshPromise)
    refreshPromise = (async () => {
      try {
        const r = await fetch(base + "/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (!r.ok) return false;
        const data = await r.json();
        useAuth.getState().set(data.user, data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  return refreshPromise;
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
  retry = true,
): Promise<T> {
  const token = useAuth.getState().token;
  const safeRead = method === "GET";
  let r: Response;
  try {
    r = await fetch(base + path, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (safeRead && retry) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return api(path, method, body, false);
    }
    throw error;
  }
  if (r.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await restore()) return api(path, method, body, false);
    useAuth.getState().set(null, null);
  }
  if (safeRead && retry && [502, 503, 504].includes(r.status)) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return api(path, method, body, false);
  }
  const data = await r.json();
  if (!r.ok) throw new Error(data.message ?? "Không thể kết nối máy chủ");
  return data;
}

export async function uploadFile(file: File) {
  const data = new FormData();
  data.append("file", file);
  const r = await fetch(base + "/files", {
    method: "POST",
    credentials: "include",
    headers: { Authorization: "Bearer " + useAuth.getState().token },
    body: data,
  });
  const result = await r.json();
  if (!r.ok) throw new Error(result.message);
  return result;
}
export async function openMaterial(url: string) {
  if (!url.startsWith("asset:")) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const win = window.open("about:blank", "_blank");
  if (win) win.opener = null;
  try {
    const r = await fetch(base + "/files/" + url.slice(6), {
      headers: { Authorization: "Bearer " + useAuth.getState().token },
    });
    if (!r.ok) throw new Error("Không mở được học liệu");
    const blob = URL.createObjectURL(await r.blob());
    if (win) win.location.href = blob;
    setTimeout(() => URL.revokeObjectURL(blob), 60000);
  } catch (e) {
    win?.close();
    throw e;
  }
}

export type InlineMaterial = { src: string; revoke: () => void };

export async function inlineMaterial(url: string): Promise<InlineMaterial> {
  if (!url.startsWith("asset:")) return { src: url, revoke: () => undefined };

  const request = () => fetch(base + "/files/" + url.slice(6), {
    credentials: "include",
    headers: { Authorization: "Bearer " + useAuth.getState().token },
  });
  let response = await request();
  if (response.status === 401 && await restore()) response = await request();
  if (!response.ok) throw new Error("Không tải được video");

  const src = URL.createObjectURL(await response.blob());
  return { src, revoke: () => URL.revokeObjectURL(src) };
}
