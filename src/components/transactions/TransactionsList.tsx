"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState, useMemo, useEffect, useCallback, memo } from "react";
import { Plus, Upload, Trash2, Pencil, Receipt, SlidersHorizontal, X, Tag } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionFormDialog } from "./TransactionFormDialog";
import { CSVImportDialog } from "./CSVImportDialog";
import { ExportMenu } from "./ExportMenu";
import type { Doc } from "@convex-api/dataModel";

type Transaction = Doc<"fintrack_transactions">;
type Category = Doc<"fintrack_categories">;
type Account = Doc<"fintrack_accounts">;

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
  height: "2rem",
  fontSize: "0.75rem",
};

// ── Memoized row — only re-renders when its own props change ──────────────────
interface RowProps {
  tx: Transaction;
  i: number;
  cat: Category | undefined;
  acc: Account | undefined;
  searchQuery: string;
  isSelected: boolean;
  hasAnySelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}

const TransactionRow = memo(function TransactionRow({
  tx, i, cat, acc, searchQuery, isSelected, hasAnySelected, onSelect, onEdit, onDelete, t,
}: RowProps) {
  const isExpense = tx.type === "expense";
  const amountColor = isExpense
    ? "var(--color-ft-bad)"
    : tx.type === "transfer"
    ? "var(--color-ft-primary)"
    : "var(--color-ft-good)";
  const displayAmount = isExpense ? -Math.abs(tx.amountCents) : Math.abs(tx.amountCents);
  const notes = tx.notes ?? (isExpense ? t("expense") : t("income"));
  const matchIdx = searchQuery ? notes.toLowerCase().indexOf(searchQuery) : -1;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 group"
      style={{
        borderTop: i > 0 ? "1px solid var(--color-ft-border)" : undefined,
        backgroundColor: isSelected
          ? "color-mix(in srgb, var(--color-ft-primary) 6%, transparent)"
          : undefined,
      }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onSelect(tx._id)}
        className="w-3.5 h-3.5 shrink-0 accent-[var(--color-ft-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ opacity: isSelected || hasAnySelected ? 1 : undefined }}
      />
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
        style={{ backgroundColor: "var(--color-ft-surface-2)" }}
      >
        {tx.type === "transfer" ? "↔️" : (cat?.icon ?? "📦")}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--color-ft-text)" }}>
          {matchIdx >= 0 ? (
            <>
              {notes.slice(0, matchIdx)}
              <mark style={{ backgroundColor: "color-mix(in srgb, var(--color-ft-primary) 30%, transparent)", color: "var(--color-ft-text)", borderRadius: "2px", padding: "0 1px" }}>
                {notes.slice(matchIdx, matchIdx + searchQuery.length)}
              </mark>
              {notes.slice(matchIdx + searchQuery.length)}
            </>
          ) : notes}
        </p>
        <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
          {tx.type === "transfer"
            ? `Transfer · ${acc?.name ?? ""}`
            : `${cat?.name ?? t("uncategorized")} · ${acc?.name ?? ""}`}
          {" · "}{format(new Date(tx.date), "MMM d, yyyy")}
          {tx.source === "csv" && <span className="ml-1 opacity-50">[csv]</span>}
        </p>
      </div>

      <p className="ft-num text-sm font-bold shrink-0" style={{ color: amountColor }}>
        {tx.type === "transfer" ? "" : isExpense ? "-" : "+"}
        {formatMoney(Math.abs(displayAmount), acc?.currencyCode ?? "USD")}
      </p>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onEdit(tx)} className="p-1 rounded" style={{ color: "var(--color-ft-text-3)" }}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(tx._id)}
          className="p-1 rounded"
          style={{ color: "var(--color-ft-bad)" }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────

export function TransactionsList() {
  const t = useTranslations("transactions");

  // ── Filters ──────────────────────────────────────────────────────────────
  const [filterAccountId, setFilterAccountId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Debounced search — filter only fires 200 ms after the user stops typing
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200);
    return () => clearTimeout(id);
  }, [search]);

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | undefined>();

  // ── Bulk selection ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const accounts = useQuery(api.fintrack.accounts.list);
  const categories = useQuery(api.fintrack.categories.list);
  const activeCategories = useQuery(api.fintrack.categories.listActive);

  const startDate = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : undefined;
  const endDate   = dateTo   ? new Date(dateTo   + "T23:59:59").getTime() : undefined;

  const transactions = useQuery(api.fintrack.transactions.list, {
    accountId: filterAccountId !== "all" ? (filterAccountId as Doc<"fintrack_accounts">["_id"]) : undefined,
    startDate,
    endDate,
  });

  const removeMutation = useMutation(api.fintrack.transactions.remove);
  const bulkUpdateCategoryMutation = useMutation(api.fintrack.transactions.bulkUpdateCategory);

  // Memoized lookup maps — only rebuild when source data changes
  const categoryMap = useMemo(
    () => Object.fromEntries((categories ?? []).map((c: Category) => [c._id, c])),
    [categories]
  );
  const accountMap = useMemo(
    () => Object.fromEntries((accounts ?? []).map((a: Account) => [a._id, a])),
    [accounts]
  );

  // ── Client-side filtering ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!transactions) return undefined;
    const min = amountMin ? parseFloat(amountMin) * 100 : null;
    const max = amountMax ? parseFloat(amountMax) * 100 : null;
    return transactions.filter((tx: Transaction) => {
      if (debouncedSearch && !(tx.notes ?? "").toLowerCase().includes(debouncedSearch)) return false;
      if (filterCategoryId === "__none__" && tx.categoryId) return false;
      if (filterCategoryId !== "all" && filterCategoryId !== "__none__" && tx.categoryId !== filterCategoryId) return false;
      const abs = Math.abs(tx.amountCents);
      if (min !== null && abs < min) return false;
      if (max !== null && abs > max) return false;
      return true;
    });
  }, [transactions, debouncedSearch, amountMin, amountMax, filterCategoryId]);

  // Memoized totals
  const totals = useMemo(
    () => (filtered ?? []).reduce(
      (acc: { income: number; expenses: number }, tx: Transaction) => {
        if (tx.type === "income") acc.income += tx.amountCents;
        else if (tx.type === "expense") acc.expenses += Math.abs(tx.amountCents);
        return acc;
      },
      { income: 0, expenses: 0 }
    ),
    [filtered]
  );

  const hasActiveFilters = !!(dateFrom || dateTo || search || amountMin || amountMax || filterCategoryId !== "all");

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filterAccountId, dateFrom, dateTo, debouncedSearch, amountMin, amountMax, filterCategoryId]);

  const filteredIds = useMemo(
    () => (filtered ?? []).map((tx: Transaction) => tx._id as string),
    [filtered]
  );

  // Memoized select-all state — avoids .every()/.some() on every render
  const { allSelected, someSelected } = useMemo(() => {
    if (filteredIds.length === 0) return { allSelected: false, someSelected: false };
    let selectedCount = 0;
    for (const id of filteredIds) { if (selectedIds.has(id)) selectedCount++; }
    return {
      allSelected: selectedCount === filteredIds.length,
      someSelected: selectedCount > 0 && selectedCount < filteredIds.length,
    };
  }, [filteredIds, selectedIds]);

  // Stable callbacks — row memo won't break on each render
  const toggleSelect = useCallback((id: string) =>
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
  []);

  const toggleSelectAll = useCallback(() =>
    setSelectedIds(allSelected ? new Set() : new Set(filteredIds)),
  [allSelected, filteredIds]);

  const handleEdit = useCallback((tx: Transaction) => setEditTx(tx), []);

  const handleDelete = useCallback(async (id: string) => {
    if (confirm(t("confirmDelete"))) await removeMutation({ id: id as Doc<"fintrack_transactions">["_id"] });
  }, [removeMutation, t]);

  const handleBulkAssign = async () => {
    if (!bulkCategoryId || selectedIds.size === 0) return;
    setIsBulkAssigning(true);
    try {
      await bulkUpdateCategoryMutation({
        ids: [...selectedIds] as Doc<"fintrack_transactions">["_id"][],
        categoryId: bulkCategoryId as Doc<"fintrack_categories">["_id"],
      });
      setSelectedIds(new Set());
      setBulkCategoryId("");
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const clearFilters = () => {
    setDateFrom(""); setDateTo("");
    setSearch(""); setAmountMin(""); setAmountMax("");
    setFilterCategoryId("all");
  };

  const selectedAccountName =
    filterAccountId === "all"
      ? t("allAccounts")
      : (accountMap[filterAccountId]?.name ?? t("allAccounts"));

  const hasAnySelected = selectedIds.size > 0;

  return (
    <div className="space-y-3">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Account selector */}
          <Select value={filterAccountId} onValueChange={(v) => { if (v) setFilterAccountId(v); }}>
            <SelectTrigger
              className="w-[160px] h-9 text-sm"
              style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)", color: "var(--color-ft-text)" }}
            >
              <SelectValue>{selectedAccountName}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allAccounts")}</SelectItem>
              {accounts?.map((a: Account) => (
                <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category selector */}
          <Select value={filterCategoryId} onValueChange={(v) => { if (v) setFilterCategoryId(v); }}>
            <SelectTrigger
              className="w-[170px] h-9 text-sm"
              style={{
                backgroundColor: "var(--color-ft-surface)",
                borderColor: filterCategoryId !== "all" ? "var(--color-ft-primary)" : "var(--color-ft-border)",
                color: filterCategoryId !== "all" ? "var(--color-ft-primary)" : "var(--color-ft-text)",
              }}
            >
              <SelectValue>
                {filterCategoryId === "all"
                  ? t("filterCategoryAll")
                  : filterCategoryId === "__none__"
                  ? t("uncategorized")
                  : `${categoryMap[filterCategoryId]?.icon ?? ""} ${categoryMap[filterCategoryId]?.name ?? ""}`.trim()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-sm">{t("filterCategoryAll")}</SelectItem>
              <SelectItem value="__none__" className="text-sm">— {t("uncategorized")}</SelectItem>
              {(categories ?? []).map((c: Category) => (
                <SelectItem key={c._id} value={c._id} className="text-sm">
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filters toggle */}
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-medium transition-colors"
            style={{
              borderColor: filtersOpen || hasActiveFilters ? "var(--color-ft-primary)" : "var(--color-ft-border)",
              color: filtersOpen || hasActiveFilters ? "var(--color-ft-primary)" : "var(--color-ft-text-2)",
              backgroundColor: hasActiveFilters ? "color-mix(in srgb, var(--color-ft-primary) 8%, transparent)" : "var(--color-ft-surface)",
            }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t("filters")}
            {hasActiveFilters && (
              <span
                className="ml-0.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold"
                style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
              >
                {[dateFrom, dateTo, search, amountMin, amountMax].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}
            style={{ borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-2)" }}>
            <Upload className="h-3.5 w-3.5" /> CSV
          </Button>
          <ExportMenu
            transactions={filtered ?? []}
            accountMap={accountMap}
            categoryMap={categoryMap}
            dateFrom={dateFrom}
            dateTo={dateTo}
            disabled={filtered === undefined || accounts === undefined || categories === undefined}
          />
          <Button size="sm" onClick={() => setAddOpen(true)}
            style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>
            <Plus className="h-3.5 w-3.5" /> {t("addTransaction")}
          </Button>
        </div>
      </div>

      {/* ── Filter panel ── */}
      {filtersOpen && (
        <div
          className="rounded-xl border p-3 space-y-3"
          style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Notes search */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-2">
              <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--color-ft-text-3)" }}>
                {t("filterSearch")}
              </p>
              <div className="relative">
                <Input
                  placeholder={t("filterSearchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={inputStyle}
                  className="pr-7"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--color-ft-text-3)" }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Date from */}
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--color-ft-text-3)" }}>
                {t("filterDateFrom")}
              </p>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Date to */}
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--color-ft-text-3)" }}>
                {t("filterDateTo")}
              </p>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Amount min */}
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--color-ft-text-3)" }}>
                {t("filterAmountMin")}
              </p>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Amount max */}
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--color-ft-text-3)" }}>
                {t("filterAmountMax")}
              </p>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="text-xs flex items-center gap-1"
                style={{ color: "var(--color-ft-text-3)" }}
              >
                <X className="h-3 w-3" /> {t("clearFilters")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Bulk action toolbar ── */}
      {hasAnySelected && (
        <div
          className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl border text-xs"
          style={{ backgroundColor: "color-mix(in srgb, var(--color-ft-primary) 8%, var(--color-ft-surface))", borderColor: "var(--color-ft-primary)" }}
        >
          <Tag className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-ft-primary)" }} />
          <span className="font-semibold" style={{ color: "var(--color-ft-primary)" }}>
            {t("bulkSelected", { count: selectedIds.size })}
          </span>
          <Select value={bulkCategoryId} onValueChange={(v) => { if (v) setBulkCategoryId(v); }}>
            <SelectTrigger
              className="h-7 text-xs w-[180px]"
              style={{ backgroundColor: "var(--color-ft-surface-2)", borderColor: "var(--color-ft-border)", color: "var(--color-ft-text)" }}
            >
              <SelectValue>
                {bulkCategoryId
                  ? `${(activeCategories ?? []).find((c: Category) => c._id === bulkCategoryId)?.icon ?? ""} ${(activeCategories ?? []).find((c: Category) => c._id === bulkCategoryId)?.name ?? ""}`.trim()
                  : t("bulkAssignPlaceholder")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(activeCategories ?? []).map((c: Category) => (
                <SelectItem key={c._id} value={c._id} className="text-xs">
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!bulkCategoryId || isBulkAssigning}
            onClick={handleBulkAssign}
            style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18", height: "1.75rem", fontSize: "0.75rem" }}
          >
            {isBulkAssigning ? t("bulkAssigning") : t("bulkAssign")}
          </Button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-1 ml-auto"
            style={{ color: "var(--color-ft-text-3)" }}
          >
            <X className="h-3 w-3" /> {t("bulkClear")}
          </button>
        </div>
      )}

      {/* ── Summary bar ── */}
      {filtered && filtered.length > 0 && (
        <div
          className="flex flex-wrap gap-4 px-4 py-2.5 rounded-xl text-xs"
          style={{ backgroundColor: "var(--color-ft-surface)" }}
        >
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected; }}
              onChange={toggleSelectAll}
              className="w-3.5 h-3.5 accent-[var(--color-ft-primary)]"
            />
            <span style={{ color: "var(--color-ft-text-3)" }}>
              {filtered.length}
              {transactions && filtered.length !== transactions.length && (
                <span> {t("of")} {transactions.length}</span>
              )}
              {" "}{t("transactionsCount")}
            </span>
          </label>
          <span style={{ color: "var(--color-ft-good)" }}>+{formatMoney(totals.income)}</span>
          <span style={{ color: "var(--color-ft-bad)" }}>-{formatMoney(totals.expenses)}</span>
          <span style={{ color: totals.income - totals.expenses >= 0 ? "var(--color-ft-good)" : "var(--color-ft-bad)", fontWeight: 600 }}>
            Net: {formatMoney(totals.income - totals.expenses)}
          </span>
        </div>
      )}

      {/* ── Loading ── */}
      {transactions === undefined && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-ft-surface)" }} />
          ))}
        </div>
      )}

      {/* ── Empty ── */}
      {filtered?.length === 0 && (
        <div
          className="rounded-xl border border-dashed flex flex-col items-center justify-center py-16 gap-3"
          style={{ borderColor: "var(--color-ft-border)" }}
        >
          <Receipt className="h-8 w-8" style={{ color: "var(--color-ft-text-3)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--color-ft-text-2)" }}>
            {hasActiveFilters ? t("noResults") : t("noTransactions")}
          </p>
          {!hasActiveFilters && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}
                style={{ borderColor: "var(--color-ft-border)", color: "var(--color-ft-text-2)" }}>
                <Upload className="h-3.5 w-3.5" /> Import CSV
              </Button>
              <Button size="sm" onClick={() => setAddOpen(true)}
                style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>
                <Plus className="h-3.5 w-3.5" /> {t("addTransaction")}
              </Button>
            </div>
          )}
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs" style={{ color: "var(--color-ft-primary)" }}>
              {t("clearFilters")}
            </button>
          )}
        </div>
      )}

      {/* ── Transaction list ── */}
      {filtered && filtered.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}>
          {filtered.map((tx: Transaction, i: number) => (
            <TransactionRow
              key={tx._id}
              tx={tx}
              i={i}
              cat={tx.categoryId ? categoryMap[tx.categoryId] : undefined}
              acc={accountMap[tx.accountId]}
              searchQuery={debouncedSearch}
              isSelected={selectedIds.has(tx._id)}
              hasAnySelected={hasAnySelected}
              onSelect={toggleSelect}
              onEdit={handleEdit}
              onDelete={handleDelete}
              t={t}
            />
          ))}
        </div>
      )}

      <TransactionFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultAccountId={filterAccountId !== "all" ? filterAccountId : undefined}
      />
      <TransactionFormDialog
        key={editTx?._id ?? "edit-closed"}
        open={!!editTx}
        onOpenChange={(o) => { if (!o) setEditTx(undefined); }}
        transaction={editTx}
      />
      <CSVImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
