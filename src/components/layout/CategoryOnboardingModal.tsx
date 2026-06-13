"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCategoryOnboarding } from "@/components/providers/CategoryOnboardingProvider";
import type { Doc } from "@convex-api/dataModel";

type Category = Doc<"fintrack_categories"> & { isActive: boolean; excludeFromReports: boolean };

function WizardCatRow({
  cat,
  deleteId,
  setDeleteId,
  onDelete,
}: {
  cat: Category;
  deleteId: string | null;
  setDeleteId: (id: string | null) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const isDeleting = deleteId === cat._id;

  if (isDeleting) {
    return (
      <div
        className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-ft-bad) 10%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-ft-bad) 30%, transparent)",
        }}
      >
        <span className="text-xs" style={{ color: "var(--color-ft-bad)" }}>
          Delete &quot;{cat.name}&quot;? Transactions will lose this category.
        </span>
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setDeleteId(null)}
            className="p-1 rounded"
            style={{ color: "var(--color-ft-text-3)" }}
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void onDelete(cat._id)}
            className="p-1 rounded"
            style={{ color: "var(--color-ft-bad)" }}
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
      style={{ backgroundColor: "var(--color-ft-surface-2)" }}
    >
      <span className="flex-1 text-sm flex items-center gap-1.5" style={{ color: "var(--color-ft-text)" }}>
        {cat.color && (
          <span
            className="w-2 h-2 rounded-full shrink-0 inline-block"
            style={{ backgroundColor: cat.color }}
          />
        )}
        {cat.icon && <span>{cat.icon}</span>}
        {cat.name}
      </span>
      <button
        type="button"
        onClick={() => setDeleteId(cat._id)}
        className="p-1 rounded hover:bg-[var(--color-ft-surface)]"
        style={{ color: "var(--color-ft-text-3)" }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function CategoryOnboardingModal() {
  const settings = useQuery(api.fintrack.user_settings.get);
  const cats = useQuery(api.fintrack.categories.listWithSettings);
  const removeCat = useMutation(api.fintrack.categories.remove);
  const markReviewed = useMutation(api.fintrack.user_settings.markCategoriesReviewed);
  const { isOpen, open, close } = useCategoryOnboarding();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings === undefined) return;
    if (settings?.categoriesReviewed !== true) open();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  if (!isOpen || settings === undefined || cats === undefined) return null;

  const expenseCats = cats.filter(
    (c: Category) => !["Salary", "Freelance", "Gift Income", "Bonus", "Investment Returns", "Rental Income", "Business Income", "IRIS"].includes(c.name)
  );
  const incomeCats = cats.filter(
    (c: Category) => ["Salary", "Freelance", "Gift Income", "Bonus", "Investment Returns", "Rental Income", "Business Income", "IRIS"].includes(c.name)
  );

  const handleDelete = async (id: string) => {
    await removeCat({ id: id as Category["_id"] });
    setDeleteId(null);
  };

  const handleDone = async () => {
    setSaving(true);
    try {
      await markReviewed({});
      close();
    } finally {
      setSaving(false);
    }
  };

  const rowProps = { deleteId, setDeleteId, onDelete: handleDelete };

  return (
    <Dialog
      open={isOpen}
      // Intercept all close attempts — only Done button dismisses the wizard
      onOpenChange={() => {}}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-md w-full"
        style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--color-ft-text)" }}>Set up your categories</DialogTitle>
          <DialogDescription style={{ color: "var(--color-ft-text-3)" }}>
            Keep the ones you&apos;ll use. You can change this later in Settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {expenseCats.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium px-1" style={{ color: "var(--color-ft-text-3)" }}>
                EXPENSES
              </p>
              {expenseCats.map((cat: Category) => (
                <WizardCatRow key={cat._id} cat={cat} {...rowProps} />
              ))}
            </div>
          )}
          {incomeCats.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium px-1" style={{ color: "var(--color-ft-text-3)" }}>
                INCOME
              </p>
              {incomeCats.map((cat: Category) => (
                <WizardCatRow key={cat._id} cat={cat} {...rowProps} />
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleDone}
          disabled={saving}
          className="w-full"
          style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
        >
          {saving ? "Saving…" : "Done — start using FinTrack"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
