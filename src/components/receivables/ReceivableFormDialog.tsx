"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { dollarsToCents } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Doc } from "@convex-api/dataModel";

type Receivable = Doc<"fintrack_receivables">;
type Periodicity = "monthly" | "one_time" | "irregular";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivable?: Receivable;
}

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

function tsToDateInput(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toISOString().slice(0, 10);
}

export function ReceivableFormDialog({ open, onOpenChange, receivable }: Props) {
  const t = useTranslations("receivables");
  const tc = useTranslations("common");
  const accounts = useQuery(api.fintrack.accounts.list);
  const userSettings = useQuery(api.fintrack.user_settings.get);
  const createMutation = useMutation(api.fintrack.receivables.create);
  const updateMutation = useMutation(api.fintrack.receivables.update);

  const isEdit = !!receivable;

  const [debtorName, setDebtorName] = useState(receivable?.debtorName ?? "");
  const [description, setDescription] = useState(receivable?.description ?? "");
  const [currency, setCurrency] = useState(receivable?.currencyCode ?? "USD");
  const [amount, setAmount] = useState(receivable ? String(receivable.originalAmount / 100) : "");
  const [originDate, setOriginDate] = useState(tsToDateInput(receivable?.originDate));
  const [dueDate, setDueDate] = useState(tsToDateInput(receivable?.dueDate));
  const [interestRate, setInterestRate] = useState(receivable?.interestRate ? String(receivable.interestRate / 100) : "");
  const [periodicity, setPeriodicity] = useState<Periodicity | "none">(receivable?.paymentPeriodicity ?? "none");
  const [notes, setNotes] = useState(receivable?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && !isEdit) {
      setCurrency(userSettings?.defaultCurrency ?? "USD");
    }
  }, [open, userSettings, isEdit]);

  const currencyOptions = [...new Set([
    userSettings?.defaultCurrency ?? "USD",
    ...(accounts ?? []).map((a: Doc<"fintrack_accounts">) => a.currencyCode),
  ])];

  const reset = () => {
    setDebtorName(receivable?.debtorName ?? "");
    setDescription(receivable?.description ?? "");
    setCurrency(receivable?.currencyCode ?? userSettings?.defaultCurrency ?? "USD");
    setAmount(receivable ? String(receivable.originalAmount / 100) : "");
    setOriginDate(tsToDateInput(receivable?.originDate));
    setDueDate(tsToDateInput(receivable?.dueDate));
    setInterestRate(receivable?.interestRate ? String(receivable.interestRate / 100) : "");
    setPeriodicity(receivable?.paymentPeriodicity ?? "none");
    setNotes(receivable?.notes ?? "");
    setError("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!debtorName.trim()) { setError("Debtor name is required"); return; }
    if (!description.trim()) { setError("Description is required"); return; }
    if (!isEdit && !originDate) { setError("Origin date is required"); return; }

    const amountFloat = Number(amount);
    const amountCents = Number.isFinite(amountFloat) ? dollarsToCents(amountFloat) : 0;
    if (!isEdit && amountCents <= 0) { setError("Amount must be greater than 0"); return; }

    const interestRateNum = interestRate !== "" ? Number(interestRate) : undefined;
    if (interestRateNum !== undefined && (!Number.isFinite(interestRateNum) || interestRateNum < 0 || interestRateNum > 1000)) {
      setError("Interest rate must be between 0% and 1000%"); return;
    }
    const interestRateBps = interestRateNum !== undefined ? Math.round(interestRateNum * 100) : undefined;

    setLoading(true);
    try {
      if (isEdit) {
        await updateMutation({
          id: receivable._id,
          debtorName: debtorName.trim(),
          description: description.trim(),
          // null → backend elimina el campo; undefined no se enviará nunca aquí
          dueDate: dueDate ? new Date(dueDate).getTime() : null,
          interestRate: interestRateBps !== undefined ? interestRateBps : null,
          paymentPeriodicity: periodicity !== "none" ? periodicity : null,
          notes: notes.trim() || null,
        });
      } else {
        await createMutation({
          debtorName: debtorName.trim(),
          description: description.trim(),
          originalAmount: amountCents,
          currencyCode: currency.toUpperCase().trim(),
          originDate: new Date(originDate).getTime(),
          // create acepta v.optional(v.number()), no null
          dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
          interestRate: interestRateBps,
          paymentPeriodicity: periodicity !== "none" ? periodicity : undefined,
          notes: notes.trim() || undefined,
        });
      }
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
            {isEdit ? t("editReceivable") : t("addReceivable")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Debtor + Description */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("debtorName")}</Label>
              <Input value={debtorName} onChange={(e) => setDebtorName(e.target.value)}
                placeholder="e.g. John Doe" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("currency")}</Label>
              <Select value={currency} onValueChange={(v) => { if (v) setCurrency(v); }} disabled={isEdit}>
                <SelectTrigger className="w-full" style={inputStyle}>
                  <SelectValue>{currency}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((code) => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>{t("description")}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Personal loan for car repair" style={inputStyle} />
          </div>

          {/* Amount (create only) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("originalAmount")}</Label>
              <Input type="number" min="0.01" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle} />
            </div>
          )}

          {/* Origin Date + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("originDate")}</Label>
              <Input type="date" value={originDate} onChange={(e) => setOriginDate(e.target.value)}
                style={inputStyle} disabled={isEdit} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("dueDate")}</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Interest Rate + Periodicity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("interestRate")}</Label>
              <Input type="number" min="0" max="1000" step="0.01" value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)} placeholder="0.00" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("periodicity")}</Label>
              <Select value={periodicity} onValueChange={(v) => setPeriodicity(v as Periodicity | "none")}>
                <SelectTrigger className="w-full" style={inputStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="monthly">{t("periodicity_monthly")}</SelectItem>
                  <SelectItem value="one_time">{t("periodicity_one_time")}</SelectItem>
                  <SelectItem value="irregular">{t("periodicity_irregular")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>{t("notes")}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes…" style={inputStyle} />
          </div>

          {error && <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={loading}
              style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>
              {loading ? tc("loading") : isEdit ? tc("save") : t("addReceivable")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
