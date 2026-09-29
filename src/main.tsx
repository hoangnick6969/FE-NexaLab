import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./styles.css";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000, refetchOnWindowFocus: false },
  },
});
class Boundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="error-page" style={{ textAlign: "center", padding: "40px" }}>
        <h1>Không thể hiển thị trang</h1>
        <p style={{ marginBottom: "24px" }}>
          Hãy tải lại. Nếu mô hình 3D không hiển thị, kiểm tra trình duyệt có hỗ
          trợ WebGL.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button className="secondary" onClick={() => location.reload()}>
            Tải lại
          </button>
          <button className="primary" onClick={() => { location.href = "/"; }}>
            Quay lại trang chủ
          </button>
        </div>
      </main>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Boundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </Boundary>
  </React.StrictMode>,
);
