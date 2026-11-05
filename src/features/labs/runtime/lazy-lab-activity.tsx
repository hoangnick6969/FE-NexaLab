import { Component, lazy, Suspense, useMemo, useState, type ComponentProps, type ComponentType, type ReactNode } from "react";
import { InlineLoader } from "../../../components/ui";
import { defineText } from "../../../i18n";

const text = defineText({
  vi: { loading: "Đang tải phòng thí nghiệm…", failed: "Chưa tải được phòng thí nghiệm. Em có thể thử lại.", retry: "Thử tải lại", reload: "Tải lại trang", reloadWarning: "Thao tác chưa lưu có thể bị mất khi tải lại trang." },
  en: { loading: "Loading the lab…", failed: "The lab could not load. You can try again.", retry: "Try loading again", reload: "Reload page", reloadWarning: "Reloading the page may lose unsaved work." },
});

class ActivityBoundary extends Component<{ children: ReactNode; retry: () => void; retried: boolean }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    const t = text();
    return <div className="notice" role="alert">
      <p>{t.failed}</p>
      <button type="button" className="secondary" onClick={this.props.retry}>{t.retry}</button>
      {this.props.retried && <>
        <p>{t.reloadWarning}</p>
        <button type="button" className="secondary" onClick={() => window.location.reload()}>{t.reload}</button>
      </>}
    </div>;
  }
}

/** A failed scene stays local to the activity; retry creates a new lazy loader. */
export function loadLabActivity<T extends ComponentType<any>>(load: () => Promise<{ default: T }>): ComponentType<ComponentProps<T>> {
  return function LazyLabActivity(props: ComponentProps<T>) {
    const [attempt, setAttempt] = useState(0);
    const Activity = useMemo(() => lazy(load), [attempt]) as ComponentType<ComponentProps<T>>;
    return <ActivityBoundary key={attempt} retried={attempt > 0} retry={() => setAttempt((value) => value + 1)}>
      <Suspense fallback={<InlineLoader message={text().loading} />}>
        <Activity {...props} />
      </Suspense>
    </ActivityBoundary>;
  };
}
