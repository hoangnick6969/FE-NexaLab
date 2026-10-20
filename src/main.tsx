import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./app/App";
import { queryClient } from "./app/query-client";
import { defineText, useLocale } from "./i18n";
import "./tokens.css";
import "./styles.css";
const text = defineText({
  vi: { title: "Không thể hiển thị trang", body: "Đã xảy ra lỗi khi tải dữ liệu hoặc hiển thị giao diện. Hãy tải lại trang.", reload: "Tải lại" },
  en: { title: "This page cannot be shown", body: "Something went wrong while loading data or drawing the page. Please reload.", reload: "Reload" },
});

/** A language change remounts the app so every `defineText` read picks up the new locale. */
function LocalizedApp() {
  const locale = useLocale();
  return <App key={locale} />;
}

class Boundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch() {
    console.error("NexaLab render error");
  }
  render() {
    const t = text();
    return this.state.error ? (
      <main className="error-page">
        <h1>{t.title}</h1>
        <p>{t.body}</p>
        <button onClick={() => location.reload()}>{t.reload}</button>
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
          <LocalizedApp />
        </BrowserRouter>
      </QueryClientProvider>
    </Boundary>
  </React.StrictMode>,
);
