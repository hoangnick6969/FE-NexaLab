import { useState } from "react";
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
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-wrap" onClick={onClose}>
      <section
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
    >
      <div className="loader-core">
        <div className="loader-orbit-wrap" aria-hidden="true">
          <span className="loader-ring loader-ring-1" />
          <span className="loader-ring loader-ring-2" />
          <span className="loader-ring loader-ring-3" />
          <span className="loader-nucleus" />
        </div>
        <div className="loader-copy">
          <b className="loader-message">{message}</b>
          {caption && <p className="loader-caption">{caption}</p>}
        </div>
        <div className="loader-meter" aria-hidden="true">
          <span className="loader-meter-bar" />
        </div>
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
      <span className="inline-loader-spinner" aria-hidden="true" />
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

