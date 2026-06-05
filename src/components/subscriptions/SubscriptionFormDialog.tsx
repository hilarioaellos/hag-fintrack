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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Doc, Id } from "@convex-api/dataModel";

type Subscription = Doc<"fintrack_subscriptions">;
type Periodicity = "monthly" | "quarterly" | "annual" | "weekly";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription?: Subscription;
}

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

function tsToDateInput(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export function SubscriptionFormDialog({ open, onOpenChange, subscription }: Props) {
  const t = useTranslations("subscriptions");
  const tc = useTranslations("common");
  const accounts = useQuery(api.fintrack.accounts.list);
  const categories = useQuery(api.fintrack.categories.listActive);
  const createMutation = useMutation(api.fintrack.subscriptions.create);
  const updateMutation = useMutation(api.fintrack.subscriptions.update);

  const isEdit = !!subscription;

  const defaultRenewal = tsToDateInput(subscription?.nextRenewalDate ?? Date.now());

  const [name, setName] = useState(subscription?.name ?? "");
  const [amount, setAmount] = useState(subscription ? String(subscription.amount / 100) : "");
  const [currency, setCurrency] = useState(subscription?.currencyCode ?? "USD");
  const [periodicity, setPeriodicity] = useState<Periodicity>(subscription?.periodicity ?? "monthly");
  const [nextRenewal, setNextRenewal] = useState(defaultRenewal);
  const [accountId, setAccountId] = useState<string>(subscription?.accountId ?? "");
  const [categoryId, setCategoryId] = useState<string>(subscription?.categoryId ?? "none");
  const [notes, setNotes] = useState(subscription?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setName(subscription?.name ?? "");
    setAmount(subscription ? String(subscription.amount / 100) : "");
    setCurrency(subscription?.currencyCode ?? "USD");
    setPeriodicity(subscription?.periodicity ?? "monthly");
    setNextRenewal(tsToDateInput(subscription?.nextRenewalDate ?? Date.now()));
    setAccountId(subscription?.accountId ?? "");
    setCategoryId(subscription?.categoryId ?? "none");
    setNotes(subscription?.notes ?? "");
    setError("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Service name is required"); return; }
    if (!accountId) { setError("Account is required"); return; }
    if (!nextRenewal) { setError("Next renewal date is required"); return; }

    const amountFloat = Number(amount);
    const amountCents = Number.isFinite(amountFloat) ? dollarsToCents(amountFloat) : 0;
    if (amountCents <= 0) { setError("Amount must be greater than 0"); return; }

    const nextRenewalTs = new Date(nextRenewal).getTime();
    const resolvedCategoryId = categoryId !== "none" ? (categoryId as Id<"fintrack_categories">) : undefined;

    setLoading(true);
    try {
      if (isEdit) {
        await updateMutation({
          id: subscription._id,
          name: name.trim(),
          amount: amountCents,
          currencyCode: currency.toUpperCase().trim(),
          periodicity,
          nextRenewalDate: nextRenewalTs,
          accountId: accountId as Id<"fintrack_accounts">,
          categoryId: resolvedCategoryId ?? null,
          notes: notes.trim() || null,
        });
      } else {
        await createMutation({
          name: name.trim(),
          amount: amountCents,
          currencyCode: currency.toUpperCase().trim(),
          periodicity,
          nextRenewalDate: nextRenewalTs,
          accountId: accountId as Id<"fintrack_accounts">,
          categoryId: resolvedCategoryId,
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
            {isEdit ? t("editSubscription") : t("addSubscription")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Name + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Netflix" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("currency")}</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)}
                placeholder="USD" maxLength={3} className="uppercase" style={inputStyle} />
            </div>
          </div>

          {/* Amount + Periodicity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("amount")}</Label>
              <Input type="number" min="0.01" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("periodicity")}</Label>
              <Select value={periodicity} onValueChange={(v) => setPeriodicity(v as Periodicity)}>
                <SelectTrigger className="w-full" style={inputStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t("periodicity_monthly")}</SelectItem>
                  <SelectItem value="quarterly">{t("periodicity_quarterly")}</SelectItem>
                  <SelectItem value="annual">{t("periodicity_annual")}</SelectItem>
                  <SelectItem value="weekly">{t("periodicity_weekly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Next Renewal */}
          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>{t("nextRenewal")}</Label>
            <Input type="date" value={nextRenewal}
              onChange={(e) => setNextRenewal(e.target.value)} style={inputStyle} />
          </div>

          {/* Account */}
          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>{t("account")}</Label>
            <Select value={accountId} onValueChange={(v) => { if (v) setAccountId(v); }}>
              <SelectTrigger className="w-full" style={inputStyle}>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {(accounts ?? []).map((a: Doc<"fintrack_accounts">) => (
                  <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category (optional) */}
          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>{t("category")}</Label>
            <Select value={categoryId} onValueChange={(v) => { if (v !== null) setCategoryId(v); }}>
              <SelectTrigger className="w-full" style={inputStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noCategory")}</SelectItem>
                {(categories ?? []).map((c: Doc<"fintrack_categories">) => (
                  <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {loading ? tc("loading") : isEdit ? tc("save") : t("addSubscription")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
