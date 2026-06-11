/**
 * Convert a Unix timestamp to a local YYYY-MM-DD string for <input type="date">.
 * Uses local getters (not toISOString/UTC) so the date matches what the user sees
 * in their timezone. Avoids the off-by-one-day shift for US timezones at midnight UTC.
 */
export function toLocalDateInput(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Convert a YYYY-MM-DD string from <input type="date"> to a Unix timestamp.
 * Appends T12:00:00 (local noon) before parsing so JavaScript treats the string
 * as local time, not UTC midnight. This keeps the stored date on the same calendar
 * day for all US timezones (UTC-4 to UTC-8).
 *
 * Note: UTC+13/+14 edge case not handled — acceptable for the target user base.
 */
export function dateInputToTimestamp(date: string): number {
  return new Date(date + "T12:00:00").getTime();
}

/** Same as toLocalDateInput but returns "" when ts is undefined/falsy. */
export function toLocalDateInputOpt(ts?: number): string {
  if (!ts) return "";
  return toLocalDateInput(ts);
}
