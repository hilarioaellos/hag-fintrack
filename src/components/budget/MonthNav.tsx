"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "next-intl";

interface Props {
  year: number;
  month: number; // 1–12
  onChange: (year: number, month: number) => void;
}

export function MonthNav({ year, month, onChange }: Props) {
  const locale = useLocale();

  const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format(
    new Date(year, month - 1, 1)
  );
  const display = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const prev = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };
  const next = () => {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={prev}
        className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-ft-surface-2)]"
        style={{ color: "var(--color-ft-text-3)" }}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span
        className="text-sm font-semibold min-w-[140px] text-center"
        style={{ color: "var(--color-ft-text)" }}
      >
        {display} {year}
      </span>
      <button
        onClick={next}
        className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-ft-surface-2)]"
        style={{ color: "var(--color-ft-text-3)" }}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
