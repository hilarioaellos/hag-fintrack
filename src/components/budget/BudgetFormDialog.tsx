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

type Budget = Doc<"fintrack_budgets"> & {
  category: Doc<"fintrack_categories"> | null;
  actualCents: number;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  budget?: Budget;
  budgetedCategoryIds: Set<string>;
}

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

export function BudgetFormDialog({ open, onOpenChange, year, month, budget, budgetedCategoryIds }: Props) {
  const t = useTranslations("budget");
  const tc = useTranslations("common");
  const categories = useQuery(api.fintrack.categories.list);
  const createMutation = useMutation(api.fintrack.budgets.create);
  const updateMutation = useMutation(api.fintrack.budgets.update);

  const isEdit = !!budget;

  const availableCategories = (categories ?? []).filter(
    (c: Doc<"fintrack_categories">) =>
      isEdit ? true : !budgetedCategoryIds.has(c._id)
  );

  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? "");
  const [amount, setAmount] = useState(budget ? String(budget.amountPlannedCents / 100) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setCategoryId(budget?.categoryId ?? "");
    setAmount(budget ? String(budget.amountPlannedCents / 100) : "");
    setError("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cents = dollarsToCents(parseFloat(amount) || 0);
    if (cents <= 0) { setError("Amount must be greater than 0"); return; }

    setLoading(true);
    try {
      if (isEdit) {
        await updateMutation({ id: budget._id, amountPlannedCents: cents });
      } else {
        if (!categoryId) { setError("Select a category"); setLoading(false); return; }
        await createMutation({
          categoryId: categoryId as Id<"fintrack_categories">,
          year,
          month,
          amountPlannedCents: cents,
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
            {isEdit ? t("editBudget") : t("addBudget")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("category")}</Label>
              {availableCategories.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>
                  {t("allBudgeted")}
                </p>
              ) : (
                <Select value={categoryId} onValueChange={(v) => { if (v) setCategoryId(v); }}>
                  <SelectTrigger className="w-full" style={inputStyle}>
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((c: Doc<"fintrack_categories">) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {isEdit && budget.category && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--color-ft-surface-2)" }}>
              <span className="text-lg">{budget.category.icon}</span>
              <span className="text-sm font-medium" style={{ color: "var(--color-ft-text)" }}>
                {budget.category.name}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label style={{ color: "var(--color-ft-text-2)" }}>{t("planned")}</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={inputStyle}
            />
          </div>

          {error && <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>{error}</p>}

          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
            >
              {loading ? tc("loading") : isEdit ? tc("save") : t("addBudget")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
