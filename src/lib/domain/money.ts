/**
 * All money in this codebase is represented as integer cents (never floats).
 * These helpers are the ONLY place formatting/rounding logic should live.
 */

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function formatCents(cents: number, opts?: { showCents?: boolean }): string {
  const dollars = cents / 100;
  const showCents = opts?.showCents ?? true;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });
}

/** Round-half-up integer cents math, used for percentage-based fees. */
export function percentOfCents(cents: number, percent: number): number {
  return Math.round((cents * percent) / 100);
}

export function clampMin(cents: number, minCents: number): number {
  return Math.max(cents, minCents);
}

export function sumCents(...values: number[]): number {
  return values.reduce((total, v) => total + Math.round(v), 0);
}
