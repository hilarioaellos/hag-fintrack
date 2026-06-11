"use client";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { dollarsToCents, formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Doc, Id } from "@convex-api/dataModel";

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

interface Props {
  account: Doc<"fintrack_accounts">;
  onCreated: () => void;
}

export function ReconcileForm({ account, onCreated }: Props) {
  const t = useTranslations("reconciliation");
  const tc = useTranslations("common");
  const createMutation = useMutation(api.fintrack.reconciliations.create);

  const [bankBalance, setBankBalance] = useState("");
  const [date, setDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const bankCents = dollarsToCents(parseFloat(bankBalance) || 0);
  const diffCents = bankBalance ? bankCents - account.balanceCents : null;
  const isBalanced = diffCents === 0;
  const currency = account.currencyCode;

  const reset = () => {
    setBankBalance("");
    setNotes("");
    setDone(false);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankBalance) { setError(t("errorBankBalanceRequired")); return; }
    const dateTs = new Date(date + "T12:00:00").getTime();
    if (isNaN(dateTs)) { setError(t("errorInvalidDate")); return; }
    setLoading(true);
    setError("");
    try {
      await createMutation({
        accountId: account._id as Id<"fintrack_accounts">,
        bankBalanceCents: bankCents,
        date: dateTs,
        notes: notes.trim() || undefined,
      });
      setDone(true);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("error"));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <CheckCircle2 className="h-8 w-8" style={{ color: "var(--color-ft-good)" }} />
        <p className="text-sm font-medium text-center" style={{ color: "var(--color-ft-text)" }}>
          {isBalanced
            ? t("balanced")
            : t("discrepancy", { amount: formatMoney(Math.abs(diffCents ?? 0), currency) })}
        </p>
        <Button size="sm" onClick={reset}
          style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>
          {t("newReconciliation")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* System balance */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
        style={{ backgroundColor: "var(--color-ft-surface-2)" }}
      >
        <span style={{ color: "var(--color-ft-text-3)" }}>{t("systemBalance")}</span>
        <span className="font-mono font-semibold" style={{ color: "var(--color-ft-text)" }}>
          {formatMoney(account.balanceCents, currency)}
        </span>
      </div>

      {/* Date + Bank balance */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label style={{ color: "var(--color-ft-text-2)" }}>{t("statementDate")}</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </div>
        <div className="space-y-1.5">
          <Label style={{ color: "var(--color-ft-text-2)" }}>{t("bankBalance")}</Label>
          <Input
            type="number" step="0.01" value={bankBalance}
            onChange={(e) => setBankBalance(e.target.value)}
            placeholder="0.00" style={inputStyle}
          />
        </div>
      </div>

      {/* Live diff */}
      {bankBalance && diffCents !== null && (
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border"
          style={{
            borderColor: isBalanced ? "var(--color-ft-good)" : "var(--color-ft-bad)",
            backgroundColor: isBalanced
              ? "color-mix(in srgb, var(--color-ft-good) 10%, transparent)"
              : "color-mix(in srgb, var(--color-ft-bad) 10%, transparent)",
          }}
        >
          {isBalanced
            ? <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--color-ft-good)" }} />
            : <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "var(--color-ft-bad)" }} />
          }
          <div>
            <p className="text-sm font-medium"
              style={{ color: isBalanced ? "var(--color-ft-good)" : "var(--color-ft-bad)" }}>
              {isBalanced
                ? t("balanced")
                : t("discrepancy", { amount: formatMoney(Math.abs(diffCents), currency) })}
            </p>
            {!isBalanced && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-ft-text-3)" }}>
                {t("difference")}: {diffCents > 0 ? "+" : ""}{formatMoney(diffCents, currency)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label style={{ color: "var(--color-ft-text-2)" }}>
          {t("notes")} <span style={{ color: "var(--color-ft-text-3)" }}>{t("optional")}</span>
        </Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesPlaceholder")} rows={2} style={inputStyle} />
      </div>

      {error && <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>{error}</p>}

      <Button type="submit" disabled={loading || !bankBalance} className="w-full"
        style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>
        {loading ? tc("loading") : t("confirm")}
      </Button>
    </form>
  );
}
