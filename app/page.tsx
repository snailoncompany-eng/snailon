import Link from "next/link";
import WaitlistForm from "@/components/waitlist-form";

export default function HomePage() {
  return (
    <main className="grain min-h-screen bg-cream text-ink">
      {/* nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-baseline gap-2">
          <span className="serif text-2xl tracking-tightest">snailon</span>
          <span className="mono text-[10px] uppercase tracking-[0.2em] text-clay">
            v0.1 · Casablanca
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/login" className="hover:text-terracotta transition-colors">
            sign in
          </Link>
          <Link
            href="/signup"
            className="bg-ink text-cream px-4 py-2 hover:bg-terracotta transition-colors mono text-xs uppercase tracking-wider"
          >
            start →
          </Link>
        </div>
      </nav>

      {/* hero */}
      <section className="px-6 md:px-12 pt-12 md:pt-24 pb-20 max-w-6xl">
        <p className="mono text-xs uppercase tracking-[0.25em] text-terracotta mb-8 rise">
          ⌬ &nbsp; the financial OS for COD commerce
        </p>
        <h1 className="serif text-[15vw] md:text-[8.5vw] leading-[0.92] tracking-tightest rise delay-1">
          Confirm every <span className="italic text-terracotta">cash-on-delivery</span> order in under five minutes.
        </h1>
        <p className="mt-10 max-w-xl text-lg leading-relaxed rise delay-2">
          Snailon is a WhatsApp-native AI agent that confirms, validates, and dispatches your COD orders —
          in Darija, Arabic, French. No human in the loop. No more 50% delivery failures.
        </p>

        <div className="mt-12 max-w-md rise delay-3">
          <WaitlistForm />
          <p className="mono text-[11px] uppercase tracking-[0.18em] text-clay mt-4">
            launches 21 may 2026 · early-access pricing for first 100 merchants
          </p>
        </div>
      </section>

      {/* the three primitives */}
      <section className="border-t border-sand px-6 md:px-12 py-20">
        <p className="mono text-xs uppercase tracking-[0.25em] text-terracotta mb-12">
          three primitives
        </p>
        <div className="grid md:grid-cols-3 gap-12 md:gap-6">
          <Primitive
            n="01"
            title="Confirm."
            body="Your order arrives. Snailon WhatsApps the customer in Darija within 60 seconds. Validates name, address, intent. Reconfirms before each shipment."
          />
          <Primitive
            n="02"
            title="Ship."
            body="One click to generate carrier labels (Amana, Tawssil, Cathédis). Live tracking via TrackingMore. Auto-reschedule on failed delivery."
          />
          <Primitive
            n="03"
            title="Settle."
            body="We hold the COD cash from the carrier, settle weekly to your bank or wallet. Working-capital advances available against your delivered receivables."
          />
        </div>
      </section>

      {/* numbers */}
      <section className="border-t border-sand px-6 md:px-12 py-20 grid md:grid-cols-4 gap-8">
        <Stat label="confirmation time" value="< 5 min" />
        <Stat label="languages" value="3" sub="Darija · العربية · FR" />
        <Stat label="cost per confirmed order" value="5 MAD" sub="≈ $0.50" />
        <Stat label="setup time" value="10 min" />
      </section>

      {/* footer */}
      <footer className="border-t border-sand px-6 md:px-12 py-12 flex flex-col md:flex-row justify-between gap-6 mono text-xs uppercase tracking-[0.18em] text-clay">
        <span>© snailon 2026 — built in casablanca</span>
        <div className="flex gap-6">
          <Link href="/login">sign in</Link>
          <Link href="/signup">create account</Link>
        </div>
      </footer>
    </main>
  );
}

function Primitive({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <p className="mono text-[11px] tracking-[0.2em] text-terracotta">{n}</p>
      <h3 className="serif text-3xl mt-2 tracking-tightest">{title}</h3>
      <p className="mt-3 leading-relaxed">{body}</p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="mono text-[10px] uppercase tracking-[0.2em] text-clay">{label}</p>
      <p className="serif text-4xl mt-2 tracking-tightest">{value}</p>
      {sub && <p className="mono text-[10px] tracking-wider text-clay mt-1">{sub}</p>}
    </div>
  );
}
