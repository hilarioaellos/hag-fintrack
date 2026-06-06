"use client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  value: string;
  currencies: string[] | undefined;
  onChange: (code: string) => void;
}

export function CurrencySelector({ value, currencies, onChange }: Props) {
  if (currencies === undefined) {
    return (
      <div
        className="animate-pulse rounded-md h-7 w-16"
        style={{ backgroundColor: "var(--color-ft-surface-2)" }}
        aria-label="Loading currencies"
      />
    );
  }
  if (currencies.length <= 1) return null;

  return (
    <Select value={value} onValueChange={(v) => { if (v) onChange(v); }}>
      <SelectTrigger
        className="h-7 w-24 text-xs"
        aria-label="Select currency"
        style={{
          backgroundColor: "var(--color-ft-surface-2)",
          borderColor: "var(--color-ft-border)",
          color: "var(--color-ft-text-2)",
        }}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((c) => (
          <SelectItem key={c} value={c} className="text-xs">
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
