import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LogoutButton from "@/components/logout-button";
import { Logo } from "@/components/ui/logo";
import { DashNav } from "@/components/dashboard-nav";
import Link from "next/link";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id, business_name, email, balance_mad, is_founding, founding_bonus_pct")
    .eq("user_id", user.id)
    .maybeSingle();

  const balance = Number(merchant?.balance_mad ?? 0);

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* DESKTOP — sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 border-r border-line bg-surface flex-col p-5">
        <Logo />

        {/* Balance card */}
        <Link
          href="/dashboard/wallet"
          className="card card-interactive mt-7 p-4 group block"
        >
          <p className="eyebrow">balance</p>
          <p className="font-display text-3xl tracking-tight mt-1">
            {balance.toFixed(2)} <span className="text-base text-muted">MAD</span>
          </p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
            <span className="eyebrow eyebrow-accent">+ top up</span>
            <span className="text-accent group-hover:translate-x-0.5 transition-transform" aria-hidden>→</span>
          </div>
        </Link>

        {merchant?.is_founding && (
          <div className="mt-3 px-3 py-2 rounded-md bg-accent-soft">
            <p className="eyebrow eyebrow-accent">founding store</p>
            <p className="text-xs text-accent-deep mt-0.5">+{merchant.founding_bonus_pct}% on every top-up</p>
          </div>
        )}

        <div className="mt-8">
          <DashNav orientation="vertical" />
        </div>

        <div className="mt-auto pt-6 border-t border-line">
          <p className="text-sm font-medium truncate">{merchant?.business_name ?? merchant?.email}</p>
          <p className="text-xs text-muted truncate">{merchant?.email}</p>
          <LogoutButton className="mt-2 -ml-2" />
        </div>
      </aside>

      {/* MOBILE — top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-line">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo size="sm" />
          <Link
            href="/dashboard/wallet"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface border border-line"
          >
            <span className="dot bg-accent" />
            <span className="font-mono text-xs">{balance.toFixed(0)} MAD</span>
          </Link>
        </div>
        <div className="px-4 pb-3">
          <DashNav orientation="horizontal" />
        </div>
      </header>

      {/* CONTENT */}
      <main className="lg:pl-64">
        <div className="px-5 sm:px-8 lg:px-10 py-7 sm:py-10 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
