"use client";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MoreHorizontal, Pencil, Archive, Trash2 } from "lucide-react";
import type { Doc } from "@convex-api/dataModel";
import { AccountFormDialog } from "./AccountFormDialog";

type Account = Doc<"fintrack_accounts">;
type CreditCard = Doc<"fintrack_credit_cards">;

const TYPE_COLORS: Record<Account["type"], string> = {
  checking:   "var(--color-ft-primary)",
  savings:    "var(--color-ft-good)",
  investment: "var(--color-ft-warn)",
  credit:     "var(--color-ft-bad)",
  cash:       "var(--color-ft-text-2)",
};

export function AccountCard({ account, card }: { account: Account; card?: CreditCard }) {
  const t = useTranslations("accounts");
  const archive = useMutation(api.fintrack.accounts.archive);
  const clearTxs = useMutation(api.fintrack.transactions.clearByAccount);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const color = TYPE_COLORS[account.type];
  const isCredit = account.type === "credit";
  const displayBalance = isCredit ? -account.balanceCents : account.balanceCents;
  const balanceColor =
    displayBalance >= 0 ? "var(--color-ft-good)" : "var(--color-ft-bad)";

  const handleArchive = async () => {
    setMenuOpen(false);
    await archive({ id: account._id });
  };

  const handleClearTxs = async () => {
    setClearing(true);
    try {
      await clearTxs({ accountId: account._id });
    } finally {
      setClearing(false);
      setConfirmClear(false);
      setMenuOpen(false);
    }
  };

  return (
    <>
      <div
        className="rounded-xl border p-5 flex flex-col gap-3 group relative"
        style={{
          backgroundColor: "var(--color-ft-surface)",
          borderColor: "var(--color-ft-border)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className="font-semibold text-sm truncate"
              style={{ color: "var(--color-ft-text)" }}
            >
              {account.name}
            </p>
            {account.bankName && (
              <p className="text-xs truncate" style={{ color: "var(--color-ft-text-3)" }}>
                {account.bankName}
              </p>
            )}
          </div>

          {/* Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-ft-text-3)" }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  className="absolute right-0 top-6 z-20 rounded-lg border shadow-lg py-1 min-w-[120px]"
                  style={{
                    backgroundColor: "var(--color-ft-surface-2)",
                    borderColor: "var(--color-ft-border)",
                  }}
                >
                  <button
                    onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-ft-surface)]"
                    style={{ color: "var(--color-ft-text-2)" }}
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={handleArchive}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-ft-surface)]"
                    style={{ color: "var(--color-ft-bad)" }}
                  >
                    <Archive className="h-3 w-3" /> {t("archive")}
                  </button>

                  {/* Clear transactions — with inline confirm */}
                  {!confirmClear ? (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-ft-surface)]"
                      style={{ color: "var(--color-ft-bad)" }}
                    >
                      <Trash2 className="h-3 w-3" /> {t("clearTransactions")}
                    </button>
                  ) : (
                    <div className="px-3 py-2 space-y-1.5 border-t" style={{ borderColor: "var(--color-ft-border)" }}>
                      <p className="text-[10px]" style={{ color: "var(--color-ft-text-3)" }}>
                        {t("clearConfirm")}
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          onClick={handleClearTxs}
                          disabled={clearing}
                          className="flex-1 py-1 text-[10px] font-medium rounded"
                          style={{ backgroundColor: "var(--color-ft-bad)", color: "#fff", opacity: clearing ? 0.6 : 1 }}
                        >
                          {clearing ? "…" : t("clearConfirmYes")}
                        </button>
                        <button
                          onClick={() => setConfirmClear(false)}
                          className="flex-1 py-1 text-[10px] rounded"
                          style={{ backgroundColor: "var(--color-ft-surface)", color: "var(--color-ft-text-2)", border: "1px solid var(--color-ft-border)" }}
                        >
                          {t("clearConfirmNo")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Type badge */}
        <span
          className="self-start text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border"
          style={{ color, borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
        >
          {t(`type.${account.type}`)}
        </span>

        {/* Balance */}
        <div>
          <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
            {t("balance")}
          </p>
          <p className="text-xl font-bold ft-num mt-0.5" style={{ color: balanceColor }}>
            {formatMoney(displayBalance, account.currencyCode)}
          </p>
        </div>

        {/* Bottom accent */}
        <div className="h-0.5 w-8 rounded-full" style={{ backgroundColor: color, opacity: 0.5 }} />
      </div>

      <AccountFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        account={account}
        card={card}
      />
    </>
  );
}
