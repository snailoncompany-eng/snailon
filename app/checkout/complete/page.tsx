import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findTier } from "@/lib/pricing";
import CompleteClient from "@/components/checkout-complete-client";

export default async function CheckoutCompletePage({
  searchParams,
}: {
  searchParams: { status?: string; receipt_id?: string; tier?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id, balance_mad, is_founding, founding_bonus_pct")
    .eq("user_id", user.id)
    .maybeSingle();

  const tier = searchParams.tier ? findTier(searchParams.tier) : undefined;
  const status = searchParams.status ?? "success";

  return (
    <main className="grain min-h-screen bg-cream text-ink flex items-center justify-center px-6">
      <div className="max-w-xl w-full">
        {status === "error" ? (
          <>
            <p className="mono text-xs uppercase tracking-[0.25em] text-terracotta">
              ⌬ &nbsp; payment failed
            </p>
            <h1 className="serif text-5xl md:text-6xl tracking-tightest leading-[0.95] mt-3">
              Something went <span className="italic text-terracotta">wrong.</span>
            </h1>
            <p className="mt-4 text-clay">
              Your card was not charged. Try again, or pick a different payment method.
            </p>
            <Link
              href="/checkout"
              className="inline-block mt-8 bg-ink text-cream px-6 py-3 mono text-xs uppercase tracking-[0.2em] hover:bg-terracotta transition-colors"
            >
              try again →
            </Link>
          </>
        ) : (
          <CompleteClient
            initialBalance={Number(merchant?.balance_mad ?? 0)}
            isFounding={!!merchant?.is_founding}
            foundingPct={merchant?.founding_bonus_pct ?? 0}
            expectedCreditMad={tier?.totalCreditMad ?? 0}
            tierLabel={tier?.label ?? null}
            wasFoundingPurchase={tier?.isFounding ?? false}
            receiptId={searchParams.receipt_id ?? null}
          />
        )}
      </div>
    </main>
  );
}
