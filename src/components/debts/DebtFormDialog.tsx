"use client";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { dollarsToCents } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
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

type Debt = Doc<"fintrack_debts">;
type DebtType = Debt["type"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt?: Debt;
}

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

export function DebtFormDialog({ open, onOpenChange, debt }: Props) {
  const t = useTranslations("debts");
  const tc = useTranslations("common");
  const createMutation = useMutation(api.fintrack.debts.create);
  const updateMutation = useMutation(api.fintrack.debts.update);

  const isEdit = !!debt;

  const [name, setName] = useState(debt?.name ?? "");
  const [lender, setLender] = useState(debt?.lender ?? "");
  const [type, setType] = useState<DebtType>(debt?.type ?? "installment");
  const [currency, setCurrency] = useState(debt?.currencyCode ?? "USD");
  const [balance, setBalance] = useState(debt ? String(debt.balanceCents / 100) : "");
  const [apr, setApr] = useState(debt ? String(debt.interestRateBps / 100) : "");
  const [monthly, setMonthly] = useState(debt ? String(debt.monthlyPaymentCents / 100) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setName(debt?.name ?? "");
    setLender(debt?.lender ?? "");
    setType(debt?.type ?? "installment");
    setCurrency(debt?.currencyCode ?? "USD");
    setBalance(debt ? String(debt.balanceCents / 100) : "");
    setApr(debt ? String(debt.interestRateBps / 100) : "");
    setMonthly(debt ? String(debt.monthlyPaymentCents / 100) : "");
    setError("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const balanceCents = dollarsToCents(parseFloat(balance) || 0);
    const aprFloat = parseFloat(apr) || 0;
    const interestRateBps = Math.round(aprFloat * 100);
    const monthlyPaymentCents = dollarsToCents(parseFloat(monthly) || 0);

    if (!name.trim()) { setError("Name is required"); return; }
    if (!lender.trim()) { setError("Lender is required"); return; }
    if (balanceCents <= 0) { setError("Balance must be greater than 0"); return; }
    if (aprFloat < 0 || aprFloat > 1000) { setError("APR must be between 0% and 1000%"); return; }
    if (monthlyPaymentCents <= 0) { setError("Monthly payment must be greater than 0"); return; }

    setLoading(true);
    try {
      if (isEdit) {
        await updateMutation({
          id: debt._id,
          name: name.trim(),
          lender: lender.trim(),
          currencyCode: currency.toUpperCase().trim(),
          balanceCents,
          interestRateBps,
          monthlyPaymentCents,
        });
      } else {
        await createMutation({
          name: name.trim(),
          lender: lender.trim(),
          type,
          currencyCode: currency.toUpperCase().trim(),
          balanceCents,
          interestRateBps,
          monthlyPaymentCents,
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
            {isEdit ? t("editDebt") : t("addDebt")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Visa Card" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("lender")}</Label>
              <Input value={lender} onChange={(e) => setLender(e.target.value)}
                placeholder="e.g. Chase" style={inputStyle} />
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("debtType")}</Label>
              <Select value={type} onValueChange={(v) => { if (v) setType(v as DebtType); }}>
                <SelectTrigger className="w-full" style={inputStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="installment">{t("type.installment")}</SelectItem>
                  <SelectItem value="revolving">{t("type.revolving")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Currency */}
          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>{t("currency")}</Label>
            <Input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="USD"
              maxLength={3}
              className="uppercase"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("balance")}</Label>
              <Input type="number" min="0.01" step="0.01" value={balance}
                onChange={(e) => setBalance(e.target.value)} placeholder="0.00" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("apr")} (%)</Label>
              <Input type="number" min="0" max="1000" step="0.01" value={apr}
                onChange={(e) => setApr(e.target.value)} placeholder="22.99" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("monthlyPayment")}</Label>
              <Input type="number" min="0.01" step="0.01" value={monthly}
                onChange={(e) => setMonthly(e.target.value)} placeholder="0.00" style={inputStyle} />
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={loading}
              style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>
              {loading ? tc("loading") : isEdit ? tc("save") : t("addDebt")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
