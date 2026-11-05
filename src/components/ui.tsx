import { useEffect, useId, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { commonText } from "../i18n/common";
export const verdictLabel = (v: string) => commonText().verdicts[v] ?? v;
export function Badge({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function ErrorBox({ error }: { error: unknown }) {
  return error ? (
    <div role="alert" className="error">
      {error instanceof Error ? error.message : String(error)}
    </div>
  ) : null;
}
export function useAction(fn: (data: any) => Promise<any>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries(),
  });
}
export function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}
// The toggle sits outside the <label> so the input's accessible name stays just `label`.
export function PasswordField({
  label,
  id,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string }) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? commonText().hidePassword : commonText().showPassword;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className="password-input">
        <input id={inputId} type={visible ? "text" : "password"} {...props} />
        <button type="button" className="password-toggle" aria-label={toggleLabel} title={toggleLabel} aria-pressed={visible} onClick={() => setVisible((v) => !v)}>
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    const focusable = () => Array.from(node?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]') ?? []).filter((item) => item.getClientRects().length > 0);
    (focusable()[0] ?? node)?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); node?.focus(); return; }
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !node?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !node?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    node?.addEventListener("keydown", keydown);
    return () => { node?.removeEventListener("keydown", keydown); if (previous?.isConnected) previous.focus(); };
  }, []);
  return (
    <div className="modal-wrap">
      <section
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-button" aria-label={commonText().close} onClick={onClose}>
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function PageLoader({
  message = commonText().pageLoading,
  caption = commonText().pageLoadingCaption,
  fullScreen = false,
}: {
  message?: string;
  caption?: string;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={`page-loader${fullScreen ? " is-fullscreen" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={[message, caption].filter(Boolean).join(" ")}
    >
      <div className="page-loader-content" aria-hidden="true">
        <div className="page-loader-heading">
          <Skeleton variant="text" className="page-loader-eyebrow" />
          <Skeleton variant="text" className="page-loader-title" />
          <Skeleton variant="text" className="page-loader-description" />
        </div>
        <div className="page-loader-grid"><CardSkeleton count={3} /></div>
      </div>
    </div>
  );
}

export function InlineLoader({
  message = commonText().loading,
  size = "md",
}: {
  message?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={`inline-loader is-${size}`} role="status" aria-live="polite">
      <svg className="inline-loader-spinner" viewBox="0 0 20 20" width={size === "sm" ? 13 : 16} height={size === "sm" ? 13 : 16} aria-hidden="true">
        <circle className="spinner-track" cx="10" cy="10" r="7.5" fill="none" strokeWidth="2.2" />
        <circle className="spinner-blade" cx="10" cy="10" r="7.5" fill="none" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export function Skeleton({
  className = "",
  style,
  variant = "rect",
}: {
  className?: string;
  style?: React.CSSProperties;
  variant?: "text" | "rect" | "circle" | "card";
}) {
  return (
    <div
      className={`skeleton skeleton-${variant} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="panel skeleton-card" aria-hidden="true">
          <Skeleton variant="text" style={{ width: "28%", height: 16, marginBottom: 14 }} />
          <Skeleton variant="text" style={{ width: "84%", height: 20, marginBottom: 10 }} />
          <Skeleton variant="text" style={{ width: "62%", height: 14, marginBottom: 20 }} />
          <Skeleton variant="rect" style={{ width: "100%", height: 38, borderRadius: 8 }} />
        </div>
      ))}
    </>
  );
}

