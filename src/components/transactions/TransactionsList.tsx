"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Plus, Upload, Trash2, Pencil, Receipt } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionFormDialog } from "./TransactionFormDialog";
import { CSVImportDialog } from "./CSVImportDialog";
import type { Doc } from "@convex-api/dataModel";

type Transaction = Doc<"fintrack_transactions">;

export function TransactionsList() {
  const t = useTranslations("transactions");

  const [filterAccountId, setFilterAccountId] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | undefined>();

  const accounts = useQuery(api.fintrack.accounts.list);
  const categories = useQuery(api.fintrack.categories.list);

  const transactions = useQuery(api.fintrack.transactions.list, {
    accountId:
      filterAccountId !== "all"
        ? (filterAccountId as Doc<"fintrack_accounts">["_id"])
        : undefined,
  });

  const removeMutation = useMutation(api.fintrack.transactions.remove);

  const categoryMap = Object.fromEntries((categories ?? []).map((c: Doc<"fintrack_categories">) => [c._id, c]));
  const accountMap = Object.fromEntries((accounts ?? []).map((a: Doc<"fintrack_accounts">) => [a._id, a]));

  const selectedAccountName =
    filterAccountId === "all"
      ? "All accounts"
      : (accountMap[filterAccountId]?.name ?? "All accounts");

  const totals = (transactions ?? []).reduce(
    (acc: { income: number; expenses: number }, tx: Transaction) => {
      if (tx.type === "income") acc.income += tx.amountCents;
      else if (tx.type === "expense") acc.expenses += Math.abs(tx.amountCents);
      return acc;
    },
    { income: 0, expenses: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        {/* Account filter */}
        <Select
          value={filterAccountId}
          onValueChange={(v) => { if (v) setFilterAccountId(v); }}
        >
          <SelectTrigger
            className="w-[180px] h-9 text-sm"
            style={{
              backgroundColor: "var(--color-ft-surface)",
              borderColor: "var(--color-ft-border)",
              color: "var(--color-ft-text)",
            }}
          >
            <SelectValue>{selectedAccountName}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts?.map((a: Doc<"fintrack_accounts">) => (
              <SelectItem key={a._id} value={a._id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setImportOpen(true)}
            style={{
              borderColor: "var(--color-ft-border)",
              color: "var(--color-ft-text-2)",
            }}
          >
            <Upload className="h-3.5 w-3.5" />
            CSV
          </Button>

          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addTransaction")}
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      {transactions && transactions.length > 0 && (
        <div
          className="flex flex-wrap gap-4 px-4 py-2.5 rounded-xl text-xs"
          style={{ backgroundColor: "var(--color-ft-surface)" }}
        >
          <span style={{ color: "var(--color-ft-text-3)" }}>
            {transactions.length} transactions
          </span>
          <span style={{ color: "var(--color-ft-good)" }}>
            +{formatMoney(totals.income)}
          </span>
          <span style={{ color: "var(--color-ft-bad)" }}>
            -{formatMoney(totals.expenses)}
          </span>
          <span
            style={{
              color:
                totals.income - totals.expenses >= 0
                  ? "var(--color-ft-good)"
                  : "var(--color-ft-bad)",
              fontWeight: 600,
            }}
          >
            Net: {formatMoney(totals.income - totals.expenses)}
          </span>
        </div>
      )}

      {/* Loading */}
      {transactions === undefined && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl animate-pulse"
              style={{ backgroundColor: "var(--color-ft-surface)" }}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {transactions?.length === 0 && (
        <div
          className="rounded-xl border border-dashed flex flex-col items-center justify-center py-16 gap-3"
          style={{ borderColor: "var(--color-ft-border)" }}
        >
          <Receipt className="h-8 w-8" style={{ color: "var(--color-ft-text-3)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--color-ft-text-2)" }}>
            No transactions yet
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setImportOpen(true)}
              style={{ borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-2)" }}
            >
              <Upload className="h-3.5 w-3.5" /> Import CSV
            </Button>
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
            >
              <Plus className="h-3.5 w-3.5" /> {t("addTransaction")}
            </Button>
          </div>
        </div>
      )}

      {/* Transaction list */}
      {transactions && transactions.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: "var(--color-ft-surface)",
            borderColor: "var(--color-ft-border)",
          }}
        >
          {transactions.map((tx: Transaction, i: number) => {
            const cat = tx.categoryId ? categoryMap[tx.categoryId] : undefined;
            const acc = accountMap[tx.accountId];
            const isExpense = tx.type === "expense";
            const amountColor = isExpense
              ? "var(--color-ft-bad)"
              : tx.type === "transfer"
              ? "var(--color-ft-primary)"
              : "var(--color-ft-good)";
            const displayAmount = isExpense
              ? -Math.abs(tx.amountCents)
              : Math.abs(tx.amountCents);

            return (
              <div
                key={tx._id}
                className="flex items-center gap-3 px-4 py-3 group"
                style={{
                  borderTop: i > 0 ? "1px solid var(--color-ft-border)" : undefined,
                }}
              >
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                  style={{ backgroundColor: "var(--color-ft-surface-2)" }}
                >
                  {tx.type === "transfer" ? "↔️" : (cat?.icon ?? "📦")}
                </div>

                {/* Description + meta */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--color-ft-text)" }}
                  >
                    {tx.notes ?? (isExpense ? t("expense") : t("income"))}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
                    {tx.type === "transfer"
                      ? `Transfer · ${acc?.name ?? ""}`
                      : `${cat?.name ?? "Uncategorized"} · ${acc?.name ?? ""}`}
                    {" · "}{format(new Date(tx.date), "MMM d, yyyy")}
                    {tx.source === "csv" && (
                      <span className="ml-1 opacity-50">[csv]</span>
                    )}
                  </p>
                </div>

                {/* Amount */}
                <p
                  className="ft-num text-sm font-bold shrink-0"
                  style={{ color: amountColor }}
                >
                  {tx.type === "transfer" ? "" : isExpense ? "-" : "+"}
                  {formatMoney(Math.abs(displayAmount), acc?.currencyCode ?? "USD")}
                </p>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => setEditTx(tx)}
                    className="p-1 rounded"
                    style={{ color: "var(--color-ft-text-3)" }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("Delete this transaction?")) {
                        await removeMutation({ id: tx._id });
                      }
                    }}
                    className="p-1 rounded"
                    style={{ color: "var(--color-ft-bad)" }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TransactionFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultAccountId={filterAccountId !== "all" ? filterAccountId : undefined}
      />
      <TransactionFormDialog
        open={!!editTx}
        onOpenChange={(o) => { if (!o) setEditTx(undefined); }}
        transaction={editTx}
      />
      <CSVImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
