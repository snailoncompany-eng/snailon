import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve the current authed user to their `merchants` row.
 *
 * The snailon schema separates auth.users (Supabase Auth) from the
 * domain-level `merchants` table. Most app data hangs off merchant_id,
 * not user_id — so any dashboard server endpoint needs this lookup.
 *
 * Returns null if there is no authed user OR if the user has no
 * `merchants` row yet (typically means onboarding incomplete). Callers
 * should treat that as a 401/404, not a generic auth error.
 */
export async function currentMerchant(
  sb: SupabaseClient
): Promise<{ user_id: string; merchant_id: string } | null> {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: merchant } = await sb
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!merchant) return null;
  return { user_id: user.id, merchant_id: merchant.id };
}
