import { formatMoney } from "@/lib/money";

export function StatCard({
  label,
  valueCents,
  color,
  currency = "USD",
  note,
}: {
  label: string;
  valueCents: number;
  color: string;
  currency?: string;
  note?: string;
}) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        backgroundColor: "var(--color-ft-surface)",
        borderColor: "var(--color-ft-border)",
      }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: "var(--color-ft-text-2)" }}
      >
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold ft-num" style={{ color }}>
        {formatMoney(valueCents, currency)}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div
          className="h-0.5 w-8 rounded-full"
          style={{ backgroundColor: color, opacity: 0.6 }}
        />
        {note && (
          <span className="text-xs" style={{ color: "var(--color-ft-text-3)" }}>
            {note}
          </span>
        )}
      </div>
    </div>
  );
}
