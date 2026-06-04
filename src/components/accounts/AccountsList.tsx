"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountCard } from "./AccountCard";
import { AccountFormDialog } from "./AccountFormDialog";
import type { Doc } from "@convex-api/dataModel";

export function AccountsList() {
  const accounts = useQuery(api.fintrack.accounts.list);
  const t = useTranslations("accounts");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>
          {accounts === undefined
            ? tc("loading")
            : `${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`}
        </p>
        <Button
          onClick={() => setOpen(true)}
          size="sm"
          style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("addAccount")}
        </Button>
      </div>

      {/* Loading skeleton */}
      {accounts === undefined && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border animate-pulse"
              style={{
                backgroundColor: "var(--color-ft-surface)",
                borderColor: "var(--color-ft-border)",
                height: "160px",
              }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {accounts?.length === 0 && (
        <div
          className="rounded-xl border border-dashed flex flex-col items-center justify-center py-16 gap-3"
          style={{ borderColor: "var(--color-ft-border)" }}
        >
          <Wallet className="h-8 w-8" style={{ color: "var(--color-ft-text-3)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--color-ft-text-2)" }}>
            No accounts yet
          </p>
          <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
            Add your first account to start tracking
          </p>
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addAccount")}
          </Button>
        </div>
      )}

      {/* Accounts grid */}
      {accounts && accounts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account: Doc<"fintrack_accounts">) => (
            <AccountCard key={account._id} account={account} />
          ))}
        </div>
      )}

      <AccountFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
