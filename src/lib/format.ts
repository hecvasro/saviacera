/**
 * Formats a numeric amount as Dominican pesos.
 * Uses es-DO locale + DOP currency. Defaults to no fractional part because
 * the catalog is priced in whole pesos. Pass `withCents: true` for invoices
 * or anywhere you need RD$1,250.50.
 */
export function formatDOP(amount: number, opts: { withCents?: boolean } = {}): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: opts.withCents ? 2 : 0,
    maximumFractionDigits: opts.withCents ? 2 : 0,
  }).format(amount);
}
