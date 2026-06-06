"use client";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import { SortableWidget } from "./SortableWidget";
import { StatCard } from "./widgets/StatCard";
import { CurrencySelector } from "@/components/ui/CurrencySelector";

type WidgetId = "net-worth" | "income" | "expenses" | "cashflow";

const DEFAULT_ORDER: WidgetId[] = ["net-worth", "income", "expenses", "cashflow"];
const STORAGE_KEY = "ft-widget-order";

export function WidgetGrid() {
  const t = useTranslations("dashboard");
  const [order, setOrder] = useState<WidgetId[]>(DEFAULT_ORDER);
  const [selected, setSelected] = useState<string | undefined>();

  const currencies = useQuery(api.fintrack.accounts.getDistinctCurrencies);
  const userSettings = useQuery(api.fintrack.user_settings.get);

  // Defensive resolution: local → defaultCurrency if active → first active → "USD"
  const effectiveCurrency = (() => {
    if (!currencies || currencies.length === 0) return userSettings?.defaultCurrency ?? "USD";
    if (selected && currencies.includes(selected)) return selected;
    const def = userSettings?.defaultCurrency ?? "USD";
    return currencies.includes(def) ? def : currencies[0];
  })();

  const now = new Date();
  const netWorthCents = useQuery(api.fintrack.accounts.netWorthCents, { currencyCode: effectiveCurrency }) ?? 0;
  const stats = useQuery(api.fintrack.transactions.monthlyStats, {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    currencyCode: effectiveCurrency,
  }) ?? { incomeCents: 0, expensesCents: 0, cashflowCents: 0 };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setOrder(JSON.parse(stored) as WidgetId[]);
    } catch {}
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as WidgetId);
    const newIndex = order.indexOf(over.id as WidgetId);
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const WIDGETS: Record<WidgetId, React.ReactNode> = {
    "net-worth": (
      <StatCard label={t("netWorth")} valueCents={netWorthCents} color="var(--color-ft-primary)" currency={effectiveCurrency} />
    ),
    income: (
      <StatCard label={t("monthlyIncome")} valueCents={stats.incomeCents} color="var(--color-ft-good)" currency={effectiveCurrency} />
    ),
    expenses: (
      <StatCard label={t("monthlyExpenses")} valueCents={stats.expensesCents} color="var(--color-ft-bad)" currency={effectiveCurrency} />
    ),
    cashflow: (
      <StatCard label={t("cashFlow")} valueCents={stats.cashflowCents} color="var(--color-ft-warn)" currency={effectiveCurrency} />
    ),
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <CurrencySelector value={effectiveCurrency} currencies={currencies} onChange={setSelected} />
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {order.map((id) => (
              <SortableWidget key={id} id={id}>
                {WIDGETS[id]}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
