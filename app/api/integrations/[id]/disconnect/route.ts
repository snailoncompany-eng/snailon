import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!merchant) return NextResponse.json({ error: "merchant not found" }, { status: 404 });

  // Try store_connections first; if no row, try carrier_connections.
  const storeRes = await admin
    .from("store_connections")
    .delete()
    .eq("id", params.id)
    .eq("merchant_id", merchant.id);

  if (!storeRes.error && (storeRes.count ?? 0) > 0) {
    return NextResponse.json({ ok: true, kind: "store" });
  }

  const carrierRes = await admin
    .from("carrier_connections")
    .delete()
    .eq("id", params.id)
    .eq("merchant_id", merchant.id);

  return NextResponse.json({ ok: true, kind: "carrier" });
}
