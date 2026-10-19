import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { api, mutate } from "../../lib/api";
import { ErrorBox, Modal } from "../../components/ui";

export const dueLabel = (dueDate: string | null | undefined) =>
  dueDate ? "Hạn " + new Date(dueDate).toLocaleString("vi-VN") : "Không có hạn nộp";

export const statusLabel = { approved: "Đã duyệt", pending: "Chờ duyệt", removed: "Đã rời lớp" } as const;

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
  if (!query.error) return null;
  return (
    <div role="alert" className="error load-error">
      <span>
        Không tải được {what}. {query.error instanceof Error ? query.error.message : ""}
      </span>
      <button type="button" className="secondary" disabled={query.isFetching} onClick={() => query.refetch()}>
        {query.isFetching ? "Đang thử lại…" : "Thử lại"}
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
  return (
    <Modal title="Xác nhận thao tác" onClose={onClose}>
      <p>
        Bạn có chắc muốn {action} <b>{item}</b>?
      </p>
      {detail && <p className="tiny muted">{detail}</p>}
      <ErrorBox error={error} />
      <div className="button-row">
        <button type="button" className="secondary" onClick={onClose}>
          Hủy
        </button>
        <button type="button" className="danger" disabled={pending} onClick={onConfirm}>
          {pending ? "Đang xử lý…" : "Xác nhận"}
        </button>
      </div>
    </Modal>
  );
}

export function ShownOnce({ code, onDone }: { code: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="notice join-code-once" role="status">
      <b>Mã tham gia lớp</b>
      <p className="join-code-value">
        <code>{code}</code>
        <button
          type="button"
          className="icon-button"
          aria-label="Sao chép mã"
          onClick={() => navigator.clipboard?.writeText(code).then(() => setCopied(true))}
        >
          <Copy size={16} />
        </button>
      </p>
      <p className="tiny">
        {copied ? "Đã sao chép. " : ""}Mã chỉ hiển thị một lần. Nếu làm mất, hãy tạo mã mới; mã cũ sẽ ngừng hoạt động ngay.
      </p>
      <button type="button" className="secondary" onClick={onDone}>
        Đã lưu mã
      </button>
    </div>
  );
}

export const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
