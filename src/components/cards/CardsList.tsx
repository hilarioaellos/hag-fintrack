"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreditCardCard } from "./CreditCardCard";
import { CreditCardFormDialog } from "./CreditCardFormDialog";
import type { Doc } from "@convex-api/dataModel";

type CreditCard = Doc<"fintrack_credit_cards"> & { account: Doc<"fintrack_accounts"> | null };

export function CardsList() {
  const t = useTranslations("cards");
  const tc = useTranslations("common");
  const cards = useQuery(api.fintrack.cards.list);
  const [addOpen, setAddOpen] = useState(false);

  if (cards === undefined) {
    return (
      <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>
        {tc("loading")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setAddOpen(true)}
          style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          {t("addCard")}
        </Button>
      </div>

      {cards.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-10 flex flex-col items-center gap-2"
          style={{ borderColor: "var(--color-ft-border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-ft-text-2)" }}>
            {t("noCards")}
          </p>
          <p className="text-xs text-center max-w-xs" style={{ color: "var(--color-ft-text-3)" }}>
            {t("noCardsHint")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card: CreditCard) => (
            <CreditCardCard key={card._id} card={card} />
          ))}
        </div>
      )}

      <CreditCardFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
