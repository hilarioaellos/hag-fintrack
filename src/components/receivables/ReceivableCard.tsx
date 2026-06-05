"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MoreHorizontal, Pencil, AlertTriangle, ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { Doc } from "@convex-api/dataModel";
import { ReceivableFormDialog } from "./ReceivableFormDialog";
import { PaymentFormDialog } from "./PaymentFormDialog";

type Payment = Doc<"fintrack_receivable_payments">;

type Receivable = Doc<"fintrack_receivables">;

const STATUS_STYLE: Record<Receivable["status"], { color: string; bg: string }> = {
  active: { color: "var(--color-ft-primary)", bg: "color-mix(in srgb, var(--color-ft-primary) 10%, transparent)" },
  partially_paid: { color: "var(--color-ft-warn)", bg: "color-mix(in srgb, var(--color-ft-warn) 10%, transparent)" },
  fully_paid: { color: "var(--color-ft-good)", bg: "color-mix(in srgb, var(--color-ft-good) 10%, transparent)" },
  written_off: { color: "var(--color-ft-text-3)", bg: "color-mix(in srgb, var(--color-ft-text-3) 10%, transparent)" },
};

function PaymentHistory({ receivableId, currencyCode }: { receivableId: Receivable["_id"]; currencyCode: string }) {
  const t = useTranslations("receivables");
  const payments = useQuery(api.fintrack.receivables.listPayments, { receivableId });

  if (!payments) return <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>…</p>;
  if (payments.length === 0) return (
    <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("noPayments")}</p>
  );

  return (
    <div className="space-y-1.5">
      {payments.map((p: Payment) => (
        <div key={p._id} className="flex items-center justify-between gap-2 text-xs">
          <span style={{ color: "var(--color-ft-text-3)" }}>
            {new Date(p.paymentDate).toLocaleDateString()} · {p.method}
          </span>
          <span className="font-mono font-semibold" style={{ color: "var(--color-ft-good)" }}>
            +{formatMoney(p.amount, currencyCode)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ReceivableCard({ receivable }: { receivable: Receivable }) {
  const t = useTranslations("receivables");
  const tc = useTranslations("common");
  const writeOffMutation = useMutation(api.fintrack.receivables.writeOff);
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const collected = receivable.originalAmount - receivable.outstandingBalance;
  const collectedPct = Math.round((collected / receivable.originalAmount) * 100);
  const isSettled = receivable.status === "fully_paid" || receivable.status === "written_off";
  const canPay = !isSettled;

  const statusStyle = STATUS_STYLE[receivable.status];

  const dueDateStr = receivable.dueDate
    ? new Date(receivable.dueDate).toLocaleDateString()
    : null;
  const isOverdue = receivable.dueDate && receivable.dueDate < Date.now() && !isSettled;

  return (
    <>
      <div
        className="rounded-xl border p-5 flex flex-col gap-3 group relative"
        style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: "var(--color-ft-text)" }}>
              {receivable.debtorName}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--color-ft-text-3)" }}>
              {receivable.description}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{ color: statusStyle.color, backgroundColor: statusStyle.bg, borderColor: statusStyle.color }}
            >
              {t(`status.${receivable.status}`)}
            </span>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--color-ft-text-3)" }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div
                    className="absolute right-0 top-6 z-20 rounded-lg border shadow-lg py-1 min-w-[130px]"
                    style={{ backgroundColor: "var(--color-ft-surface-2)", borderColor: "var(--color-ft-border)" }}
                  >
                    <button
                      onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-ft-surface)]"
                      style={{ color: "var(--color-ft-text-2)" }}
                    >
                      <Pencil className="h-3 w-3" /> {tc("edit")}
                    </button>
                    {!isSettled && (
                      <button
                        onClick={async () => {
                          setMenuOpen(false);
                          if (confirm(t("writeOffConfirm"))) {
                            await writeOffMutation({ id: receivable._id });
                          }
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-ft-surface)]"
                        style={{ color: "var(--color-ft-bad)" }}
                      >
                        <AlertTriangle className="h-3 w-3" /> {t("writeOff")}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("originalAmount")}</p>
            <p className="text-base font-bold ft-num mt-0.5" style={{ color: "var(--color-ft-text-2)" }}>
              {formatMoney(receivable.originalAmount, receivable.currencyCode)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("outstandingBalance")}</p>
            <p className="text-base font-bold ft-num mt-0.5" style={{
              color: receivable.outstandingBalance > 0 ? "var(--color-ft-warn)" : "var(--color-ft-good)"
            }}>
              {formatMoney(receivable.outstandingBalance, receivable.currencyCode)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]" style={{ color: "var(--color-ft-text-3)" }}>
            <span>{collectedPct}% {t("collectedPct")}</span>
            {dueDateStr && (
              <span style={{ color: isOverdue ? "var(--color-ft-bad)" : "var(--color-ft-text-3)" }}>
                {isOverdue ? "⚠ " : ""}{dueDateStr}
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-ft-surface-2)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${collectedPct}%`,
                backgroundColor: collectedPct >= 100
                  ? "var(--color-ft-good)"
                  : receivable.status === "written_off"
                  ? "var(--color-ft-text-3)"
                  : "var(--color-ft-primary)",
              }}
            />
          </div>
        </div>

        {/* Register Payment button */}
        {canPay && (
          <button
            onClick={() => setPayOpen(true)}
            className="flex items-center gap-1.5 text-[11px] w-fit font-medium"
            style={{ color: "var(--color-ft-primary)" }}
          >
            <Plus className="h-3 w-3" />
            {t("registerPayment")}
          </button>
        )}

        {/* Payment history toggle */}
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="flex items-center gap-1.5 text-[11px] w-fit"
          style={{ color: "var(--color-ft-text-3)" }}
        >
          {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {t("paymentHistory")}
        </button>

        {showHistory && (
          <div
            className="rounded-lg border p-3"
            style={{ backgroundColor: "var(--color-ft-surface-2)", borderColor: "var(--color-ft-border)" }}
          >
            <PaymentHistory receivableId={receivable._id} currencyCode={receivable.currencyCode} />
          </div>
        )}
      </div>

      <ReceivableFormDialog open={editOpen} onOpenChange={setEditOpen} receivable={receivable} />
      {canPay && <PaymentFormDialog open={payOpen} onOpenChange={setPayOpen} receivable={receivable} />}
    </>
  );
}
