"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { dollarsToCents } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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

type Transaction = Doc<"fintrack_transactions">;
type TxType = "income" | "expense" | "transfer";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction;
  defaultAccountId?: string;
}

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  defaultAccountId,
}: Props) {
  const t = useTranslations("transactions");
  const tc = useTranslations("common");

  const accounts = useQuery(api.fintrack.accounts.list);
  const categories = useQuery(api.fintrack.categories.listActive);
  const seedCategories = useMutation(api.fintrack.categories.seed);
  const createMutation = useMutation(api.fintrack.transactions.create);
  const createSharedMutation = useMutation(api.fintrack.transactions.createShared);
  const updateMutation = useMutation(api.fintrack.transactions.update);

  const isEdit = !!transaction;

  // Use local date (not UTC) so dates near midnight don't shift by one day for US timezones
  const toLocalISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayISO = toLocalISO(new Date());

  const [type, setType] = useState<TxType>(
    (transaction?.type as TxType) ?? "expense"
  );
  const [toAccountId, setToAccountId] = useState(transaction?.transferToAccountId ?? "");
  const [amount, setAmount] = useState(
    transaction ? String(Math.abs(transaction.amountCents) / 100) : ""
  );
  const [accountId, setAccountId] = useState(
    transaction?.accountId ?? defaultAccountId ?? ""
  );
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [date, setDate] = useState(
    transaction ? toLocalISO(new Date(transaction.date)) : todayISO
  );
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [isShared, setIsShared] = useState(false);
  const [sharedAmount, setSharedAmount] = useState("");
  const [debtorName, setDebtorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Seed categories once when dialog opens (initializeSettings runs at AppShell level)
  useEffect(() => {
    if (open && categories !== undefined && categories.length === 0) {
      seedCategories();
    }
  }, [open, categories, seedCategories]);

  const reset = () => {
    setType((transaction?.type as TxType) ?? "expense");
    setToAccountId(transaction?.transferToAccountId ?? "");
    setAmount(transaction ? String(Math.abs(transaction.amountCents) / 100) : "");
    setAccountId(transaction?.accountId ?? defaultAccountId ?? "");
    setCategoryId(transaction?.categoryId ?? "");
    setDate(transaction ? toLocalISO(new Date(transaction.date)) : todayISO);
    setNotes(transaction?.notes ?? "");
    setIsShared(false);
    setSharedAmount("");
    setDebtorName("");
    setError("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!accountId) { setError("Select an account"); return; }
    if (type === "transfer" && !toAccountId) { setError("Select destination account"); return; }
    if (type === "transfer" && toAccountId === accountId) { setError("Origin and destination must be different"); return; }
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid amount"); return; }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) { setError("Enter a valid amount"); return; }

    if (!isEdit && isShared && type === "expense") {
      if (!debtorName.trim()) { setError(t("sharedDebtorRequired")); return; }
      const sharedNum = Number(sharedAmount);
      if (!Number.isFinite(sharedNum) || sharedNum <= 0) { setError(t("sharedAmountInvalid")); return; }
      if (sharedNum >= amountNum) { setError(t("sharedAmountTooLarge")); return; }
    }

    const amountCents = dollarsToCents(amountNum);
    const dateTs = new Date(date + "T12:00:00").getTime();

    setLoading(true);
    try {
      if (isEdit) {
        await updateMutation({
          id: transaction._id,
          amountCents,
          type,
          categoryId: categoryId as Doc<"fintrack_categories">["_id"] | undefined || undefined,
          transferToAccountId: type === "transfer"
            ? (toAccountId as Doc<"fintrack_accounts">["_id"] || undefined)
            : undefined,
          date: dateTs,
          notes: notes.trim() || undefined,
        });
      } else if (isShared && type === "expense") {
        await createSharedMutation({
          accountId: accountId as Doc<"fintrack_accounts">["_id"],
          amountCents,
          categoryId: categoryId as Doc<"fintrack_categories">["_id"] | undefined || undefined,
          date: dateTs,
          notes: notes.trim() || undefined,
          sharedAmountCents: dollarsToCents(Number(sharedAmount)),
          debtorName: debtorName.trim(),
        });
      } else {
        const selectedAccount = accounts?.find((a: Doc<"fintrack_accounts">) => a._id === accountId);
        await createMutation({
          accountId: accountId as Doc<"fintrack_accounts">["_id"],
          amountCents,
          currencyCode: selectedAccount?.currencyCode ?? "USD",
          type,
          categoryId: categoryId as Doc<"fintrack_categories">["_id"] | undefined || undefined,
          transferToAccountId: type === "transfer"
            ? (toAccountId as Doc<"fintrack_accounts">["_id"])
            : undefined,
          date: dateTs,
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

  const selectedCat = categoryId
    ? categories?.find((c: Doc<"fintrack_categories">) => c._id === categoryId)
    : undefined;
  const categoryLabel = categoryId
    ? (selectedCat ? `${selectedCat.icon} ${selectedCat.name}` : categories === undefined ? "Loading…" : "Uncategorized")
    : "Uncategorized";

  const typeColor =
    type === "income"
      ? "var(--color-ft-good)"
      : type === "transfer"
      ? "var(--color-ft-primary)"
      : "var(--color-ft-bad)";

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
            {isEdit ? t("editTransaction") : t("addTransaction")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Type toggle — transfer is locked in edit mode (account selectors not shown) */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--color-ft-border)" }}>
            {([
              { value: "expense",  label: t("expense"),  active: "var(--color-ft-bad)"  },
              { value: "income",   label: t("income"),   active: "var(--color-ft-good)" },
              { value: "transfer", label: "Transfer",    active: "var(--color-ft-primary)" },
            ] as { value: TxType; label: string; active: string }[]).map((opt) => {
              // In edit mode: can flip expense↔income, but can't switch to/from transfer
              const isTransferLocked =
                isEdit &&
                ((opt.value === "transfer" && transaction?.type !== "transfer") ||
                  (opt.value !== "transfer" && transaction?.type === "transfer"));
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !isTransferLocked && setType(opt.value)}
                  disabled={isTransferLocked}
                  className="flex-1 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: type === opt.value ? opt.active : "var(--color-ft-surface-2)",
                    color: type === opt.value ? (opt.value === "transfer" ? "#080d18" : "#fff") : "var(--color-ft-text-2)",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>{t("amount")}</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={{ ...inputStyle, color: typeColor, fontWeight: 600 }}
            />
          </div>

          {/* Account */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>
                {type === "transfer" ? "From account" : "Account"}
              </Label>
              <Select value={accountId} onValueChange={(v) => { if (v) setAccountId(v); }}>
                <SelectTrigger className="w-full" style={inputStyle}>
                  <SelectValue>
                    {accountId && accounts
                      ? (accounts.find((a: Doc<"fintrack_accounts">) => a._id === accountId)?.name ?? "Select account")
                      : "Select account"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((a: Doc<"fintrack_accounts">) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* To Account — only for transfers */}
          {!isEdit && type === "transfer" && (
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>To account</Label>
              <Select value={toAccountId} onValueChange={(v) => { if (v) setToAccountId(v); }}>
                <SelectTrigger className="w-full" style={inputStyle}>
                  <SelectValue>
                    {toAccountId && accounts
                      ? (accounts.find((a: Doc<"fintrack_accounts">) => a._id === toAccountId)?.name ?? "Select destination")
                      : "Select destination"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    ?.filter((a: Doc<"fintrack_accounts">) => a._id !== accountId)
                    .map((a: Doc<"fintrack_accounts">) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Category */}
          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>
              {t("category")} <span style={{ color: "var(--color-ft-text-3)" }}>(optional)</span>
            </Label>
            <Select value={categoryId} onValueChange={(v) => { if (v) setCategoryId(v); }}>
              <SelectTrigger className="w-full" style={inputStyle}>
                <SelectValue>
                  {categoryLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories?.map((c: Doc<"fintrack_categories">) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>{t("date")}</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>
              {t("notes")} <span style={{ color: "var(--color-ft-text-3)" }}>(optional)</span>
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Description..."
              style={inputStyle}
            />
          </div>

          {/* Shared expense toggle — only for new expenses */}
          {!isEdit && type === "expense" && (
            <div
              className="rounded-lg border p-3 space-y-3"
              style={{ borderColor: "var(--color-ft-border)", backgroundColor: isShared ? "color-mix(in srgb, var(--color-ft-primary) 5%, transparent)" : "transparent" }}
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="accent-[var(--color-ft-primary)]"
                />
                <span className="text-sm font-medium" style={{ color: "var(--color-ft-text-2)" }}>
                  {t("sharedExpense")}
                </span>
              </label>
              {isShared && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <Label style={{ color: "var(--color-ft-text-2)" }}>{t("sharedDebtor")}</Label>
                    <Input
                      value={debtorName}
                      onChange={(e) => setDebtorName(e.target.value)}
                      placeholder={t("sharedDebtorPlaceholder")}
                      style={inputStyle}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label style={{ color: "var(--color-ft-text-2)" }}>{t("sharedAmount")}</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={sharedAmount}
                      onChange={(e) => setSharedAmount(e.target.value)}
                      placeholder="0.00"
                      style={inputStyle}
                    />
                    <p className="text-[11px]" style={{ color: "var(--color-ft-text-3)" }}>
                      {t("sharedAmountHint")}
                    </p>
                  </div>
                </div>
              )}
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
              {loading ? tc("loading") : isEdit ? tc("save") : t("addTransaction")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
