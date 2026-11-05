import { createContext, useCallback, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { commonText } from "../i18n/common";
import { defineText } from "../i18n";
import "./action-toasts.css";

export type ActionToastTone = "success" | "info" | "error";
export type ActionToastOptions = {
  title: string;
  description?: string;
  tone?: ActionToastTone;
  action?: { label: string; onClick: () => void };
};
type ActionToastMessage = ActionToastOptions & { id: number };
type ShowActionToast = (options: ActionToastOptions) => void;

const ActionToastContext = createContext<ShowActionToast | null>(null);
const text = defineText({ vi: { region: "Thông báo thao tác" }, en: { region: "Action messages" } });
const MAX_VISIBLE = 3;
const EXIT_MS = 180;
const DEFAULT_DWELL_MS = 4600;

export function ActionToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActionToastMessage[]>([]);
  const sequence = useRef(0);

  const show = useCallback<ShowActionToast>((options) => {
    setToasts((current) => [...current, { ...options, id: ++sequence.current }].slice(-MAX_VISIBLE));
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const viewport = (
    <div className="action-toast-viewport" aria-label={text().region}>
      {toasts.map((toast) => (
        <ActionToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );

  return (
    <ActionToastContext.Provider value={show}>
      {children}
      {typeof document !== "undefined" && createPortal(viewport, document.body)}
    </ActionToastContext.Provider>
  );
}

function ActionToastCard({ toast, onDismiss }: { toast: ActionToastMessage; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const remaining = useRef(DEFAULT_DWELL_MS);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  const error = toast.tone === "error";
  const Icon = error ? AlertCircle : toast.tone === "info" ? Info : CheckCircle2;

  useEffect(() => {
    if (leaving) {
      const exitTimer = window.setTimeout(() => dismiss.current(), EXIT_MS);
      return () => window.clearTimeout(exitTimer);
    }
    // Errors stay visible until the user dismisses them or retries the action.
    if (paused || error) return;
    startedAt.current = Date.now();
    timer.current = window.setTimeout(() => setLeaving(true), remaining.current);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (startedAt.current !== null) {
        remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
        startedAt.current = null;
      }
    };
  }, [error, leaving, paused]);

  const close = () => setLeaving(true);
  const runAction = () => {
    try {
      toast.action?.onClick();
    } finally {
      close();
    }
  };

  return (
    <section
      className={`action-toast tone-${toast.tone ?? "success"}${paused ? " is-paused" : ""}${leaving ? " is-leaving" : ""}`}
      style={{ "--toast-dwell": `${remaining.current}ms` } as CSSProperties}
      role={error ? "alert" : "status"}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <Icon className="action-toast-icon" size={20} aria-hidden="true" />
      <span className="action-toast-copy">
        <strong>{toast.title}</strong>
        {toast.description && <span>{toast.description}</span>}
        {toast.action && (
          <button type="button" className="action-toast-action" onClick={runAction}>
            {toast.action.label}
          </button>
        )}
      </span>
      <button type="button" className="action-toast-close" aria-label={commonText().close} onClick={close}>
        <X size={16} aria-hidden="true" />
      </button>
      {!error && <span className="action-toast-progress" aria-hidden="true" />}
    </section>
  );
}

export function useActionToast() {
  const show = useContext(ActionToastContext);
  if (!show) throw new Error("useActionToast must be used within ActionToastProvider");
  return show;
}
