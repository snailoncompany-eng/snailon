import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listStorePlatforms, listCarrierPlatforms } from "@/lib/integrations/registry";
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
      .select("id, platform, store_name, store_url, last_synced_at, product_count, is_active, created_at")
      .eq("merchant_id", merchant?.id),
    admin
      .from("carrier_connections")
      .select("id, platform, is_active, created_at, metadata")
      .eq("merchant_id", merchant?.id),
  ]);

  return (
    <div>
      <p className="mono text-[10px] uppercase tracking-[0.25em] text-terracotta">integrations</p>
      <h1 className="serif text-5xl tracking-tightest mt-2">
        Connect your <span className="italic">store.</span>
      </h1>
      <p className="text-clay mt-2 max-w-xl">
        Snailon syncs your catalog and ingests every new order in real time.
        Confirmed orders flow to your delivery partner automatically.
      </p>

      <IntegrationsClient
        availableStores={listStorePlatforms()}
        availableCarriers={listCarrierPlatforms()}
        connectedStores={stores ?? []}
        connectedCarriers={carriers ?? []}
      />
    </div>
  );
}
