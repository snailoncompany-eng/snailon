import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("balance_mad, is_founding, founding_bonus_pct")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json({ error: "merchant not found" }, { status: 404 });
  return NextResponse.json({
    balance_mad: Number(merchant.balance_mad),
    is_founding: merchant.is_founding,
    founding_bonus_pct: merchant.founding_bonus_pct,
  });
}
