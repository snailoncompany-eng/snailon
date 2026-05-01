import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIERS, PRICING, type Tier } from "@/lib/pricing";
import { createDynamicPlan } from "@/lib/whop";
import CheckoutClient from "@/components/checkout/checkout-client";

export const dynamic = "force-dynamic";

type PreparedTier = Tier & { planId: string | null; planError: string | null };

export default async function CheckoutPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/checkout");

  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id, business_name, email, balance_mad, is_founding, founding_bonus_pct")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!merchant) {
    // Edge case: signed-in user with no merchant row. Send to dashboard which
    // will display a "finishing setup" state.
    redirect("/dashboard");
  }

  const visibleTiers = TIERS.filter((t) => !(t.isFounding && merchant.is_founding));

  // Pre-create all plans in parallel, server-side, BEFORE we send HTML.
  // The client gets fully-formed plan IDs in props — no waterfall, no extra
  // round trip after page load.
  const prepared: PreparedTier[] = await Promise.all(
    visibleTiers.map(async (tier): Promise<PreparedTier> => {
      try {
        const { plan_id } = await createDynamicPlan({
          merchantId: merchant.id,
          amountMad: tier.amountMad,
          bonusMad: tier.bonusMad,
          isFounding: tier.isFounding,
          tierLabel: tier.label,
        });
        return { ...tier, planId: plan_id, planError: null };
      } catch (e: any) {
        return { ...tier, planId: null, planError: e.message ?? "plan creation failed" };
      }
    })
  );

  return (
    <main className="min-h-screen bg-cream text-ink">
      {/* Pre-warm Whop assets — they'll be ready by the time the iframe mounts */}
      <link rel="preconnect" href="https://js.whop.com" crossOrigin="" />
      <link rel="preconnect" href="https://api.whop.com" crossOrigin="" />
      <link rel="dns-prefetch" href="https://whop.com" />
      <link rel="preload" as="script" href="https://js.whop.com/static/checkout/loader.js" />

      <nav className="flex items-center justify-between px-6 md:px-12 py-6 border-b border-sand">
        <Link href="/" className="serif text-2xl tracking-tightest">
          snailon
        </Link>
        <Link
          href="/dashboard"
          className="mono text-[11px] uppercase tracking-[0.2em] text-clay hover:text-terracotta"
        >
          ← back
        </Link>
      </nav>

      <section className="px-6 md:px-12 pt-10 md:pt-16 pb-20 max-w-6xl mx-auto">
        <p className="mono text-[10px] uppercase tracking-[0.25em] text-terracotta">
          ⌬ &nbsp; top up wallet
        </p>
        <h1 className="serif text-5xl md:text-7xl tracking-tightest leading-[0.95] mt-2">
          Add credit. <span className="italic text-terracotta">Pay in seconds.</span>
        </h1>
        <p className="mt-4 text-clay max-w-xl">
          Current balance:{" "}
          <b className="text-ink">{Number(merchant.balance_mad ?? 0).toFixed(2)} MAD</b>
          {merchant.is_founding && (
            <>
              {" "}·{" "}
              <span className="mono text-[11px] uppercase tracking-wider text-terracotta">
                founding +{merchant.founding_bonus_pct}% on every top-up
              </span>
            </>
          )}
        </p>

        <CheckoutClient
          tiers={prepared}
          merchantEmail={merchant.email}
          merchantBusinessName={merchant.business_name}
          initialBalance={Number(merchant.balance_mad ?? 0)}
          isAlreadyFounding={!!merchant.is_founding}
        />
      </section>
    </main>
  );
}
