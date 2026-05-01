import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIERS, type Tier } from "@/lib/pricing";
import { createCheckoutSession } from "@/lib/whop";
import CheckoutClient from "@/components/checkout/checkout-client";

export const dynamic = "force-dynamic";

type PreparedTier = Tier & {
  sessionId: string | null;
  planId: string | null;
  purchaseUrl: string | null;
  error: string | null;
};

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

  if (!merchant) redirect("/dashboard");

  const visibleTiers = TIERS.filter((t) => !(t.isFounding && merchant.is_founding));

  // Pre-create all sessions in parallel server-side, before HTML is sent.
  const prepared: PreparedTier[] = await Promise.all(
    visibleTiers.map(async (tier): Promise<PreparedTier> => {
      try {
        const session = await createCheckoutSession({
          merchantId: merchant.id,
          amountMad: tier.amountMad,
          bonusMad: tier.bonusMad,
          isFounding: tier.isFounding,
          tierLabel: tier.label,
        });
        return {
          ...tier,
          sessionId: session.session_id,
          planId: session.plan_id,
          purchaseUrl: session.purchase_url,
          error: null,
        };
      } catch (e: any) {
        return {
          ...tier,
          sessionId: null,
          planId: null,
          purchaseUrl: null,
          error: e.message ?? "session creation failed",
        };
      }
    })
  );

  return (
    <main className="min-h-screen bg-cream text-ink">
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
