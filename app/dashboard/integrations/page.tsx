import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import IntegrationsClient from "@/components/integrations-client";

export default async function IntegrationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle();

  const [{ data: stores }, { data: carriers }] = await Promise.all([
    admin
      .from("store_connections")
      .select(
        "id, platform, detected_platform, store_name, store_url, last_synced_at, product_count, capabilities, pending_step, pixel_token, is_active, created_at"
      )
      .eq("merchant_id", merchant?.id)
      .order("created_at", { ascending: false }),
    admin
      .from("carrier_connections")
      .select("id, platform, is_active, created_at, metadata")
      .eq("merchant_id", merchant?.id),
  ]);

  return (
    <div>
      <p className="mono text-[10px] uppercase tracking-[0.25em] text-terracotta">integrations</p>
      <h1 className="serif text-5xl tracking-tightest mt-2">
        Connect your store. <span className="italic text-terracotta">In seconds.</span>
      </h1>
      <p className="text-clay mt-2 max-w-xl">
        Paste your store address. We do the rest — find your products, sync
        your orders, recover abandoned carts, line up delivery.
      </p>

      <IntegrationsClient
        connectedStores={stores ?? []}
        connectedCarriers={carriers ?? []}
      />
    </div>
  );
}
