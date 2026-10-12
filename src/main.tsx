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
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("NexaLab render error", error, info.componentStack);
  }
  render() {
    return this.state.error ? (
      <main className="error-page">
        <h1>Không thể hiển thị trang</h1>
        <p>Đã xảy ra lỗi khi tải dữ liệu hoặc hiển thị giao diện. Hãy tải lại trang.</p>
        <button onClick={() => location.reload()}>Tải lại</button>
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
