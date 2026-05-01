import Link from "next/link";
import WaitlistForm from "@/components/waitlist-form";
import { Logo } from "@/components/ui/logo";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      {/* NAV */}
      <nav className="px-5 sm:px-8 lg:px-12 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/login"
            className="btn btn-ghost text-sm hidden sm:inline-flex"
          >
            Sign in
          </Link>
          <Link href="/signup" className="btn btn-primary text-sm">
            Get started <span aria-hidden>→</span>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="px-5 sm:px-8 lg:px-12 pt-10 sm:pt-16 lg:pt-24 pb-16 sm:pb-24 max-w-7xl mx-auto">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-6 animate-rise">
            <span className="dot bg-accent animate-pulseDot" />
            <span className="eyebrow eyebrow-accent">live · built for Morocco</span>
          </div>

          <h1 className="headline text-[44px] sm:text-6xl lg:text-7xl xl:text-8xl text-ink animate-rise" style={{ animationDelay: "60ms" }}>
            Confirm every <span className="italic text-accent">cash-on-delivery</span> order in under 5 minutes.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted max-w-2xl leading-relaxed animate-rise" style={{ animationDelay: "140ms" }}>
            Snailon is the AI confirmation engine for Moroccan e-commerce. Every order gets WhatsApped in Darija within 60 seconds. <span className="text-ink font-medium">Pay 5 MAD only when an order is confirmed.</span>
          </p>

          <div className="mt-10 max-w-md animate-rise" style={{ animationDelay: "220ms" }}>
            <WaitlistForm />
            <p className="eyebrow mt-4">launches 21 may 2026 · founding-store pricing for first 100 merchants</p>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-14 sm:mt-20 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-4xl">
          <Stat label="confirmation time" value="< 5 min" />
          <Stat label="cost per confirmation" value="5 MAD" sub="≈ $0.50" />
          <Stat label="languages" value="Darija · AR · FR" />
          <Stat label="setup time" value="under 1 min" />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-line px-5 sm:px-8 lg:px-12 py-16 sm:py-24 max-w-7xl mx-auto">
        <p className="eyebrow eyebrow-accent">how it works</p>
        <h2 className="headline text-3xl sm:text-5xl mt-3 max-w-2xl">
          From paste-a-URL to <span className="italic">first confirmed order.</span>
        </h2>

        <div className="mt-12 grid md:grid-cols-3 gap-px bg-line border border-line rounded-xl overflow-hidden">
          <Step
            n="01"
            title="Connect your store."
            body="Paste your Shopify, WooCommerce, or YouCan URL. We pull your catalog and start listening for new orders. No API keys."
          />
          <Step
            n="02"
            title="Order arrives."
            body="A new order hits Snailon in real-time. Within 60 seconds, our AI WhatsApps your customer in their language. Address corrections handled automatically."
          />
          <Step
            n="03"
            title="Confirmed → shipped."
            body="Confirmed orders are auto-handed to ForceLog or your chosen carrier. You see the tracking number in your dashboard. Wallet charges only on success."
          />
        </div>
      </section>

      {/* WHY SNAILON */}
      <section className="border-t border-line px-5 sm:px-8 lg:px-12 py-16 sm:py-24 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
          <div>
            <p className="eyebrow eyebrow-accent">why merchants switch</p>
            <h2 className="headline text-3xl sm:text-5xl mt-3">
              Faster. <span className="italic">Cheaper.</span> Honest pricing.
            </h2>
            <p className="mt-5 text-muted leading-relaxed">
              Call-center confirmation services charge 7 MAD per order on top of 2 MAD per call attempt — and call attempts fail constantly. Snailon is WhatsApp-first, AI-driven, and you only pay when an order is actually confirmed.
            </p>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[rgba(10,10,10,0.02)]">
                  <th className="text-left p-4 eyebrow">vs.</th>
                  <th className="text-left p-4 eyebrow text-ink">Snailon</th>
                  <th className="text-left p-4 eyebrow">YouCan Confirm</th>
                </tr>
              </thead>
              <tbody>
                <Row label="Cost / confirmed order" snailon="5 MAD" them="7+ MAD" />
                <Row label="Channel" snailon="WhatsApp · instant" them="Phone calls" />
                <Row label="Time to confirm" snailon="< 5 min" them="30 min – 24 h" />
                <Row label="Free upsells" snailon="Yes" them="+3 MAD" />
                <Row label="Pay only on success" snailon="Yes" them="No" />
                <Row label="24/7 availability" snailon="Yes" them="Office hours" />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line px-5 sm:px-8 lg:px-12 py-16 sm:py-24 max-w-7xl mx-auto">
        <div className="card bg-ink text-white p-8 sm:p-12 lg:p-16 border-ink">
          <p className="eyebrow text-white/60">snailon · for moroccan merchants</p>
          <h2 className="headline text-3xl sm:text-5xl mt-3 max-w-2xl text-white">
            Stop losing orders to <span className="italic text-accent">missed messages.</span>
          </h2>
          <p className="mt-5 text-white/70 max-w-xl">
            Join the founding-store pre-launch and get +50% on every top-up, forever. First 100 merchants only.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary">
              Create your account <span aria-hidden>→</span>
            </Link>
            <Link href="/login" className="btn btn-secondary !bg-transparent !text-white !border-white/20 hover:!border-white">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line px-5 sm:px-8 lg:px-12 py-10 max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo size="sm" href={null} />
          <span className="eyebrow">© 2026 · built in casablanca</span>
        </div>
        <div className="flex gap-5 eyebrow">
          <Link href="/login" className="hover:text-ink transition-colors">sign in</Link>
          <Link href="/signup" className="hover:text-ink transition-colors">create account</Link>
        </div>
      </footer>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="animate-rise" style={{ animationDelay: "300ms" }}>
      <p className="eyebrow">{label}</p>
      <p className="font-display text-3xl sm:text-4xl tracking-tight mt-2">{value}</p>
      {sub && <p className="eyebrow mt-1">{sub}</p>}
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="bg-surface p-6 sm:p-8">
      <p className="font-mono text-xs text-accent">{n}</p>
      <h3 className="font-display text-2xl sm:text-3xl tracking-tight mt-3">{title}</h3>
      <p className="text-muted leading-relaxed mt-3">{body}</p>
    </div>
  );
}

function Row({ label, snailon, them }: { label: string; snailon: string; them: string }) {
  return (
    <tr className="border-t border-line">
      <td className="p-4 text-muted">{label}</td>
      <td className="p-4 font-medium text-ink">
        <span className="inline-flex items-center gap-1.5">
          <span className="dot bg-success" />
          {snailon}
        </span>
      </td>
      <td className="p-4 text-muted">{them}</td>
    </tr>
  );
}
