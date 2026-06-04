# Auditoría Bloque 9 — Conciliación Bancaria (Completa)

**Proyecto:** hag-fintrack / Landingpage-HAG-Partner  
**typecheck:** VERDE (0 errores)  
**Linear:** HAG-41

---

## ARCHIVOS NUEVOS — BACKEND (HAG Partner)

### `convex/fintrack/reconciliations.ts`

```ts
import { ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./_auth";

export const listByAccount = query({
  args: { accountId: v.id("fintrack_accounts") },
  handler: async (ctx, { accountId }) => {
    const userId = await requireUserId(ctx);
    const account = await ctx.db.get(accountId);
    if (!account || account.userId !== userId)
      throw new ConvexError({ code: 403, message: "Forbidden" });
    return ctx.db
      .query("fintrack_reconciliations")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .order("desc")
      .take(20);
  },
});

export const create = mutation({
  args: {
    accountId: v.id("fintrack_accounts"),
    bankBalanceCents: v.number(),
    date: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { accountId, bankBalanceCents, date, notes }) => {
    const userId = await requireUserId(ctx);
    const account = await ctx.db.get(accountId);
    if (!account || account.userId !== userId)
      throw new ConvexError({ code: 403, message: "Forbidden" });
    if (!Number.isFinite(bankBalanceCents) || !Number.isInteger(bankBalanceCents))
      throw new ConvexError("bankBalanceCents must be an integer");
    if (!Number.isFinite(date) || date <= 0)
      throw new ConvexError("date must be a valid timestamp");

    const systemBalanceCents = account.balanceCents;
    const differenceCents = bankBalanceCents - systemBalanceCents;
    const status = differenceCents === 0 ? "completed" : "discrepancy";

    return ctx.db.insert("fintrack_reconciliations", {
      userId,
      accountId,
      date,
      systemBalanceCents,
      bankBalanceCents,
      differenceCents,
      status,
      notes: notes?.trim() || undefined,
    });
  },
});
```

---

## ARCHIVOS NUEVOS — FRONTEND (hag-fintrack)

### `src/components/reconciliation/ReconcileForm.tsx`

```tsx
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
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
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
    if (!bankBalance) { setError("Enter the bank balance"); return; }
    const dateTs = new Date(date + "T12:00:00").getTime();
    if (isNaN(dateTs)) { setError("Invalid date"); return; }
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
          New reconciliation
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
          {t("notes")} <span style={{ color: "var(--color-ft-text-3)" }}>(optional)</span>
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
```

---

### `src/components/reconciliation/ReconciliationHistory.tsx`

```tsx
"use client";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import type { Doc, Id } from "@convex-api/dataModel";

type Rec = Doc<"fintrack_reconciliations">;

const STATUS_COLORS: Record<Rec["status"], string> = {
  completed:   "var(--color-ft-good)",
  discrepancy: "var(--color-ft-bad)",
  pending:     "var(--color-ft-warn)",
};

interface Props {
  accountId: Id<"fintrack_accounts">;
  currency: string;
}

export function ReconciliationHistory({ accountId, currency }: Props) {
  const t = useTranslations("reconciliation");
  const tc = useTranslations("common");
  const records = useQuery(api.fintrack.reconciliations.listByAccount, { accountId });

  if (records === undefined) {
    return <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>{tc("loading")}</p>;
  }

  if (records.length === 0) {
    return (
      <p className="text-sm text-center py-6" style={{ color: "var(--color-ft-text-3)" }}>
        {t("noHistory")}
      </p>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: "var(--color-ft-border)" }}>
      {records.map((r: Rec) => {
        const color = STATUS_COLORS[r.status];
        return (
          <div key={r._id} className="py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{
                    color,
                    backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
                  }}
                >
                  {t(`status.${r.status}`)}
                </span>
                <span className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
                  {format(new Date(r.date), "MMM d, yyyy")}
                </span>
              </div>
              {r.notes && (
                <p className="text-xs mt-1 truncate" style={{ color: "var(--color-ft-text-3)" }}>
                  {r.notes}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-mono" style={{ color: "var(--color-ft-text-2)" }}>
                Bank: {formatMoney(r.bankBalanceCents, currency)}
              </p>
              {r.differenceCents !== 0 && (
                <p
                  className="text-xs font-mono"
                  style={{ color: r.differenceCents > 0 ? "var(--color-ft-good)" : "var(--color-ft-bad)" }}
                >
                  {r.differenceCents > 0 ? "+" : ""}{formatMoney(r.differenceCents, currency)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

### `src/components/reconciliation/ReconciliationList.tsx`

```tsx
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
            <SelectValue placeholder={t("selectAccount")} />
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
```

---

### `src/app/(dashboard)/reconciliation/page.tsx`

```tsx
import { getTranslations } from "next-intl/server";
import { ReconciliationList } from "@/components/reconciliation/ReconciliationList";

export default async function ReconciliationPage() {
  const t = await getTranslations("reconciliation");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-ft-text)" }}>
          {t("title")}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-ft-text-3)" }}>
          {t("subtitle")}
        </p>
      </div>
      <ReconciliationList />
    </div>
  );
}
```

---

## ARCHIVOS MODIFICADOS

### `src/components/layout/Sidebar.tsx`

```tsx
// Added import:
import { Scale } from "lucide-react";

// Added to NAV_MAIN:
{ href: "/reconciliation", icon: Scale, key: "reconciliation" },
```

### `src/components/layout/Topbar.tsx`

```tsx
// Updated NavKey union:
type NavKey = "dashboard" | "accounts" | "transactions" | "budget" | "debts" | "cards" | "reports" | "reconciliation" | "settings";

// Added to ROUTES:
["/reconciliation", "reconciliation"],
```

### `messages/en.json` & `messages/es.json`

**New namespace `reconciliation`:**
- title, subtitle
- account, selectAccount
- bankBalance, systemBalance, difference
- statementDate, notes, notesPlaceholder
- balanced, discrepancy, confirm
- history, noHistory
- status: { completed, discrepancy, pending }

---

## VALIDACIONES

**Backend (`reconciliations.ts`):**
- `requireUserId` on both handlers
- Account ownership check: `account.userId !== userId` → 403 Forbidden
- `bankBalanceCents` must be finite integer
- `date` must be finite timestamp > 0

**Frontend (`ReconcileForm`):**
- Account required (passed via props)
- `bankBalance` input required before submit
- `date` validation (HTML date input, but checked on submit)

---

## DECISIONES CLAVE

1. **Immutable reconciliations**: No update/delete mutations. Each record is a historical snapshot.

2. **Automatic status**: Backend determines status as `differenceCents === 0 ? "completed" : "discrepancy"`. No client-side status logic.

3. **Balance snapshot**: `systemBalanceCents` stored at reconciliation time. If account balance changes later, the record preserves the original system balance for accuracy.

4. **Live diff preview**: Form shows diff color-coded (green if balanced, red if discrepancy) as user types. No API call needed.

5. **Last 20 per account**: `.take(20)` sufficient for typical user context. No pagination needed.

6. **Optional notes**: User context (e.g., "June 2026 statement", "includes pending"). Trimmed on save.

7. **Scale icon**: Represents balance/equilibrium in sidebar nav.

---

## FLUJO DE USO

1. User navigates to `/reconciliation`
2. Sees account selector dropdown
3. Selects an account
4. Form shows: system balance, date input, bank balance input
5. As user types bank balance, diff appears live
6. If balanced (diff = 0), preview shows green checkmark + "Records match"
7. If discrepancy (diff ≠ 0), shows red warning + diff amount
8. User can add notes (optional)
9. Clicks confirm → mutation creates record
10. Success state shows: checkmark + result + "New reconciliation" button
11. Right panel loads history of reconciliations (last 20)
12. Each history entry shows: status badge, date, notes, bank balance, diff
