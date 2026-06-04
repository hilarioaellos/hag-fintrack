"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { dollarsToCents } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
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

type CreditCard = Doc<"fintrack_credit_cards"> & {
  account: Doc<"fintrack_accounts"> | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CreditCard;
}

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

export function CreditCardFormDialog({ open, onOpenChange, card }: Props) {
  const t = useTranslations("cards");
  const tc = useTranslations("common");
  const accounts = useQuery(api.fintrack.accounts.list);
  const createMutation = useMutation(api.fintrack.cards.create);
  const updateMutation = useMutation(api.fintrack.cards.update);

  const isEdit = !!card;
  const creditAccounts = accounts?.filter((a: Doc<"fintrack_accounts">) => a.type === "credit") ?? [];

  const [accountId, setAccountId] = useState(card?.accountId ?? "");
  const [closingDay, setClosingDay] = useState(String(card?.closingDay ?? ""));
  const [paymentDueDay, setPaymentDueDay] = useState(String(card?.paymentDueDay ?? ""));
  const [creditLimit, setCreditLimit] = useState(
    card ? String(card.creditLimitCents / 100) : ""
  );
  const [minPayment, setMinPayment] = useState(
    card ? String(card.minimumPaymentCents / 100) : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setAccountId(card?.accountId ?? "");
    setClosingDay(String(card?.closingDay ?? ""));
    setPaymentDueDay(String(card?.paymentDueDay ?? ""));
    setCreditLimit(card ? String(card.creditLimitCents / 100) : "");
    setMinPayment(card ? String(card.minimumPaymentCents / 100) : "");
    setError("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const closingRaw = Number(closingDay);
    const dueDayRaw = Number(paymentDueDay);
    const closing = Math.trunc(closingRaw);
    const dueDay = Math.trunc(dueDayRaw);
    const limitCents = dollarsToCents(parseFloat(creditLimit) || 0);
    const minCents = dollarsToCents(parseFloat(minPayment) || 0);

    if (!Number.isInteger(closingRaw) || closing < 1 || closing > 28) {
      setError("Closing day must be a whole number between 1 and 28");
      return;
    }
    if (!Number.isInteger(dueDayRaw) || dueDay < 1 || dueDay > 28) {
      setError("Due day must be a whole number between 1 and 28");
      return;
    }
    if (limitCents <= 0) {
      setError("Credit limit must be greater than 0");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await updateMutation({
          id: card._id,
          closingDay: closing,
          paymentDueDay: dueDay,
          creditLimitCents: limitCents,
          minimumPaymentCents: minCents,
        });
      } else {
        if (!accountId) {
          setError("Select an account");
          setLoading(false);
          return;
        }
        await createMutation({
          accountId: accountId as Doc<"fintrack_accounts">["_id"],
          closingDay: closing,
          paymentDueDay: dueDay,
          creditLimitCents: limitCents,
          minimumPaymentCents: minCents,
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
      <DialogContent
        style={{
          backgroundColor: "var(--color-ft-surface)",
          borderColor: "var(--color-ft-border)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--color-ft-text)" }}>
            {isEdit ? t("editCard") : t("addCard")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Account selector — create only */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("account")}</Label>
              {creditAccounts.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>
                  {t("noCreditAccounts")}
                </p>
              ) : (
                <Select value={accountId} onValueChange={(v) => { if (v) setAccountId(v); }}>
                  <SelectTrigger className="w-full" style={inputStyle}>
                    <SelectValue placeholder={t("selectAccount")} />
                  </SelectTrigger>
                  <SelectContent>
                    {creditAccounts.map((a: Doc<"fintrack_accounts">) => (
                      <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Closing + Due days */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>
                {t("closingDay")} <span style={{ color: "var(--color-ft-text-3)" }}>(1–28)</span>
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
                {t("dueDay")} <span style={{ color: "var(--color-ft-text-3)" }}>(1–28)</span>
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

          {/* Credit limit + Min payment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("creditLimit")}</Label>
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
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("minPayment")}</Label>
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
              {loading ? tc("loading") : isEdit ? tc("save") : t("addCard")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
