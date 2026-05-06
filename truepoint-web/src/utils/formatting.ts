export const formatCurrency = (
  amount: number,
  currency = "USD",
  locale = "en-US",
): string =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);

export const formatDate = (dateStr: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));

export const formatPct = (value: number, decimals = 2): string =>
  `${value.toFixed(decimals)}%`;

export const formatScore = (score: number): string => score.toFixed(1);
