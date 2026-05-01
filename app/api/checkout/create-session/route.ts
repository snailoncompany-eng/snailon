import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDynamicPlan } from "@/lib/whop";
import { findTier } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/checkout/create-session
// Body: { tier_id: string }
// Returns: { plan_id, total_credit_mad, amount_mad, bonus_mad, is_founding }
//
// Creates a hidden one-time MAD-priced plan in Whop with metadata
// (merchant_id + mad_amount + bonus_mad + is_founding). The frontend
// embeds the Whop checkout iframe using the returned plan_id. The user
// never leaves snailon.com.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const tier = findTier(String(body.tier_id ?? ""));
  if (!tier) return NextResponse.json({ error: "invalid tier" }, { status: 400 });

  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!merchant) return NextResponse.json({ error: "merchant not found" }, { status: 404 });

  try {
    const plan = await createDynamicPlan({
      merchantId: merchant.id,
      amountMad: tier.amountMad,
      bonusMad: tier.bonusMad,
      isFounding: tier.isFounding,
      tierLabel: tier.label,
    });
    return NextResponse.json({
      plan_id: plan.plan_id,
      direct_link: plan.direct_link,
      amount_mad: tier.amountMad,
      bonus_mad: tier.bonusMad,
      total_credit_mad: tier.totalCreditMad,
      is_founding: tier.isFounding,
    });
  } catch (e: any) {
    console.error("checkout/create-session failed:", e);
    return NextResponse.json({ error: e.message ?? "checkout failed" }, { status: 500 });
  }
}
