import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatform } from "@/lib/snailon-platforms/catalog";
import { snippetFor } from "@/lib/snailon-stores/snippets";
import type { SnailonPlatform } from "@/lib/snailon-ingest/types";
import SnippetCard from "../components/SnippetCard";
import LiveStatus from "../components/LiveStatus";
import PlatformGuide from "../components/PlatformGuide";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { platform: string };
  searchParams: { store?: string };
}

export default async function PlatformInstallPage({
  params,
  searchParams,
}: PageProps) {
  const platform = getPlatform(params.platform);
  if (!platform) notFound();

  const storeId = searchParams.store;
  if (!storeId) redirect("/dashboard/connect");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Resolve merchant + ownership-scoped store fetch via admin client.
  // Mirrors the pattern used by the existing /api/integrations/[id]/disconnect
  // route, so anyone reading either file finds the same approach.
  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!merchant) notFound();

  const { data: row } = await admin
    .from("store_connections")
    .select(
      "id, store_name, platform, primary_domain, pixel_token, connection_status, first_order_at, last_order_at"
    )
    .eq("id", storeId)
    .eq("merchant_id", merchant.id)
    .maybeSingle();

  if (!row) notFound();

  const store = {
    id: row.id,
    name: row.store_name,
    platform: row.platform,
    primary_domain: row.primary_domain,
    public_key: row.pixel_token,
    connection_status: row.connection_status,
  };

  const snippet = snippetFor(store.platform as SnailonPlatform, store.public_key);
  const adminLink = platform.steps[0]?.link?.pattern.replace(
    "{{DOMAIN}}",
    store.primary_domain
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10">
        <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: platform.accent }}
            aria-hidden
          />
          {platform.name} &middot; {store.primary_domain}
        </p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight text-stone-900 md:text-5xl">
          Paste this on your store
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-600">
          {platform.description}
        </p>
      </header>

      <PlatformGuide platform={platform} adminLink={adminLink} />

      <SnippetCard snippet={snippet} platform={platform} storeId={store.id} />

      <LiveStatus
        storeId={store.id}
        initialStatus={store.connection_status}
      />

      {platform.troubleshooting.length > 0 && (
        <details className="mt-10 rounded-xl border border-stone-200 bg-stone-50/40 px-5 py-4 [&_summary]:cursor-pointer">
          <summary className="font-serif text-base text-stone-800">
            Something not working?
          </summary>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-600">
            {platform.troubleshooting.map((t: string, i: number) => (
              <li key={i} className="flex gap-3">
                <span
                  className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400"
                  aria-hidden
                />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
