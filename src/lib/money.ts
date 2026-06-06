export const centsToDollars = (c: number) => c / 100;

export const dollarsToCents = (d: number): number => {
  const result = Math.round(d * 100);
  if (!Number.isFinite(result) || !Number.isInteger(result))
    throw new Error("Invalid money value");
  return result;
};

export const formatMoney = (cents: number, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  }
};

export const formatMoneyCompact = (cents: number, currency = "USD"): string => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(cents / 100);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(cents / 100);
  }
};
