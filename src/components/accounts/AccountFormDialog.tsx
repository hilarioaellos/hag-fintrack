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
type AccountType = Account["type"];

const ACCOUNT_TYPES: AccountType[] = [
  "checking",
  "savings",
  "investment",
  "credit",
  "cash",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
}

export function AccountFormDialog({ open, onOpenChange, account }: Props) {
  const t = useTranslations("accounts");
  const tc = useTranslations("common");
  const createMutation = useMutation(api.fintrack.accounts.create);
  const updateMutation = useMutation(api.fintrack.accounts.update);

  const isEdit = !!account;

  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "checking");
  const [bankName, setBankName] = useState(account?.bankName ?? "");
  const [initialBalance, setInitialBalance] = useState(
    account ? String(account.initialBalanceCents / 100) : ""
  );
  const [currency, setCurrency] = useState(account?.currencyCode ?? "USD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setName(account?.name ?? "");
    setType(account?.type ?? "checking");
    setBankName(account?.bankName ?? "");
    setInitialBalance(account ? String(account.initialBalanceCents / 100) : "");
    setCurrency(account?.currencyCode ?? "USD");
    setError("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
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
    setLoading(true);
    try {
      if (isEdit) {
        await updateMutation({
          id: account._id,
          name: name.trim(),
          bankName: bankName.trim() || undefined,
        });
      } else {
        const balanceCents = dollarsToCents(parseFloat(initialBalance) || 0);
        await createMutation({
          name: name.trim(),
          type,
          currencyCode: currency.toUpperCase().trim(),
          bankName: bankName.trim() || undefined,
          initialBalanceCents: balanceCents,
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
            {isEdit ? "Edit Account" : t("addAccount")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Checking"
              required
              style={{
                backgroundColor: "var(--color-ft-surface-2)",
                borderColor: "var(--color-ft-border)",
                color: "var(--color-ft-text)",
              }}
            />
          </div>

          {/* Type — only on create */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => { if (v) setType(v as AccountType); }}
              >
                <SelectTrigger
                  className="w-full"
                  style={{
                    backgroundColor: "var(--color-ft-surface-2)",
                    borderColor: "var(--color-ft-border)",
                    color: "var(--color-ft-text)",
                  }}
                >
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
              Bank Name <span style={{ color: "var(--color-ft-text-3)" }}>(optional)</span>
            </Label>
            <Input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Chase"
              style={{
                backgroundColor: "var(--color-ft-surface-2)",
                borderColor: "var(--color-ft-border)",
                color: "var(--color-ft-text)",
              }}
            />
          </div>

          {/* Initial balance + currency — only on create */}
          {!isEdit && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label style={{ color: "var(--color-ft-text-2)" }}>Initial Balance</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0.00"
                  style={{
                    backgroundColor: "var(--color-ft-surface-2)",
                    borderColor: "var(--color-ft-border)",
                    color: "var(--color-ft-text)",
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label style={{ color: "var(--color-ft-text-2)" }}>Currency</Label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="USD"
                  maxLength={3}
                  className="uppercase"
                  style={{
                    backgroundColor: "var(--color-ft-surface-2)",
                    borderColor: "var(--color-ft-border)",
                    color: "var(--color-ft-text)",
                  }}
                />
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
