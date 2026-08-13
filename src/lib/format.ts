export const DEFAULT_CURRENCY = "COP";

export function formatMoney(value: number | string | null | undefined, currency = DEFAULT_CURRENCY) {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatCompactMoney(value: number | string | null | undefined) {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat("es-CO", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatPercent(value: number | string | null | undefined) {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  return `${(Number.isFinite(amount) ? amount : 0).toFixed(1)}%`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function unitMargin(price: number, cost: number) {
  const profit = price - cost;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  return { profit, margin };
}
