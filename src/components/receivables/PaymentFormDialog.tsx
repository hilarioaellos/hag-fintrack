"use client";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { dollarsToCents, formatMoney } from "@/lib/money";
import { toLocalDateInput, dateInputToTimestamp } from "@/lib/dates";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import type { Doc } from "@convex-api/dataModel";

type Receivable = Doc<"fintrack_receivables">;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable: Receivable;
}

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

export function PaymentFormDialog({ open, onOpenChange, receivable }: Props) {
  const t = useTranslations("receivables");
  const tc = useTranslations("common");
  const recordMutation = useMutation(api.fintrack.receivables.recordPayment);

  const today = toLocalDateInput(new Date().getTime());
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today);
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setAmount("");
    setPaymentDate(today);
    setMethod("");
    setNote("");
    setError("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const amountFloat = Number(amount);
    const amountCents = Number.isFinite(amountFloat) ? dollarsToCents(amountFloat) : 0;
    if (amountCents <= 0) { setError("Amount must be greater than 0"); return; }
    if (amountCents > receivable.outstandingBalance) {
      setError(`Amount exceeds outstanding balance (${formatMoney(receivable.outstandingBalance, receivable.currencyCode)})`);
      return;
    }
    if (!paymentDate) { setError("Payment date is required"); return; }
    if (!method.trim()) { setError("Payment method is required"); return; }

    setLoading(true);
    try {
      await recordMutation({
        receivableId: receivable._id,
        amount: amountCents,
        paymentDate: dateInputToTimestamp(paymentDate),
        method: method.trim(),
        note: note.trim() || undefined,
      });
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--color-ft-text)" }}>
            {t("registerPayment")} — {receivable.debtorName}
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs mb-2" style={{ color: "var(--color-ft-text-3)" }}>
          {t("outstandingBalance")}:{" "}
          <span className="font-mono font-semibold" style={{ color: "var(--color-ft-warn)" }}>
            {formatMoney(receivable.outstandingBalance, receivable.currencyCode)}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("paymentAmount")}</Label>
              <Input type="number" min="0.01" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("paymentDate")}</Label>
              <Input type="date" value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>{t("paymentMethod")}</Label>
            <Input value={method} onChange={(e) => setMethod(e.target.value)}
              placeholder="e.g. Transfer, Cash" style={inputStyle} />
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>{t("paymentNote")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note…" style={inputStyle} />
          </div>

          {error && <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={loading}
              style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>
              {loading ? tc("loading") : t("registerPayment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
