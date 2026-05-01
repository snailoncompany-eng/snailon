import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWhopCheckout } from "@/lib/whop";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { mad } = await req.json();
  const amount = Number(mad);
  if (!Number.isFinite(amount) || amount < 50) {
    return NextResponse.json({ error: "minimum 50 MAD" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!merchant) return NextResponse.json({ error: "merchant not found" }, { status: 404 });

  try {
    const { url } = await createWhopCheckout({ merchantId: merchant.id, amountMad: amount });
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "checkout failed" }, { status: 500 });
  }
}
