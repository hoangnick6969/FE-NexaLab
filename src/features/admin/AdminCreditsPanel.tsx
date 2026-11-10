import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, idempotencyKey, mutate } from "../../lib/api";
import { ErrorBox } from "../../components/ui";
import { defineText, formatDateTime } from "../../i18n";
import { signed } from "../credits/credits-view";
import "./admin-credits.css";

const text = defineText({
  vi: {
    title: "Tín dụng AI",
    lead: "Chỉ quản trị viên cấp hoặc điều chỉnh tín dụng. Mọi thay đổi cần lý do và được ghi vào nhật ký; sổ tín dụng không bao giờ bị sửa hay xóa.",
    available: "Khả dụng",
    reserved: "Đang giữ cho yêu cầu chưa xong",
    unit: "tín dụng",
    recent: "Giao dịch gần đây",
    none: "Chưa có giao dịch.",
    kinds: { GRANT: "Cấp", ADJUST: "Điều chỉnh", RESERVE: "Giữ trước", SETTLE: "Tính phí", REFUND: "Hoàn lại" } as Record<string, string>,
    grantTitle: "Cấp tín dụng",
    adjustTitle: "Điều chỉnh có dấu",
    adjustHint: "Số dương để cộng, số âm để trừ (không thể làm số dư khả dụng âm).",
    credits: "Số tín dụng",
    reason: "Lý do (5–500 ký tự)",
    grant: "Cấp",
    adjust: "Điều chỉnh",
    saving: "Đang lưu…",
    done: (balance: number) => `Đã ghi sổ. Số dư khả dụng hiện là ${balance} tín dụng.`,
    chargeNote: (n: number) => `đã dùng ${n}`,
  },
  en: {
    title: "AI credits",
    lead: "Only an administrator grants or adjusts credits. Every change needs a reason and is audited; the credit ledger is never edited or deleted.",
    available: "Available",
    reserved: "Held for unfinished requests",
    unit: "credits",
    recent: "Recent transactions",
    none: "No transactions yet.",
    kinds: { GRANT: "Grant", ADJUST: "Adjustment", RESERVE: "Held", SETTLE: "Charged", REFUND: "Refunded" } as Record<string, string>,
    grantTitle: "Grant credits",
    adjustTitle: "Signed adjustment",
    adjustHint: "A positive number adds, a negative number subtracts (the available balance cannot go below zero).",
    credits: "Credits",
    reason: "Reason (5–500 characters)",
    grant: "Grant",
    adjust: "Adjust",
    saving: "Saving…",
    done: (balance: number) => `Recorded. The available balance is now ${balance} credits.`,
    chargeNote: (n: number) => `used ${n}`,
  },
});

type AdminTransaction = { id: string; kind: string; credits: number; charged: number | null; jobId: string | null; reason: string | null; createdAt: string };
type AdminAccount = { teacherId: string; available: number; reserved: number; transactions: AdminTransaction[]; nextCursor: string | null };

/** Admin credits panel on a teacher's account detail (TAI5-T4): balances, recent history, grant and signed adjustment. */
export function AdminCreditsPanel({ teacherId }: { teacherId: string }) {
  const t = text();
  const qc = useQueryClient();
  const queryKey = ["admin", "credits", teacherId];
  const account = useQuery({ queryKey, queryFn: () => api<AdminAccount>(`/admin/credits/accounts?teacherId=${encodeURIComponent(teacherId)}&limit=10`) });
  const [notice, setNotice] = useState("");
  return (
    <section className="admin-credits" aria-label={t.title}>
      <h3>{t.title}</h3>
      <p className="tiny muted">{t.lead}</p>
      <ErrorBox error={account.error} />
      {account.data && (
        <>
          <p className="tiny" data-testid="admin-credit-balance">
            <b>{t.available}:</b> {account.data.available} {t.unit} · <b>{t.reserved}:</b> {account.data.reserved} {t.unit}
          </p>
          <h4>{t.recent}</h4>
          {account.data.transactions.length === 0 ? (
            <p className="tiny muted">{t.none}</p>
          ) : (
            <ul className="tiny" aria-label={t.recent}>
              {account.data.transactions.map((row) => (
                <li key={row.id}>
                  {formatDateTime(row.createdAt)} · <b>{t.kinds[row.kind] ?? row.kind}</b> {row.kind === "SETTLE" ? t.chargeNote(row.charged ?? 0) : signed(row.credits)}
                  {row.reason ? ` · ${row.reason}` : ""}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {notice && <p className="notice" role="status">{notice}</p>}
      <div className="admin-credits-forms">
        <CreditForm kind="grants" title={t.grantTitle} submitLabel={t.grant} min={1} onDone={(balance) => { setNotice(t.done(balance)); qc.invalidateQueries({ queryKey }); }} teacherId={teacherId} />
        <CreditForm kind="adjustments" title={t.adjustTitle} hint={t.adjustHint} submitLabel={t.adjust} min={-100000} onDone={(balance) => { setNotice(t.done(balance)); qc.invalidateQueries({ queryKey }); }} teacherId={teacherId} />
      </div>
    </section>
  );
}

function CreditForm({
  kind,
  title,
  hint,
  submitLabel,
  min,
  teacherId,
  onDone,
}: {
  kind: "grants" | "adjustments";
  title: string;
  hint?: string;
  submitLabel: string;
  min: number;
  teacherId: string;
  onDone: (available: number) => void;
}) {
  const t = text();
  const [credits, setCredits] = useState("");
  const [reason, setReason] = useState("");
  // One Idempotency-Key per attempt: a double click or a retry replays instead of posting twice; success starts a new one.
  const key = useRef<string | null>(null);
  const send = useMutation({
    mutationFn: () => {
      key.current ??= idempotencyKey();
      return mutate<{ available: number }>(`/admin/credits/accounts/${encodeURIComponent(teacherId)}/${kind}`, "POST", { credits: Number(credits), reason: reason.trim() }, key.current);
    },
    onSuccess: (result) => {
      key.current = null;
      setCredits("");
      setReason("");
      onDone(result.available);
    },
  });
  return (
    <form
      aria-label={title}
      onSubmit={(event) => {
        event.preventDefault();
        send.mutate();
      }}
    >
      <b>{title}</b>
      {hint && <small className="tiny muted">{hint}</small>}
      <label className="field">
        <span>{t.credits}</span>
        <input type="number" required step={1} min={min} max={100000} value={credits} onChange={(e) => setCredits(e.target.value)} />
      </label>
      <label className="field">
        <span>{t.reason}</span>
        <textarea required minLength={5} maxLength={500} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <ErrorBox error={send.error} />
      <button className="primary" disabled={send.isPending || !credits || Number(credits) === 0 || reason.trim().length < 5}>
        {send.isPending ? t.saving : submitLabel}
      </button>
    </form>
  );
}
