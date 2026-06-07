"use client";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { dollarsToCents } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Doc } from "@convex-api/dataModel";

type Account = Doc<"fintrack_accounts">;
type CreditCard = Doc<"fintrack_credit_cards">;
type AccountType = Account["type"];

const ACCOUNT_TYPES: AccountType[] = [
  "checking",
  "savings",
  "investment",
  "credit",
  "cash",
];

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
  card?: CreditCard;
}

export function AccountFormDialog({ open, onOpenChange, account, card }: Props) {
  const t = useTranslations("accounts");
  const tc = useTranslations("common");
  const tcard = useTranslations("cards");
  const createAccount = useMutation(api.fintrack.accounts.create);
  const updateAccount = useMutation(api.fintrack.accounts.update);
  const createWithCard = useMutation(api.fintrack.accounts.createWithCard);
  const updateWithCard = useMutation(api.fintrack.accounts.updateWithCard);

  const isEdit = !!account;

  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "checking");
  const [bankName, setBankName] = useState(account?.bankName ?? "");
  const [initialBalance, setInitialBalance] = useState(
    account ? String(account.initialBalanceCents / 100) : ""
  );
  const [currency, setCurrency] = useState(account?.currencyCode ?? "USD");

  // Credit card fields
  const [closingDay, setClosingDay] = useState(card ? String(card.closingDay) : "");
  const [paymentDueDay, setPaymentDueDay] = useState(card ? String(card.paymentDueDay) : "");
  const [creditLimit, setCreditLimit] = useState(card ? String(card.creditLimitCents / 100) : "");
  const [minPayment, setMinPayment] = useState(card ? String(card.minimumPaymentCents / 100) : "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isCreditType = isEdit ? account!.type === "credit" : type === "credit";

  // Re-sync card fields when card prop changes (dialog reopen with different account)
  useEffect(() => {
    if (open) {
      setName(account?.name ?? "");
      setType(account?.type ?? "checking");
      setBankName(account?.bankName ?? "");
      setInitialBalance(account ? String(account.initialBalanceCents / 100) : "");
      setCurrency(account?.currencyCode ?? "USD");
      setClosingDay(card ? String(card.closingDay) : "");
      setPaymentDueDay(card ? String(card.paymentDueDay) : "");
      setCreditLimit(card ? String(card.creditLimitCents / 100) : "");
      setMinPayment(card ? String(card.minimumPaymentCents / 100) : "");
      setError("");
    }
  }, [open, account, card]);

  const handleOpenChange = (o: boolean) => {
    if (!o) setError("");
    onOpenChange(o);
  };

  const validateCardFields = (): string | null => {
    const closing = Number(closingDay);
    const due = Number(paymentDueDay);
    const limit = dollarsToCents(parseFloat(creditLimit) || 0);
    const minPay = dollarsToCents(parseFloat(minPayment) || 0);
    if (!Number.isInteger(closing) || closing < 1 || closing > 28) return "Closing day must be 1–28";
    if (!Number.isInteger(due) || due < 1 || due > 28) return "Due day must be 1–28";
    if (limit <= 0) return "Credit limit must be greater than 0";
    if (minPay <= 0) return "Min. payment must be greater than 0";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Name is required"); return; }

    if (!isEdit) {
      const normalized = currency.toUpperCase().trim();
      if (!/^[A-Z]{3}$/.test(normalized)) {
        setError("Currency must be a 3-letter ISO code (e.g. USD, MXN, EUR)");
        return;
      }
      try {
        new Intl.NumberFormat("en-US", { style: "currency", currency: normalized });
      } catch {
        setError(`"${normalized}" is not a valid currency code`);
        return;
      }
    }

    if (isCreditType) {
      const cardErr = validateCardFields();
      if (cardErr) { setError(cardErr); return; }
    }


    setLoading(true);
    try {
      if (isEdit) {
        if (account.type === "credit") {
          const closing = Math.trunc(Number(closingDay));
          const due = Math.trunc(Number(paymentDueDay));
          await updateWithCard({
            id: account._id,
            name: name.trim(),
            bankName: bankName.trim() || undefined,
            closingDay: closing,
            paymentDueDay: due,
            creditLimitCents: dollarsToCents(parseFloat(creditLimit) || 0),
            minimumPaymentCents: dollarsToCents(parseFloat(minPayment) || 0),
          });
        } else {
          await updateAccount({
            id: account._id,
            name: name.trim(),
            bankName: bankName.trim() || undefined,
          });
        }
      } else {
        const balanceCents = dollarsToCents(parseFloat(initialBalance) || 0);
        if (type === "credit") {
          const closing = Math.trunc(Number(closingDay));
          const due = Math.trunc(Number(paymentDueDay));
          await createWithCard({
            name: name.trim(),
            currencyCode: currency.toUpperCase().trim(),
            bankName: bankName.trim() || undefined,
            initialBalanceCents: balanceCents,
            closingDay: closing,
            paymentDueDay: due,
            creditLimitCents: dollarsToCents(parseFloat(creditLimit) || 0),
            minimumPaymentCents: dollarsToCents(parseFloat(minPayment) || 0),
          });
        } else {
          await createAccount({
            name: name.trim(),
            type,
            currencyCode: currency.toUpperCase().trim(),
            bankName: bankName.trim() || undefined,
            initialBalanceCents: balanceCents,
          });
        }
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
      <DialogContent
        style={{
          backgroundColor: "var(--color-ft-surface)",
          borderColor: "var(--color-ft-border)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--color-ft-text)" }}>
            {isEdit ? t("editAccount") : t("addAccount")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>{t("name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Checking"
              required
              style={inputStyle}
            />
          </div>

          {/* Type — only on create */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("type.label")}</Label>
              <Select
                value={type}
                onValueChange={(v) => { if (v) setType(v as AccountType); }}
              >
                <SelectTrigger className="w-full" style={inputStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((at) => (
                    <SelectItem key={at} value={at}>
                      {t(`type.${at}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Bank Name */}
          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>
              {t("bankName")} <span style={{ color: "var(--color-ft-text-3)" }}>({tc("optional")})</span>
            </Label>
            <Input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Chase"
              style={inputStyle}
            />
          </div>

          {/* Initial balance + currency — only on create */}
          {!isEdit && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label style={{ color: "var(--color-ft-text-2)" }}>{t("initialBalance")}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>
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
            </div>
          )}

          {/* Credit card fields — shown when type is credit */}
          {isCreditType && (
            <div className="space-y-3 pt-1">
              <p className="text-xs font-medium" style={{ color: "var(--color-ft-text-3)" }}>
                {t("creditCardDetails")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label style={{ color: "var(--color-ft-text-2)" }}>
                    {tcard("closingDay")} <span style={{ color: "var(--color-ft-text-3)" }}>(1–28)</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    step="1"
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                    placeholder="25"
                    style={inputStyle}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: "var(--color-ft-text-2)" }}>
                    {tcard("dueDay")} <span style={{ color: "var(--color-ft-text-3)" }}>(1–28)</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    step="1"
                    value={paymentDueDay}
                    onChange={(e) => setPaymentDueDay(e.target.value)}
                    placeholder="15"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label style={{ color: "var(--color-ft-text-2)" }}>{tcard("creditLimit")}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="5000.00"
                    style={inputStyle}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: "var(--color-ft-text-2)" }}>{tcard("minPayment")}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minPayment}
                    onChange={(e) => setMinPayment(e.target.value)}
                    placeholder="25.00"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
            >
              {loading ? tc("loading") : isEdit ? tc("save") : t("addAccount")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
