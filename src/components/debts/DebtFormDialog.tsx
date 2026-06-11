"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { dollarsToCents } from "@/lib/money";
import { toLocalDateInputOpt, dateInputToTimestamp } from "@/lib/dates";
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

type Debt = Doc<"fintrack_debts">;
type DebtType = Debt["type"];
type Periodicity = "monthly" | "biweekly" | "weekly" | "one_time";

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

const tsToDateInput = toLocalDateInputOpt;

export function DebtFormDialog({ open, onOpenChange, debt }: Props) {
  const t = useTranslations("debts");
  const tc = useTranslations("common");
  const accounts = useQuery(api.fintrack.accounts.list);
  const userSettings = useQuery(api.fintrack.user_settings.get);
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
  // A7 fields
  const [originDate, setOriginDate] = useState(tsToDateInput(debt?.originDate));
  const [paymentDueDate, setPaymentDueDate] = useState(debt?.paymentDueDate ? String(debt.paymentDueDate) : "");
  const [periodicity, setPeriodicity] = useState<Periodicity | "none">(debt?.paymentPeriodicity ?? "none");
  const [totalTermMonths, setTotalTermMonths] = useState(debt?.totalTermMonths ? String(debt.totalTermMonths) : "");
  const [paidInstallments, setPaidInstallments] = useState(debt?.paidInstallments ? String(debt.paidInstallments) : "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Set currency when dialog opens in create mode
  useEffect(() => {
    if (open && !isEdit) {
      setCurrency(userSettings?.defaultCurrency ?? "USD");
    }
  }, [open, userSettings, isEdit]);

  const currencyOptions = [...new Set([
    userSettings?.defaultCurrency ?? "USD",
    ...(accounts ?? []).map((a: Doc<"fintrack_accounts">) => a.currencyCode),
  ])];

  const currentType = isEdit ? debt.type : type;

  const reset = () => {
    setName(debt?.name ?? "");
    setLender(debt?.lender ?? "");
    setType(debt?.type ?? "installment");
    setCurrency(debt?.currencyCode ?? userSettings?.defaultCurrency ?? "USD");
    setBalance(debt ? String(debt.balanceCents / 100) : "");
    setApr(debt ? String(debt.interestRateBps / 100) : "");
    setMonthly(debt ? String(debt.monthlyPaymentCents / 100) : "");
    setOriginDate(tsToDateInput(debt?.originDate));
    setPaymentDueDate(debt?.paymentDueDate ? String(debt.paymentDueDate) : "");
    setPeriodicity(debt?.paymentPeriodicity ?? "none");
    setTotalTermMonths(debt?.totalTermMonths ? String(debt.totalTermMonths) : "");
    setPaidInstallments(debt?.paidInstallments ? String(debt.paidInstallments) : "");
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

    if (!name.trim()) { setError(t("errorNameRequired")); return; }
    if (!lender.trim()) { setError(t("errorLenderRequired")); return; }
    if (balanceCents <= 0) { setError(t("errorBalanceRequired")); return; }
    if (aprFloat < 0 || aprFloat > 1000) { setError(t("errorAprRange")); return; }
    if (monthlyPaymentCents <= 0) { setError(t("errorMonthlyRequired")); return; }

    const paymentDueDateNum = paymentDueDate !== "" ? Number(paymentDueDate) : undefined;
    if (paymentDueDateNum !== undefined && (!Number.isInteger(paymentDueDateNum) || isNaN(paymentDueDateNum) || paymentDueDateNum < 1 || paymentDueDateNum > 31)) {
      setError(t("errorPaymentDueDayRange")); return;
    }
    const totalTermNum = totalTermMonths !== "" ? Number(totalTermMonths) : undefined;
    const paidNum = paidInstallments !== "" ? Number(paidInstallments) : undefined;
    if (totalTermNum !== undefined && (!Number.isInteger(totalTermNum) || isNaN(totalTermNum) || totalTermNum < 1)) {
      setError(t("errorTotalTermMin")); return;
    }
    if (paidNum !== undefined && (!Number.isInteger(paidNum) || isNaN(paidNum) || paidNum < 0)) {
      setError(t("errorPaidInstallmentsNonNegative")); return;
    }
    if (paidNum !== undefined && totalTermNum !== undefined && paidNum > totalTermNum) {
      setError(t("errorPaidExceedsTerm")); return;
    }

    // Para deudas revolving, no enviar campos exclusivos de installment
    const isInstallment = currentType === "installment";
    const a7 = {
      originDate: originDate ? dateInputToTimestamp(originDate) : undefined,
      paymentDueDate: paymentDueDateNum,
      paymentPeriodicity: periodicity !== "none" ? (periodicity as Periodicity) : undefined,
      totalTermMonths: isInstallment ? totalTermNum : undefined,
      paidInstallments: isInstallment ? paidNum : undefined,
    };

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
          ...a7,
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
          ...a7,
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
          {/* Name + Lender */}
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

          {/* Type (create only) */}
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

          {/* Balance + APR + Monthly */}
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

          {/* A7: Origin Date + Due Day */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("originDate")}</Label>
              <Input type="date" value={originDate} onChange={(e) => setOriginDate(e.target.value)} style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>
                {t("paymentDueDate")}
                <span className="ml-1 text-[10px]" style={{ color: "var(--color-ft-text-3)" }}>
                  {t("paymentDueDateHint")}
                </span>
              </Label>
              <Input type="number" min="1" max="31" step="1" value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)} placeholder="15" style={inputStyle} />
            </div>
          </div>

          {/* A7: Periodicity */}
          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>{t("periodicity")}</Label>
            <Select value={periodicity} onValueChange={(v) => setPeriodicity(v as Periodicity | "none")}>
              <SelectTrigger className="w-full" style={inputStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="monthly">{t("periodicity_monthly")}</SelectItem>
                <SelectItem value="biweekly">{t("periodicity_biweekly")}</SelectItem>
                <SelectItem value="weekly">{t("periodicity_weekly")}</SelectItem>
                <SelectItem value="one_time">{t("periodicity_one_time")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* A7: Term + Progress — installment only */}
          {currentType === "installment" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label style={{ color: "var(--color-ft-text-2)" }}>{t("totalTermMonths")}</Label>
                <Input type="number" min="1" step="1" value={totalTermMonths}
                  onChange={(e) => setTotalTermMonths(e.target.value)} placeholder="36" style={inputStyle} />
              </div>
              <div className="space-y-1.5">
                <Label style={{ color: "var(--color-ft-text-2)" }}>{t("paidInstallments")}</Label>
                <Input type="number" min="0" step="1" value={paidInstallments}
                  onChange={(e) => setPaidInstallments(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
            </div>
          )}

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
