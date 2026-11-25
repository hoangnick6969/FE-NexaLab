import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, idempotencyKey, mutate } from "../../lib/api";
import { ErrorBox, Modal } from "../../components/ui";
import { defineText, formatDateTime } from "../../i18n";
import type { CreditOrigin } from "../credits/credits-api";
import { signed } from "../credits/credits-view";
import "../credits/credits.css";
import "./admin-credits.css";

const text = defineText({
  vi: {
    title: "Tín dụng AI",
    lead: "Hệ thống tự tặng quà khởi đầu một lần cho mỗi giáo viên; ngoài ra chỉ quản trị viên cấp hoặc điều chỉnh tín dụng. Mọi thay đổi cần lý do và được ghi vào nhật ký; sổ tín dụng không bao giờ bị sửa hay xóa.",
    available: "Khả dụng",
    reserved: "Đang giữ cho yêu cầu chưa xong",
    unit: "tín dụng",
    recent: "Giao dịch gần đây",
    none: "Chưa có giao dịch.",
    origins: { STARTER: "Quà khởi đầu (tự động)", PAYMENT: "Nạp qua thanh toán" } as Record<string, string>,
    kinds: { GRANT: "Cấp", ADJUST: "Điều chỉnh", RESERVE: "Giữ trước", SETTLE: "Tính phí", REFUND: "Hoàn lại" } as Record<string, string>,
    grantTitle: "Cấp tín dụng",
    adjustTitle: "Điều chỉnh có dấu",
    adjustHint: "Số dương để cộng, số âm để trừ (không thể làm số dư khả dụng âm).",
    credits: "Số tín dụng",
    reason: "Lý do (5–500 ký tự)",
    grant: "Cấp",
    adjust: "Điều chỉnh",
    saving: "Đang lưu…",
    loading: "Đang tải…",
    cancel: "Hủy",
    close: "Đóng",
    presetsLabel: "Mức tín dụng gợi ý",
    uatReason: "Cấp tín dụng demo UAT",
    done: (balance: number) => `Đã ghi sổ. Số dư khả dụng hiện là ${balance} tín dụng.`,
    grantSuccess: (n: number, available: number) => `Đã cấp ${n} tín dụng. Số dư khả dụng: ${available}.`,
    chargeNote: (n: number) => `đã dùng ${n}`,
  },
  en: {
    title: "AI credits",
    lead: "The system gives each teacher a one-time starter gift; otherwise only an administrator grants or adjusts credits. Every change needs a reason and is audited; the credit ledger is never edited or deleted.",
    available: "Available",
    reserved: "Held for unfinished requests",
    unit: "credits",
    recent: "Recent transactions",
    none: "No transactions yet.",
    origins: { STARTER: "Starter gift (automatic)", PAYMENT: "Paid top-up" } as Record<string, string>,
    kinds: { GRANT: "Grant", ADJUST: "Adjustment", RESERVE: "Held", SETTLE: "Charged", REFUND: "Refunded" } as Record<string, string>,
    grantTitle: "Grant credits",
    adjustTitle: "Signed adjustment",
    adjustHint: "A positive number adds, a negative number subtracts (the available balance cannot go below zero).",
    credits: "Credits",
    reason: "Reason (5–500 characters)",
    grant: "Grant",
    adjust: "Adjust",
    saving: "Saving…",
    loading: "Loading…",
    cancel: "Cancel",
    close: "Close",
    presetsLabel: "Preset credit amounts",
    uatReason: "Grant demo UAT credits",
    done: (balance: number) => `Recorded. The available balance is now ${balance} credits.`,
    grantSuccess: (n: number, available: number) => `Granted ${n} credits. Available balance: ${available}.`,
    chargeNote: (n: number) => `used ${n}`,
  },
});

type AdminTransaction = { id: string; kind: string; origin?: CreditOrigin; credits: number; charged: number | null; jobId: string | null; reason: string | null; createdAt: string };
type AdminAccount = { teacherId: string; available: number; reserved: number; transactions: AdminTransaction[]; nextCursor: string | null };

const GRANT_PRESETS = [10, 50, 100] as const;
const adminCreditsKey = (teacherId: string) => ["admin", "credits", teacherId] as const;

function useAdminCreditsAccount(teacherId: string) {
  return useQuery({
    queryKey: adminCreditsKey(teacherId),
    queryFn: () => api<AdminAccount>(`/admin/credits/accounts?teacherId=${encodeURIComponent(teacherId)}&limit=10`),
  });
}

/** Admin credits panel on a teacher's account detail (TAI5-T4): balances, recent history, grant and signed adjustment. */
export function AdminCreditsPanel({ teacherId }: { teacherId: string }) {
  const t = text();
  const qc = useQueryClient();
  const queryKey = adminCreditsKey(teacherId);
  const account = useAdminCreditsAccount(teacherId);
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
                  {formatDateTime(row.createdAt)} · <b>{(row.origin && t.origins[row.origin]) || t.kinds[row.kind] || row.kind}</b> {row.kind === "SETTLE" ? t.chargeNote(row.charged ?? 0) : signed(row.credits)}
                  {row.reason ? ` · ${row.reason}` : ""}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {notice && <p className="notice" role="status">{notice}</p>}
      <div className="admin-credits-forms">
        <PostingForm kind="grants" title={t.grantTitle} submitLabel={t.grant} min={1} onDone={(balance) => { setNotice(t.done(balance)); qc.invalidateQueries({ queryKey }); }} teacherId={teacherId} />
        <PostingForm kind="adjustments" title={t.adjustTitle} hint={t.adjustHint} submitLabel={t.adjust} min={-100000} onDone={(balance) => { setNotice(t.done(balance)); qc.invalidateQueries({ queryKey }); }} teacherId={teacherId} />
      </div>
    </section>
  );
}

/** Quick modal for granting credits to a teacher directly from the Users table. */
export function GrantCreditsDialog({
  teacherId,
  teacherName,
  onClose,
}: {
  teacherId: string;
  teacherName: string;
  onClose: () => void;
}) {
  const t = text();
  const qc = useQueryClient();
  const queryKey = adminCreditsKey(teacherId);
  const account = useAdminCreditsAccount(teacherId);
  const [granted, setGranted] = useState<{ amount: number; available: number } | null>(null);

  return (
    <Modal title={t.grantTitle} onClose={onClose}>
      <div className="admin-grant-dialog">
        <div className="admin-grant-balance">
          <b>{teacherName}</b>
          {account.isLoading && <span className="tiny muted">{t.loading}</span>}
          {account.data && (
            <span className="tiny" data-testid="admin-grant-balance">
              {t.available}: <b>{account.data.available}</b> {t.unit}
            </span>
          )}
        </div>
        <ErrorBox error={account.error} />
        {granted ? (
          <div className="admin-grant-success">
            <p className="notice" role="status">
              {t.grantSuccess(granted.amount, granted.available)}
            </p>
            <button type="button" className="primary" onClick={onClose}>
              {t.close}
            </button>
          </div>
        ) : (
          <PostingForm
            kind="grants"
            submitLabel={t.grantTitle}
            min={1}
            teacherId={teacherId}
            presets={GRANT_PRESETS}
            reasonChips={[t.uatReason]}
            onCancel={onClose}
            onDone={(available, amount) => {
              qc.invalidateQueries({ queryKey });
              setGranted({ amount, available });
            }}
          />
        )}
      </div>
    </Modal>
  );
}

/** Reusable ledger posting form for admin credit grants and signed adjustments. */
export function PostingForm({
  kind,
  title,
  hint,
  submitLabel,
  min,
  teacherId,
  presets,
  reasonChips,
  onCancel,
  onDone,
}: {
  kind: "grants" | "adjustments";
  title?: string;
  hint?: string;
  submitLabel: string;
  min: number;
  teacherId: string;
  presets?: readonly number[];
  reasonChips?: readonly string[];
  onCancel?: () => void;
  onDone: (available: number, postedCredits: number) => void;
}) {
  const t = text();
  const [credits, setCredits] = useState("");
  const [reason, setReason] = useState("");
  // One Idempotency-Key per attempt: a double click or a retry replays instead of posting twice; success starts a new one.
  const key = useRef<string | null>(null);
  const send = useMutation({
    mutationFn: (payload: { credits: number; reason: string }) => {
      key.current ??= idempotencyKey();
      return mutate<{ available: number }>(`/admin/credits/accounts/${encodeURIComponent(teacherId)}/${kind}`, "POST", payload, key.current);
    },
    onSuccess: (result, payload) => {
      key.current = null;
      setCredits("");
      setReason("");
      onDone(result.available, payload.credits);
    },
  });
  const numericCredits = Number(credits);
  const trimmedReason = reason.trim();
  const invalidCredits = !credits || !Number.isInteger(numericCredits) || numericCredits === 0 || numericCredits < min || numericCredits > 100000;
  const submitDisabled = send.isPending || invalidCredits || trimmedReason.length < 5 || trimmedReason.length > 500;
  return (
    <form
      className={presets || reasonChips ? "admin-grant-form" : undefined}
      aria-label={title ?? submitLabel}
      onSubmit={(event) => {
        event.preventDefault();
        if (submitDisabled) return;
        send.mutate({ credits: numericCredits, reason: trimmedReason });
      }}
    >
      {title && <b>{title}</b>}
      {hint && <small className="tiny muted">{hint}</small>}
      {presets && presets.length > 0 && (
        <div className="admin-grant-presets" role="group" aria-label={t.presetsLabel}>
          {presets.map((amount) => (
            <button
              key={amount}
              type="button"
              className="admin-grant-preset"
              aria-pressed={numericCredits === amount}
              onClick={() => setCredits(String(amount))}
            >
              +{amount} {t.unit}
            </button>
          ))}
        </div>
      )}
      <label className="field">
        <span>{t.credits}</span>
        <input type="number" required step={1} min={min} max={100000} value={credits} onChange={(e) => setCredits(e.target.value)} />
      </label>
      <label className="field">
        <span>{t.reason}</span>
        <textarea required minLength={5} maxLength={500} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      {reasonChips && reasonChips.length > 0 && (
        <div className="button-row">
          {reasonChips.map((chip) => (
            <button key={chip} type="button" className="admin-grant-chip" onClick={() => setReason(chip)}>
              {chip}
            </button>
          ))}
        </div>
      )}
      <ErrorBox error={send.error} />
      {onCancel ? (
        <div className="button-row">
          <button type="button" className="secondary" onClick={onCancel}>
            {t.cancel}
          </button>
          <button type="submit" className="primary" disabled={submitDisabled}>
            {send.isPending ? t.saving : submitLabel}
          </button>
        </div>
      ) : (
        <button className="primary" disabled={submitDisabled}>
          {send.isPending ? t.saving : submitLabel}
        </button>
      )}
    </form>
  );
}
