/**
 * Normalize a phone number to E.164. Moroccan-aware:
 *   06xxxxxxxx → +2126xxxxxxxx
 *   07xxxxxxxx → +2127xxxxxxxx
 *
 * Returns null for anything that doesn't have at least 9 digits, so the
 * caller can detect "no phone yet" and flag the order needs_phone=true.
 */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Strip everything except digits and a leading +
  const cleaned = trimmed.replace(/[^\d+]/g, "");
  let digits = cleaned.replace(/^\+/, "");

  if (!digits) return null;

  // 00 → + (very common in MA/Europe paste)
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Moroccan local format: 0[67]XXXXXXXX
  if (/^0[67]\d{8}$/.test(digits)) {
    return "+212" + digits.slice(1);
  }

  // Already with 212 prefix without +
  if (/^212[67]\d{8}$/.test(digits)) {
    return "+" + digits;
  }

  // Anything else with at least 9 digits — assume the caller put a country code in.
  if (digits.length >= 9 && digits.length <= 15) {
    return "+" + digits;
  }

  return null;
}
