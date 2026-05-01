import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LogoutButton from "@/components/logout-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the merchant row via admin (in case RLS is finicky on first create)
  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id, business_name, email, balance_mad")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-cream text-ink flex">
      <aside className="w-64 border-r border-sand p-6 flex flex-col gap-1">
        <Link href="/" className="serif text-2xl tracking-tightest mb-8">snailon</Link>
        <p className="mono text-[10px] uppercase tracking-[0.2em] text-clay">balance</p>
        <p className="serif text-3xl tracking-tightest mb-1">
          {(merchant?.balance_mad ?? 0).toFixed(2)}{" "}
          <span className="text-base text-clay">MAD</span>
        </p>
        <Link href="/dashboard/wallet" className="mono text-[11px] uppercase tracking-wider text-terracotta hover:underline">
          + top up
        </Link>

        <nav className="mt-10 flex flex-col gap-1 mono text-xs uppercase tracking-[0.18em]">
          <NavLink href="/dashboard">overview</NavLink>
          <NavLink href="/dashboard/orders">orders</NavLink>
          <NavLink href="/dashboard/wallet">wallet</NavLink>
          <NavLink href="/dashboard/products">products</NavLink>
        </nav>

        <div className="mt-auto pt-6 border-t border-sand">
          <p className="mono text-[10px] uppercase tracking-wider text-clay truncate">
            {merchant?.business_name ?? merchant?.email ?? user.email}
          </p>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-8 md:p-12 overflow-x-hidden">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="py-2 px-2 -mx-2 hover:bg-sand transition-colors"
    >
      {children}
    </Link>
  );
}
