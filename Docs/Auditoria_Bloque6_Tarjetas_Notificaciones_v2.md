# Auditoría Bloque 6 v2 — Tarjetas de Crédito + Notificaciones (fixes aplicados)

**Proyecto:** hag-fintrack / Landingpage-HAG-Partner  
**typecheck:** VERDE (0 errores)  
**Estado:** Correcciones post-auditoría v1 aplicadas (findings 1–5)

---

## CAMBIOS RESPECTO A v1

| Finding | Severidad | Fix |
|---------|-----------|-----|
| Notificaciones duplicadas al cruzar mes | Alta | `typeKey` basado en `dueDate` real, no en fecha del cron |
| Days aceptan decimales por API | Media | `Number.isInteger()` en backend + `step="1"` y validación estricta en frontend |
| Múltiples tarjetas por cuenta | Media | Query `by_account` antes del insert; rechaza si ya existe |
| Notif de cuentas inactivas | Media-baja | Carga account primero; skip si no existe, userId no coincide o `!isActive` |
| Strings hardcodeados sin i18n | Baja | Namespace `notifications` + `cards.selectAccount` + `tc("delete")` |

---

## BACKEND — ARCHIVOS MODIFICADOS

### `convex/fintrack/notifications.ts` (completo)

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
      // Fix 4: skip cards linked to inactive or missing accounts
      const account = await ctx.db.get(card.accountId);
      if (!account || account.userId !== card.userId || !account.isActive) continue;

      // Fix 1: compute dueDate first — typeKey must be keyed on the actual due date,
      // not today's year/month, to avoid duplicates when the cron runs near month boundary.
      const dueDate = new Date(year, month, card.paymentDueDay);
      if (card.paymentDueDay < todayDay) dueDate.setMonth(dueDate.getMonth() + 1);
      const typeKey = `payment_due_${card._id}_${dueDate.getFullYear()}_${dueDate.getMonth()}`;

      const daysUntilDue =
        card.paymentDueDay >= todayDay
          ? card.paymentDueDay - todayDay
          : Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);

      if (daysUntilDue > 5) continue;

      const existing = await ctx.db
        .query("fintrack_notifications")
        .withIndex("by_user", (q) => q.eq("userId", card.userId))
        .filter((q) => q.eq(q.field("type"), typeKey))
        .first();

      if (existing) continue;

      const message =
        daysUntilDue === 0
          ? `${account.name} payment is due today`
          : `${account.name} payment due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`;

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

### `convex/fintrack/cards.ts` (completo)

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
    // Fix 3: one card per account
    const existingCard = await ctx.db
      .query("fintrack_credit_cards")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .first();
    if (existingCard)
      throw new ConvexError("A credit card already exists for this account");
    validatePositiveCents(args.creditLimitCents, "creditLimitCents");
    validatePositiveCents(args.minimumPaymentCents, "minimumPaymentCents");
    // Fix 2: reject non-integer days
    if (!Number.isInteger(args.closingDay) || args.closingDay < 1 || args.closingDay > 28)
      throw new ConvexError("closingDay must be an integer between 1 and 28");
    if (!Number.isInteger(args.paymentDueDay) || args.paymentDueDay < 1 || args.paymentDueDay > 28)
      throw new ConvexError("paymentDueDay must be an integer between 1 and 28");
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
    if (fields.closingDay !== undefined &&
        (!Number.isInteger(fields.closingDay) || fields.closingDay < 1 || fields.closingDay > 28))
      throw new ConvexError("closingDay must be an integer between 1 and 28");
    if (fields.paymentDueDay !== undefined &&
        (!Number.isInteger(fields.paymentDueDay) || fields.paymentDueDay < 1 || fields.paymentDueDay > 28))
      throw new ConvexError("paymentDueDay must be an integer between 1 and 28");
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

## FRONTEND — ARCHIVOS MODIFICADOS

### `src/components/cards/CreditCardFormDialog.tsx` (completo)

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

    const closingRaw = Number(closingDay);
    const dueDayRaw = Number(paymentDueDay);
    const closing = Math.trunc(closingRaw);
    const dueDay = Math.trunc(dueDayRaw);
    const limitCents = dollarsToCents(parseFloat(creditLimit) || 0);
    const minCents = dollarsToCents(parseFloat(minPayment) || 0);

    if (!Number.isInteger(closingRaw) || closing < 1 || closing > 28) {
      setError("Closing day must be a whole number between 1 and 28");
      return;
    }
    if (!Number.isInteger(dueDayRaw) || dueDay < 1 || dueDay > 28) {
      setError("Due day must be a whole number between 1 and 28");
      return;
    }
    if (limitCents <= 0) {
      setError("Credit limit must be greater than 0");
      return;
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
                    <SelectValue placeholder={t("selectAccount")} />
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
              <Input
                type="number" min="1" max="28" step="1"
                value={closingDay} onChange={(e) => setClosingDay(e.target.value)}
                placeholder="25" style={inputStyle}
              />
            </div>
            <div className="space-y-1.5">
              <Label style={{ color: "var(--color-ft-text-2)" }}>
                {t("dueDay")} <span style={{ color: "var(--color-ft-text-3)" }}>(1–28)</span>
              </Label>
              <Input
                type="number" min="1" max="28" step="1"
                value={paymentDueDay} onChange={(e) => setPaymentDueDay(e.target.value)}
                placeholder="15" style={inputStyle}
              />
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

### `src/components/cards/CreditCardCard.tsx` — cambio relevante

```tsx
// Agregado:
const tc = useTranslations("common");

// "Remove" reemplazado por:
{tc("delete")}
```

---

### `src/components/layout/NotificationBell.tsx` — cambio relevante

```tsx
// Agregado import:
import { useTranslations } from "next-intl";

// Agregado hook:
const t = useTranslations("notifications");

// Strings reemplazadas:
"Notifications"        → {t("title")}
"Mark all read"        → {t("markAllRead")}
"No new notifications" → {t("noNotifications")}
```

---

## MENSAJES — CAMBIOS

### `messages/en.json`

```json
"cards": {
  ...
  "selectAccount": "Select credit account"   ← nuevo
},
"notifications": {                            ← namespace nuevo
  "title": "Notifications",
  "markAllRead": "Mark all read",
  "noNotifications": "No new notifications"
}
```

### `messages/es.json`

```json
"cards": {
  ...
  "selectAccount": "Selecciona una cuenta de crédito"   ← nuevo
},
"notifications": {                                       ← namespace nuevo
  "title": "Notificaciones",
  "markAllRead": "Marcar todo leído",
  "noNotifications": "Sin notificaciones nuevas"
}
```

---

## ARCHIVOS SIN CAMBIOS RESPECTO A v1

- `convex/crons.ts`
- `src/components/cards/CardsList.tsx`
- `src/app/(dashboard)/cards/page.tsx`
- `src/components/layout/Topbar.tsx`
- `messages/en.json` y `es.json` — secciones no relacionadas a cards/notifications

---

## DECISIONES CLAVE (sin cambios)

1. `cards.list` hace JOIN con accounts en el handler (N+1). Aceptable Fase 1.
2. Threshold de notificación = 5 días. Hardcoded, pendiente settings.
3. `daysUntilDay()` frontend usa `new Date()` local, consistente con backend.
