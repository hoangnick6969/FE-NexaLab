import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { api, mutate } from "../../lib/api";
import { ErrorBox, Modal } from "../../components/ui";
import { defineText, formatDateTime } from "../../i18n";
import { commonText } from "../../i18n/common";

const text = defineText({
  vi: {
    status: { approved: "Đã duyệt", pending: "Chờ duyệt", removed: "Đã rời lớp" },
    loadFailed: (what: string) => `Không tải được ${what}.`,
    confirmTitle: "Xác nhận thao tác",
    confirmLead: (action: string) => `Bạn có chắc muốn ${action}`,
    joinCode: "Mã tham gia lớp",
    copyCode: "Sao chép mã",
    copied: "Đã sao chép. ",
    shownOnce: "Mã chỉ hiển thị một lần. Nếu làm mất, hãy tạo mã mới; mã cũ sẽ ngừng hoạt động ngay.",
    savedCode: "Đã lưu mã",
  },
  en: {
    status: { approved: "Approved", pending: "Waiting for approval", removed: "Left the class" },
    loadFailed: (what: string) => `Could not load ${what}.`,
    confirmTitle: "Confirm action",
    confirmLead: (action: string) => `Are you sure you want to ${action}`,
    joinCode: "Class join code",
    copyCode: "Copy code",
    copied: "Copied. ",
    shownOnce: "The code is shown only once. If you lose it, create a new one; the old code stops working at once.",
    savedCode: "I saved the code",
  },
});

export const dueLabel = (dueDate: string | null | undefined) =>
  dueDate ? commonText().due(formatDateTime(dueDate)) : commonText().noDueDate;

export const statusLabel = text().status;

/** Mutation that invalidates every query and keeps one Idempotency-Key per attempt. */
export function useMutate<T = any>() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, method = "POST", body, key }: { path: string; method?: string; body?: unknown; key?: string }) =>
      key ? mutate<T>(path, method, body, key) : api<T>(path, method, body),
    onSuccess: () => qc.invalidateQueries(),
  });
}

/** A failed read is never a dead end: show why and offer a retry. */
export function LoadError({ query, what }: { query: { error: unknown; refetch: () => unknown; isFetching: boolean }; what: string }) {
  const t = text();
  if (!query.error) return null;
  return (
    <div role="alert" className="error load-error">
      <span>
        {t.loadFailed(what)} {query.error instanceof Error ? query.error.message : ""}
      </span>
      <button type="button" className="secondary" disabled={query.isFetching} onClick={() => query.refetch()}>
        {query.isFetching ? commonText().retrying : commonText().retry}
      </button>
    </div>
  );
}

/** CR-05 / MSG-41: destructive actions ask before they run. */
export function Confirm({
  action,
  item,
  detail,
  onConfirm,
  onClose,
  pending,
  error,
}: {
  action: string;
  item: string;
  detail?: string;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
  error?: unknown;
}) {
  const t = text();
  return (
    <Modal title={t.confirmTitle} onClose={onClose}>
      <p>
        {t.confirmLead(action)} <b>{item}</b>?
      </p>
      {detail && <p className="tiny muted">{detail}</p>}
      <ErrorBox error={error} />
      <div className="button-row">
        <button type="button" className="secondary" onClick={onClose}>
          {commonText().cancel}
        </button>
        <button type="button" className="danger" disabled={pending} onClick={onConfirm}>
          {pending ? commonText().working : commonText().confirm}
        </button>
      </div>
    </Modal>
  );
}

export function ShownOnce({ code, onDone }: { code: string; onDone: () => void }) {
  const t = text();
  const [copied, setCopied] = useState(false);
  return (
    <div className="notice join-code-once" role="status">
      <b>{t.joinCode}</b>
      <p className="join-code-value">
        <code>{code}</code>
        <button
          type="button"
          className="icon-button"
          aria-label={t.copyCode}
          onClick={() => navigator.clipboard?.writeText(code).then(() => setCopied(true))}
        >
          <Copy size={16} />
        </button>
      </p>
      <p className="tiny">
        {copied ? t.copied : ""}{t.shownOnce}
      </p>
      <button type="button" className="secondary" onClick={onDone}>
        {t.savedCode}
      </button>
    </div>
  );
}

export const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
