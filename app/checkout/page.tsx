import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIERS, PRICING } from "@/lib/pricing";
import CheckoutClient from "@/components/checkout-client";
import Link from "next/link";

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

  return (
    <main className="grain min-h-screen bg-cream text-ink">
      <nav className="flex items-center justify-between px-6 md:px-12 py-6 border-b border-sand">
        <Link href="/" className="serif text-2xl tracking-tightest">
          snailon
        </Link>
        <div className="flex items-center gap-6 mono text-xs uppercase tracking-[0.18em] text-clay">
          <Link href="/dashboard" className="hover:text-terracotta">← back to dashboard</Link>
        </div>
      </nav>

      <section className="px-6 md:px-12 pt-12 pb-20 max-w-5xl mx-auto">
        <p className="mono text-xs uppercase tracking-[0.25em] text-terracotta">
          ⌬ &nbsp; top up your wallet
        </p>
        <h1 className="serif text-5xl md:text-6xl tracking-tightest leading-[0.95] mt-3">
          Add credit. <span className="italic text-terracotta">No leaving the page.</span>
        </h1>
        <p className="mt-4 text-clay max-w-xl">
          Current balance: <b className="text-ink">{(merchant?.balance_mad ?? 0).toFixed(2)} MAD</b>{" "}
          ({Math.floor((merchant?.balance_mad ?? 0) / PRICING.pricePerConfirmedOrderMad)} confirmations).
          {merchant?.is_founding && (
            <span className="ml-2 mono text-xs uppercase tracking-wider bg-ink text-cream px-2 py-1">
              founding +{merchant.founding_bonus_pct}% forever
            </span>
          )}
        </p>

        <CheckoutClient
          tiers={TIERS}
          isAlreadyFounding={!!merchant?.is_founding}
        />
      </section>
    </main>
  );
}
