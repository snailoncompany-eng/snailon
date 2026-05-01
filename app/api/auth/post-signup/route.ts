import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICING } from "@/lib/pricing";

// Called from signup form right after auth.signUp. We create the merchant
// row server-side (RLS-bypassing) and credit the signup bonus.
export async function POST(req: Request) {
  try {
    const { user_id, email, business_name, phone } = await req.json();
    if (!user_id || !email) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Idempotent: upsert by user_id.
    const { data: merchant, error } = await admin
      .from("merchants")
      .upsert(
        {
          user_id,
          email: String(email).toLowerCase(),
          business_name: business_name ?? null,
          phone: phone ?? null,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Grant signup bonus once. We check if there's already a signup_bonus tx.
    const { data: existing } = await admin
      .from("wallet_transactions")
      .select("id")
      .eq("merchant_id", merchant.id)
      .eq("type", "signup_bonus")
      .maybeSingle();

    if (!existing && PRICING.signupBonusMad > 0) {
      await admin.rpc("credit_wallet", {
        p_merchant_id: merchant.id,
        p_amount_mad: PRICING.signupBonusMad,
        p_type: "signup_bonus",
        p_reference: "signup",
        p_metadata: null,
      });
    }

    return NextResponse.json({ ok: true, merchant_id: merchant.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "bad request" }, { status: 400 });
  }
}
