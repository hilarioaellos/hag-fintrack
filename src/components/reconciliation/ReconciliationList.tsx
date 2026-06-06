"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ReconcileForm } from "./ReconcileForm";
import { ReconciliationHistory } from "./ReconciliationHistory";
import type { Doc, Id } from "@convex-api/dataModel";

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

export function ReconciliationList() {
  const t = useTranslations("reconciliation");
  const tc = useTranslations("common");
  const accounts = useQuery(api.fintrack.accounts.list);
  const [accountId, setAccountId] = useState("");
  const [historyKey, setHistoryKey] = useState(0);

  const selectedAccount = accounts?.find(
    (a: Doc<"fintrack_accounts">) => a._id === accountId
  );

  if (accounts === undefined) {
    return <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>{tc("loading")}</p>;
  }

  return (
    <div className="space-y-5">
      {/* Account selector */}
      <div className="max-w-xs">
        <Select value={accountId} onValueChange={(v) => { if (v) setAccountId(v); }}>
          <SelectTrigger style={inputStyle}>
            <SelectValue>
              {selectedAccount?.name ?? t("selectAccount")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a: Doc<"fintrack_accounts">) => (
              <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedAccount ? (
        <div
          className="rounded-xl border border-dashed p-10 flex items-center justify-center"
          style={{ borderColor: "var(--color-ft-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>
            {t("selectAccount")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
          >
            <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-ft-text)" }}>
              {selectedAccount.name}
            </p>
            <ReconcileForm
              account={selectedAccount}
              onCreated={() => setHistoryKey((k) => k + 1)}
            />
          </div>

          {/* History */}
          <div
            className="rounded-xl border p-5"
            style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
          >
            <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-ft-text)" }}>
              {t("history")}
            </p>
            <ReconciliationHistory
              key={historyKey}
              accountId={accountId as Id<"fintrack_accounts">}
              currency={selectedAccount.currencyCode}
            />
          </div>
        </div>
      )}
    </div>
  );
}
