"use client";
import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/money";

interface Props {
  balanceCents: number;
  interestRateBps: number;
  monthlyPaymentCents: number;
  currencyCode: string;
  paidInstallments?: number;
  totalTermMonths?: number;
}

interface Row {
  month: number;
  paymentCents: number;
  interestCents: number;
  principalCents: number;
  remainingCents: number;
}

function buildSchedule(
  balanceCents: number,
  annualRateBps: number,
  monthlyPaymentCents: number,
  maxMonths: number
): Row[] | "insufficient" {
  const monthlyRate = annualRateBps / 100 / 100 / 12;
  const firstInterest = Math.round(balanceCents * monthlyRate);

  // Si el pago no supera el interés del primer mes, el capital nunca decrece
  if (monthlyPaymentCents <= firstInterest) return "insufficient";

  const rows: Row[] = [];
  let remaining = balanceCents;
  let month = 1;

  while (remaining > 0 && month <= maxMonths) {
    const interestCents = Math.round(remaining * monthlyRate);
    const payment = Math.min(monthlyPaymentCents, remaining + interestCents);
    const principal = payment - interestCents;
    remaining = Math.max(0, remaining - principal);
    rows.push({ month, paymentCents: payment, interestCents, principalCents: principal, remainingCents: remaining });
    month++;
  }

  return rows;
}

export function AmortizationTable({
  balanceCents,
  interestRateBps,
  monthlyPaymentCents,
  currencyCode,
  paidInstallments = 0,
  totalTermMonths,
}: Props) {
  const t = useTranslations("debts");

  // Usar totalTermMonths como límite cuando exista (tabla contractual); sino estimación hasta 360
  const maxMonths = totalTermMonths ?? 360;
  const result = buildSchedule(balanceCents, interestRateBps, monthlyPaymentCents, maxMonths);

  const fmt = (cents: number) => formatMoney(cents, currencyCode);

  if (result === "insufficient") {
    return (
      <div
        className="rounded-lg border px-4 py-3 text-xs"
        style={{ borderColor: "var(--color-ft-warn)", color: "var(--color-ft-warn)" }}
      >
        {t("amortizationInsufficientPayment")}
      </div>
    );
  }

  if (result.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold" style={{ color: "var(--color-ft-text)" }}>
        {t("amortization")}
      </p>
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--color-ft-border)" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: "var(--color-ft-surface-2)", color: "var(--color-ft-text-3)" }}>
              <th className="px-3 py-2 text-left font-medium">{t("colMonth")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("colPayment")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("colInterest")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("colPrincipal")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("colBalance")}</th>
            </tr>
          </thead>
          <tbody>
            {result.map((row) => {
              const isPaid = row.month <= paidInstallments;
              return (
                <tr
                  key={row.month}
                  style={{
                    backgroundColor: isPaid
                      ? "color-mix(in srgb, var(--color-ft-good) 8%, transparent)"
                      : row.month % 2 === 0
                      ? "var(--color-ft-surface-2)"
                      : "transparent",
                    color: isPaid ? "var(--color-ft-text-3)" : "var(--color-ft-text)",
                    opacity: isPaid ? 0.6 : 1,
                  }}
                >
                  <td className="px-3 py-1.5 font-mono">
                    {row.month}
                    {isPaid && (
                      <span
                        className="ml-1.5 text-[9px] font-semibold"
                        style={{ color: "var(--color-ft-good)" }}
                      >
                        ✓
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmt(row.paymentCents)}</td>
                  <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--color-ft-warn)" }}>
                    {fmt(row.interestCents)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--color-ft-good)" }}>
                    {fmt(row.principalCents)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmt(row.remainingCents)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
