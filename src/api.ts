import { create } from "zustand";
export type User = {
  id: string;
  email: string;
  fullName: string;
  role: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";
  grade: number;
};
export const useAuth = create<{
  user: User | null;
  token: string | null;
  set: (user: User | null, token: string | null) => void;
}>((set) => ({
  user: { id: "1", email: "test@nexalab.local", fullName: "UI Tester", role: "STUDENT", grade: 8 },
  token: "mock",
  set: (user, token) => set({ user, token }),
}));
const base = import.meta.env.VITE_API_URL ?? "/api";
let refreshPromise: Promise<boolean> | null = null;
export async function restore() {
  return true;
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
  retry = true,
): Promise<T> {
  try {
    const token = useAuth.getState().token;
    const r = await fetch(base + path, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (r.status === 401 && retry && !path.startsWith("/auth/")) {
      if (await restore()) return api(path, method, body, false);
      useAuth.getState().set(null, null);
    }
    const data = await r.json();
    if (!r.ok) throw new Error(data.message ?? "Không thể kết nối máy chủ");
    return data;
  } catch (e) {
    console.warn("API Error bypassed for UI testing:", path, e);
    if (path.includes("/assignments")) return [] as any;
    if (path.includes("/progress")) return { progress: [], attempts: [] } as any;
    return {} as any;
  }
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
