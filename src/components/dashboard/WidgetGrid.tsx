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

type WidgetId = "net-worth" | "income" | "expenses" | "cashflow";

const DEFAULT_ORDER: WidgetId[] = ["net-worth", "income", "expenses", "cashflow"];
const STORAGE_KEY = "ft-widget-order";

export function WidgetGrid() {
  const t = useTranslations("dashboard");
  const [order, setOrder] = useState<WidgetId[]>(DEFAULT_ORDER);
  const netWorthCents = useQuery(api.fintrack.accounts.netWorthCents) ?? 0;
  const now = new Date();
  const stats = useQuery(api.fintrack.transactions.monthlyStats, {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
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
      <StatCard label={t("netWorth")} valueCents={netWorthCents} color="var(--color-ft-primary)" />
    ),
    income: (
      <StatCard label={t("monthlyIncome")} valueCents={stats.incomeCents} color="var(--color-ft-good)" />
    ),
    expenses: (
      <StatCard label={t("monthlyExpenses")} valueCents={stats.expensesCents} color="var(--color-ft-bad)" />
    ),
    cashflow: (
      <StatCard label={t("cashFlow")} valueCents={stats.cashflowCents} color="var(--color-ft-warn)" />
    ),
  };

  return (
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
  );
}
