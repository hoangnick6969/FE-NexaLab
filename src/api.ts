import { create } from "zustand";
export type User = {
  id: string;
  username: string | null;
  email: string | null;
  fullName: string;
  role: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";
  grade: number;
  mustChangePassword: boolean;
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
  if (refreshPromise) return refreshPromise;
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

  // -- MOCK INTERCEPTOR START --
  const MOCK = true; // Bật cờ này khi đang dev mockup
  if (MOCK) {
    // Giả lập mạng chậm
    await new Promise(r => setTimeout(r, 400));
    console.log(`[MOCK API] ${method} ${path}`, body);

    if (path.startsWith("/auth/student/login") || path.startsWith("/auth/login") || path.startsWith("/auth/register")) {
      const isStudent = path.includes("student");
      const b = body as any || {};
      return {
        user: {
          id: "mock_user_1",
          username: isStudent ? b.username || "student" : null,
          email: !isStudent ? b.email || "teacher@nexalab.vn" : null,
          fullName: isStudent ? "Học sinh Mẫu" : "Giáo viên Mẫu",
          role: isStudent ? "STUDENT" : (b.role || "TEACHER"),
          grade: 9,
          mustChangePassword: false
        },
        accessToken: "mock_access_token"
      } as any;
    }
    
    if (path === "/auth/logout") return {} as any;
    
    // Trả về mock data cho các API fetch phổ biến
    if (path.startsWith("/progress")) return { progress: [], attempts: [] } as any;
    if (path.startsWith("/assignments")) return [] as any;
    if (path.startsWith("/saved")) return [] as any;
    if (path.startsWith("/classes")) return [] as any;
    if (path.startsWith("/lessons")) return [] as any;
    
    // Mặc định cho tất cả các endpoint GET khác để tránh crash map()
    if (method === "GET") return [] as any;
    return {} as any;
  }
  // -- MOCK INTERCEPTOR END --

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
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(". ")
      : data.message;
    throw new Error(message ?? "Không thể kết nối máy chủ");
  }
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
