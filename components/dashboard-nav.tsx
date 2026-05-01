"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type DashNavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export const DASH_NAV: DashNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: <IconHome /> },
  { href: "/dashboard/orders", label: "Orders", icon: <IconBox /> },
  { href: "/dashboard/integrations", label: "Integrations", icon: <IconLink /> },
  { href: "/dashboard/products", label: "Products", icon: <IconTag /> },
  { href: "/dashboard/wallet", label: "Wallet", icon: <IconWallet /> },
];

export function DashNav({ orientation = "vertical" }: { orientation?: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  const items = DASH_NAV;
  if (orientation === "horizontal") {
    return (
      <div className="flex gap-1 overflow-x-auto -mx-1 px-1 scrollbar-hide">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                active
                  ? "bg-ink text-white"
                  : "text-muted hover:text-ink hover:bg-[rgba(10,10,10,0.04)]"
              }`}
            >
              <span className="opacity-90">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  }
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
              active
                ? "bg-ink text-white"
                : "text-muted hover:text-ink hover:bg-[rgba(10,10,10,0.04)]"
            }`}
          >
            <span className={active ? "" : "opacity-70"}>{item.icon}</span>
            <span className={active ? "font-medium" : ""}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// --- Inline icons (1.5 stroke) ---

function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5V21h-6v-7H9v7H3z" />
    </svg>
  );
}
function IconBox() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z" />
      <path d="M3 7.5L12 12l9-4.5M12 12v9" />
    </svg>
  );
}
function IconLink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 14a5 5 0 007.07 0l3-3a5 5 0 10-7.07-7.07L11 6" />
      <path d="M14 10a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07L13 18" />
    </svg>
  );
}
function IconTag() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12L13 5l-9 1-1 9 7 7 9-9z" />
      <circle cx="9" cy="9" r="1.5" />
    </svg>
  );
}
function IconWallet() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M16 13h2" />
      <path d="M3 10h18" />
    </svg>
  );
}
