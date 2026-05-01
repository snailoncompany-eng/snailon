import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIERS, PRICING, type Tier } from "@/lib/pricing";
import { createDynamicPlan } from "@/lib/whop";
import CheckoutClient from "@/components/checkout/checkout-client";
import { Logo } from "@/components/ui/logo";

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

  if (!merchant) redirect("/dashboard");

  const visibleTiers = TIERS.filter((t) => !(t.isFounding && merchant.is_founding));

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

  const balance = Number(merchant.balance_mad ?? 0);

  return (
    <main className="min-h-screen bg-bg text-ink">
      <link rel="preconnect" href="https://js.whop.com" crossOrigin="" />
      <link rel="preconnect" href="https://api.whop.com" crossOrigin="" />
      <link rel="dns-prefetch" href="https://whop.com" />
      <link rel="preload" as="script" href="https://js.whop.com/static/checkout/loader.js" />

      <nav className="px-5 sm:px-8 lg:px-12 py-5 flex items-center justify-between max-w-7xl mx-auto border-b border-line">
        <Logo />
        <Link href="/dashboard" className="btn btn-ghost text-sm">
          ← Back to dashboard
        </Link>
      </nav>

      <section className="px-5 sm:px-8 lg:px-12 py-10 sm:py-14 max-w-6xl mx-auto">
        <div className="max-w-2xl">
          <p className="eyebrow eyebrow-accent">top up wallet</p>
          <h1 className="headline text-4xl sm:text-6xl mt-2">
            Add credit. <span className="italic text-accent">Pay in seconds.</span>
          </h1>
          <p className="mt-4 text-muted">
            Current balance: <span className="text-ink font-medium">{balance.toFixed(2)} MAD</span>
            {merchant.is_founding && (
              <>
                {" "}·{" "}
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-soft">
                  <span className="dot bg-accent" />
                  <span className="eyebrow eyebrow-accent !text-[10px]">founding · +{merchant.founding_bonus_pct}%</span>
                </span>
              </>
            )}
          </p>
        </div>

        <CheckoutClient
          tiers={prepared}
          merchantEmail={merchant.email}
          merchantBusinessName={merchant.business_name}
          initialBalance={balance}
          isAlreadyFounding={!!merchant.is_founding}
        />
      </section>
    </main>
  );
}
