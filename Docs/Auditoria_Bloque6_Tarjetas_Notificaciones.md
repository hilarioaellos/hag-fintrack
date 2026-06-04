# Auditoría Bloque 6 — Tarjetas de Crédito + Notificaciones

**Proyecto:** hag-fintrack / Landingpage-HAG-Partner  
**typecheck:** VERDE (0 errores)

---

## ARCHIVOS NUEVOS — BACKEND (HAG Partner)

### `convex/fintrack/cards.ts`

```ts
import { ConvexError } from "convex/values";
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./_auth";
import { validatePositiveCents } from "./_money";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const cards = await ctx.db
      .query("fintrack_credit_cards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return Promise.all(
      cards.map(async (card) => {
        const account = await ctx.db.get(card.accountId);
        return { ...card, account };
      })
    );
  },
});

export const create = mutation({
  args: {
    accountId: v.id("fintrack_accounts"),
    closingDay: v.number(),
    paymentDueDay: v.number(),
    creditLimitCents: v.number(),
    minimumPaymentCents: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const account = await ctx.db.get(args.accountId);
    if (!account || account.userId !== userId)
      throw new ConvexError({ code: 403, message: "Forbidden" });
    if (account.type !== "credit")
      throw new ConvexError("Account must be of type 'credit'");
    validatePositiveCents(args.creditLimitCents, "creditLimitCents");
    validatePositiveCents(args.minimumPaymentCents, "minimumPaymentCents");
    if (args.closingDay < 1 || args.closingDay > 28)
      throw new ConvexError("closingDay must be between 1 and 28");
    if (args.paymentDueDay < 1 || args.paymentDueDay > 28)
      throw new ConvexError("paymentDueDay must be between 1 and 28");
    return ctx.db.insert("fintrack_credit_cards", { userId, ...args });
  },
});

export const update = mutation({
  args: {
    id: v.id("fintrack_credit_cards"),
    closingDay: v.optional(v.number()),
    paymentDueDay: v.optional(v.number()),
    creditLimitCents: v.optional(v.number()),
    minimumPaymentCents: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireUserId(ctx);
    const card = await ctx.db.get(id);
    if (!card || card.userId !== userId)
      throw new ConvexError({ code: 403, message: "Forbidden" });
    if (fields.creditLimitCents !== undefined)
      validatePositiveCents(fields.creditLimitCents, "creditLimitCents");
    if (fields.minimumPaymentCents !== undefined)
      validatePositiveCents(fields.minimumPaymentCents, "minimumPaymentCents");
    if (fields.closingDay !== undefined && (fields.closingDay < 1 || fields.closingDay > 28))
      throw new ConvexError("closingDay must be between 1 and 28");
    if (fields.paymentDueDay !== undefined && (fields.paymentDueDay < 1 || fields.paymentDueDay > 28))
      throw new ConvexError("paymentDueDay must be between 1 and 28");
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined)
    );
    if (Object.keys(patch).length > 0) await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("fintrack_credit_cards") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const card = await ctx.db.get(id);
    if (!card || card.userId !== userId)
      throw new ConvexError({ code: 403, message: "Forbidden" });
    await ctx.db.delete(id);
  },
});
```

---

### `convex/fintrack/notifications.ts`

```ts
import { ConvexError } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./_auth";

export const listUnread = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return ctx.db
      .query("fintrack_notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false))
      .order("desc")
      .take(20);
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const unread = await ctx.db
      .query("fintrack_notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false))
      .collect();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { isRead: true })));
  },
});

export const markRead = mutation({
  args: { id: v.id("fintrack_notifications") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const notif = await ctx.db.get(id);
    if (!notif || notif.userId !== userId)
      throw new ConvexError({ code: 403, message: "Forbidden" });
    await ctx.db.patch(id, { isRead: true });
  },
});

export const checkPaymentDueDates = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date();
    const todayDay = today.getDate();
    const year = today.getFullYear();
    const month = today.getMonth();

    const allCards = await ctx.db.query("fintrack_credit_cards").collect();

    for (const card of allCards) {
      const daysUntilDue =
        card.paymentDueDay >= todayDay
          ? card.paymentDueDay - todayDay
          : Math.ceil(
              (new Date(year, month + 1, card.paymentDueDay).getTime() - today.getTime()) /
                86_400_000
            );

      if (daysUntilDue > 5) continue;

      // One notification per card per billing cycle (keyed by year+month)
      const typeKey = `payment_due_${card._id}_${year}_${month}`;
      const existing = await ctx.db
        .query("fintrack_notifications")
        .withIndex("by_user", (q) => q.eq("userId", card.userId))
        .filter((q) => q.eq(q.field("type"), typeKey))
        .first();

      if (existing) continue;

      const account = await ctx.db.get(card.accountId);
      const cardName = account?.name ?? "Credit Card";
      const message =
        daysUntilDue === 0
          ? `${cardName} payment is due today`
          : `${cardName} payment due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`;

      const dueDate = new Date(year, month, card.paymentDueDay);
      if (card.paymentDueDay < todayDay) dueDate.setMonth(dueDate.getMonth() + 1);

      await ctx.db.insert("fintrack_notifications", {
        userId: card.userId,
        type: typeKey,
        message,
        dueDate: dueDate.getTime(),
        isRead: false,
        severity:
          daysUntilDue === 0 ? "urgent" : daysUntilDue <= 2 ? "warning" : "info",
      });
    }
  },
});
```

---

### `convex/crons.ts`

```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily at 9 AM EST (13:00 UTC) — create payment due notifications
crons.daily(
  "check_payment_due_dates",
  { hourUTC: 13, minuteUTC: 0 },
  internal.fintrack.notifications.checkPaymentDueDates
);

export default crons;
```

---

## ARCHIVOS NUEVOS — FRONTEND (hag-fintrack)

### `src/components/cards/CreditCardCard.tsx`

```tsx
"use client";
import { useMutation } from "convex/react";
import { api } from "@/lib/convex";
import { formatMoney } from "@/lib/money";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Doc } from "@convex-api/dataModel";
import { CreditCardFormDialog } from "./CreditCardFormDialog";

type CreditCard = Doc<"fintrack_credit_cards"> & {
  account: Doc<"fintrack_accounts"> | null;
};

function daysUntilDay(dueDay: number): number {
  const today = new Date();
  const todayDay = today.getDate();
  if (dueDay >= todayDay) return dueDay - todayDay;
  const next = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  return Math.ceil((next.getTime() - today.getTime()) / 86_400_000);
}

function utilizationColor(ratio: number): string {
  if (ratio >= 0.7) return "var(--color-ft-bad)";
  if (ratio >= 0.3) return "var(--color-ft-warn)";
  return "var(--color-ft-good)";
}

export function CreditCardCard({ card }: { card: CreditCard }) {
  const t = useTranslations("cards");
  const remove = useMutation(api.fintrack.cards.remove);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const account = card.account;
  const balanceCents = account ? Math.abs(account.balanceCents) : 0;
  const utilization = card.creditLimitCents > 0 ? balanceCents / card.creditLimitCents : 0;
  const utilizationPct = Math.min(utilization * 100, 100);
  const days = daysUntilDay(card.paymentDueDay);
  const currency = account?.currencyCode ?? "USD";

  const dueColor =
    days === 0 ? "var(--color-ft-bad)"
    : days <= 3 ? "var(--color-ft-warn)"
    : "var(--color-ft-text-2)";

  return (
    <>
      <div
        className="rounded-xl border p-5 flex flex-col gap-4 group relative"
        style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: "var(--color-ft-text)" }}>
              {account?.name ?? "—"}
            </p>
            {account?.bankName && (
              <p className="text-xs truncate" style={{ color: "var(--color-ft-text-3)" }}>
                {account.bankName}
              </p>
            )}
          </div>
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
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 top-6 z-20 rounded-lg border shadow-lg py-1 min-w-[120px]"
                  style={{ backgroundColor: "var(--color-ft-surface-2)", borderColor: "var(--color-ft-border)" }}
                >
                  <button
                    onClick={() => { setMenuOpen(false); setEditOpen(true); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-ft-surface)]"
                    style={{ color: "var(--color-ft-text-2)" }}
                  >
                    <Pencil className="h-3 w-3" /> {t("editCard")}
                  </button>
                  <button
                    onClick={async () => { setMenuOpen(false); await remove({ id: card._id }); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-[var(--color-ft-surface)]"
                    style={{ color: "var(--color-ft-bad)" }}
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Balance + Limit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("balance")}</p>
            <p className="font-bold ft-num mt-0.5" style={{ color: "var(--color-ft-bad)" }}>
              {formatMoney(balanceCents, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("creditLimit")}</p>
            <p className="font-bold ft-num mt-0.5" style={{ color: "var(--color-ft-text)" }}>
              {formatMoney(card.creditLimitCents, currency)}
            </p>
          </div>
        </div>

        {/* Utilization bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--color-ft-text-3)" }}>{t("utilization")}</span>
            <span className="font-mono" style={{ color: utilizationColor(utilization) }}>
              {utilizationPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-ft-border)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${utilizationPct}%`, backgroundColor: utilizationColor(utilization) }}
            />
          </div>
        </div>

        {/* Closing + Due */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p style={{ color: "var(--color-ft-text-3)" }}>{t("closingDay")}</p>
            <p className="mt-0.5" style={{ color: "var(--color-ft-text-2)" }}>
              {t("closesOn", { day: card.closingDay })}
            </p>
          </div>
          <div>
            <p style={{ color: "var(--color-ft-text-3)" }}>{t("dueDay")}</p>
            <p className="mt-0.5 font-medium" style={{ color: dueColor }}>
              {days === 0 ? t("dueToday") : t("daysUntilDue", { days })}
            </p>
          </div>
        </div>

        {/* Min payment */}
        <div
          className="flex items-center justify-between pt-3 border-t"
          style={{ borderColor: "var(--color-ft-border)" }}
        >
          <span className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("minPayment")}</span>
          <span className="text-sm font-mono font-medium" style={{ color: "var(--color-ft-text-2)" }}>
            {formatMoney(card.minimumPaymentCents, currency)}
          </span>
        </div>
      </div>

      <CreditCardFormDialog open={editOpen} onOpenChange={setEditOpen} card={card} />
    </>
  );
}
```

---

### `src/components/cards/CreditCardFormDialog.tsx`

```tsx
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
import type { Doc } from "@convex-api/dataModel";

type CreditCard = Doc<"fintrack_credit_cards"> & {
  account: Doc<"fintrack_accounts"> | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CreditCard;
}

const inputStyle = {
  backgroundColor: "var(--color-ft-surface-2)",
  borderColor: "var(--color-ft-border)",
  color: "var(--color-ft-text)",
};

export function CreditCardFormDialog({ open, onOpenChange, card }: Props) {
  const t = useTranslations("cards");
  const tc = useTranslations("common");
  const accounts = useQuery(api.fintrack.accounts.list);
  const createMutation = useMutation(api.fintrack.cards.create);
  const updateMutation = useMutation(api.fintrack.cards.update);

  const isEdit = !!card;
  const creditAccounts = accounts?.filter((a: Doc<"fintrack_accounts">) => a.type === "credit") ?? [];

  const [accountId, setAccountId] = useState(card?.accountId ?? "");
  const [closingDay, setClosingDay] = useState(String(card?.closingDay ?? ""));
  const [paymentDueDay, setPaymentDueDay] = useState(String(card?.paymentDueDay ?? ""));
  const [creditLimit, setCreditLimit] = useState(card ? String(card.creditLimitCents / 100) : "");
  const [minPayment, setMinPayment] = useState(card ? String(card.minimumPaymentCents / 100) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setAccountId(card?.accountId ?? "");
    setClosingDay(String(card?.closingDay ?? ""));
    setPaymentDueDay(String(card?.paymentDueDay ?? ""));
    setCreditLimit(card ? String(card.creditLimitCents / 100) : "");
    setMinPayment(card ? String(card.minimumPaymentCents / 100) : "");
    setError("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const closing = parseInt(closingDay);
    const dueDay = parseInt(paymentDueDay);
    const limitCents = dollarsToCents(parseFloat(creditLimit) || 0);
    const minCents = dollarsToCents(parseFloat(minPayment) || 0);

    if (isNaN(closing) || closing < 1 || closing > 28) {
      setError("Closing day must be between 1 and 28"); return;
    }
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 28) {
      setError("Due day must be between 1 and 28"); return;
    }
    if (limitCents <= 0) {
      setError("Credit limit must be greater than 0"); return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await updateMutation({
          id: card._id,
          closingDay: closing,
          paymentDueDay: dueDay,
          creditLimitCents: limitCents,
          minimumPaymentCents: minCents,
        });
      } else {
        if (!accountId) { setError("Select an account"); setLoading(false); return; }
        await createMutation({
          accountId: accountId as Doc<"fintrack_accounts">["_id"],
          closingDay: closing,
          paymentDueDay: dueDay,
          creditLimitCents: limitCents,
          minimumPaymentCents: minCents,
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
            {isEdit ? t("editCard") : t("addCard")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("account")}</Label>
              {creditAccounts.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>
                  {t("noCreditAccounts")}
                </p>
              ) : (
                <Select value={accountId} onValueChange={(v) => { if (v) setAccountId(v); }}>
                  <SelectTrigger className="w-full" style={inputStyle}>
                    <SelectValue placeholder="Select credit account" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditAccounts.map((a: Doc<"fintrack_accounts">) => (
                      <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>
                {t("closingDay")} <span style={{ color: "var(--color-ft-text-3)" }}>(1–28)</span>
              </Label>
              <Input type="number" min="1" max="28" value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)} placeholder="25" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>
                {t("dueDay")} <span style={{ color: "var(--color-ft-text-3)" }}>(1–28)</span>
              </Label>
              <Input type="number" min="1" max="28" value={paymentDueDay}
                onChange={(e) => setPaymentDueDay(e.target.value)} placeholder="15" style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("creditLimit")}</Label>
              <Input type="number" min="0" step="0.01" value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)} placeholder="5000.00" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>{t("minPayment")}</Label>
              <Input type="number" min="0" step="0.01" value={minPayment}
                onChange={(e) => setMinPayment(e.target.value)} placeholder="25.00" style={inputStyle} />
            </div>
          </div>
          {error && <p className="text-sm" style={{ color: "var(--color-ft-bad)" }}>{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={loading}
              style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>
              {loading ? tc("loading") : isEdit ? tc("save") : t("addCard")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

### `src/components/cards/CardsList.tsx`

```tsx
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
    return <p className="text-sm" style={{ color: "var(--color-ft-text-3)" }}>{tc("loading")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}
          style={{ backgroundColor: "var(--color-ft-primary)", color: "#080d18" }}>
          <Plus className="h-4 w-4 mr-1.5" />
          {t("addCard")}
        </Button>
      </div>
      {cards.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 flex flex-col items-center gap-2"
          style={{ borderColor: "var(--color-ft-border)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--color-ft-text-2)" }}>{t("noCards")}</p>
          <p className="text-xs text-center max-w-xs" style={{ color: "var(--color-ft-text-3)" }}>{t("noCardsHint")}</p>
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
```

---

### `src/components/layout/NotificationBell.tsx`

```tsx
"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";
import { Bell } from "lucide-react";
import { useState } from "react";
import type { Doc } from "@convex-api/dataModel";

export function NotificationBell() {
  const notifications = useQuery(api.fintrack.notifications.listUnread);
  const markAllRead = useMutation(api.fintrack.notifications.markAllRead);
  const [open, setOpen] = useState(false);

  const count = notifications?.length ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1.5 rounded-lg transition-colors hover:bg-[var(--color-ft-surface-2)]"
        style={{ color: "var(--color-ft-text-3)" }}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full flex items-center justify-center text-[10px] font-bold px-0.5"
            style={{ backgroundColor: "var(--color-ft-bad)", color: "#fff" }}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-9 z-20 rounded-xl border shadow-xl w-72 overflow-hidden"
            style={{ backgroundColor: "var(--color-ft-surface)", borderColor: "var(--color-ft-border)" }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b"
              style={{ borderColor: "var(--color-ft-border)" }}>
              <span className="text-xs font-semibold" style={{ color: "var(--color-ft-text)" }}>
                Notifications
              </span>
              {count > 0 && (
                <button onClick={() => { void markAllRead(); }}
                  className="text-[10px] transition-opacity hover:opacity-70"
                  style={{ color: "var(--color-ft-primary)" }}>
                  Mark all read
                </button>
              )}
            </div>
            {count === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: "var(--color-ft-text-3)" }}>
                No new notifications
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y" style={{ borderColor: "var(--color-ft-border)" }}>
                {notifications!.map((n: Doc<"fintrack_notifications">) => (
                  <div key={n._id} className="px-3 py-2.5">
                    <p className="text-xs leading-snug" style={{ color: "var(--color-ft-text)" }}>
                      {n.message}
                    </p>
                    <span
                      className="mt-1 inline-block text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                      style={{
                        color: n.severity === "urgent" ? "var(--color-ft-bad)"
                          : n.severity === "warning" ? "var(--color-ft-warn)"
                          : "var(--color-ft-text-3)",
                        backgroundColor: n.severity === "urgent"
                          ? "color-mix(in srgb, var(--color-ft-bad) 12%, transparent)"
                          : n.severity === "warning"
                          ? "color-mix(in srgb, var(--color-ft-warn) 12%, transparent)"
                          : "var(--color-ft-border)",
                      }}
                    >
                      {n.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

---

## ARCHIVOS MODIFICADOS

### `src/app/(dashboard)/cards/page.tsx`

```tsx
import { getTranslations } from "next-intl/server";
import { CardsList } from "@/components/cards/CardsList";

export default async function CardsPage() {
  const t = await getTranslations("cards");
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
      <CardsList />
    </div>
  );
}
```

### `src/components/layout/Topbar.tsx` — cambio relevante

```tsx
// Import agregado:
import { NotificationBell } from "@/components/layout/NotificationBell";

// En la toolbar (antes de LanguageSelector):
<NotificationBell />
```

### `messages/en.json` — sección "cards"

```json
"cards": {
  "title": "Credit Cards",
  "subtitle": "Track your credit cards and payment due dates",
  "addCard": "Add Card",
  "editCard": "Edit Card",
  "creditLimit": "Credit Limit",
  "closingDay": "Closing Day",
  "dueDay": "Due Day",
  "minPayment": "Min. Payment",
  "balance": "Balance",
  "utilization": "Utilization",
  "account": "Account",
  "noCards": "No credit cards yet",
  "noCardsHint": "Link a credit account to track due dates and utilization",
  "noCreditAccounts": "No credit accounts found. Add a credit account first.",
  "daysUntilDue": "{days} days until due",
  "dueToday": "Due today",
  "closesOn": "Closes on day {day}",
  "dueOn": "Due on day {day}"
}
```

### `messages/es.json` — sección "cards"

```json
"cards": {
  "title": "Tarjetas de Crédito",
  "subtitle": "Sigue tus tarjetas y fechas de pago",
  "addCard": "Agregar Tarjeta",
  "editCard": "Editar Tarjeta",
  "creditLimit": "Límite de Crédito",
  "closingDay": "Día de Cierre",
  "dueDay": "Día de Pago",
  "minPayment": "Pago Mínimo",
  "balance": "Saldo",
  "utilization": "Utilización",
  "account": "Cuenta",
  "noCards": "Sin tarjetas de crédito",
  "noCardsHint": "Vincula una cuenta de crédito para seguir fechas de pago y utilización",
  "noCreditAccounts": "No se encontraron cuentas de crédito. Agrega una primero.",
  "daysUntilDue": "{days} días para el pago",
  "dueToday": "Vence hoy",
  "closesOn": "Cierra el día {day}",
  "dueOn": "Pago el día {day}"
}
```

---

## FIXES DE TYPECHECK

Se agregaron tipos explícitos en parámetros de callbacks donde TypeScript no podía inferir el tipo desde `useQuery`:

| Archivo | Fix |
|---------|-----|
| `TransactionsList.tsx` | `(c: Doc<"fintrack_categories">)`, `(a: Doc<"fintrack_accounts">)`, `(acc: {...}, tx: Transaction)`, `(tx: Transaction, i: number)` |
| `TransactionFormDialog.tsx` | `(a: Doc<"fintrack_accounts">)` en find/filter/map, `(c: Doc<"fintrack_categories">)` en map |
| `CSVImportDialog.tsx` | `(a: Doc<"fintrack_accounts">)` en find y map |
| `AccountsList.tsx` | `(account: Doc<"fintrack_accounts">)` en map |
| `CardsList.tsx` | `(card: CreditCard)` en map |
| `CreditCardFormDialog.tsx` | `(a: Doc<"fintrack_accounts">)` en filter y map |
| `NotificationBell.tsx` | `(n: Doc<"fintrack_notifications">)` en map |

---

## DECISIONES CLAVE

1. **`cards.list` hace JOIN con accounts en el handler (N+1 queries).** Aceptable en Fase 1 con volumen bajo; en Fase 2 se puede desnormalizar `accountName/bankName` en la tabla.

2. **`checkPaymentDueDates` usa `typeKey = payment_due_{card._id}_{year}_{month}`** para idempotencia. Re-ejecución del cron el mismo día no duplica notificaciones.

3. **`daysUntilDay()` en el frontend usa `new Date()` local, no UTC.** Mismo comportamiento que `parseDateSafe()` en el backend.

4. **Threshold de notificación = 5 días** antes del vencimiento. Hardcoded en `notifications.ts`. Pendiente hacerlo configurable en settings (fuera del scope de Bloque 6).

5. **Estado vacío en `CardsList`** muestra hint de "add a credit account first" si no hay cuentas de tipo `credit` en el selector.
