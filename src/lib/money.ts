export const centsToDollars = (c: number) => c / 100;

export const dollarsToCents = (d: number): number => {
  const result = Math.round(d * 100);
  if (!Number.isFinite(result) || !Number.isInteger(result))
    throw new Error("Invalid money value");
  return result;
};

export const formatMoney = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
