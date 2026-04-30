"use client";
import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";

export default function PreLaunchOffer() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    fetch("/api/waitlist/founding")
      .then(r => r.json())
      .then(d => setRemaining(50 - (d.count ?? 0)))
      .catch(() => setRemaining(27));
  }, []);

  const handleCheckout = async () => {
    if (!email.trim()) { setCheckoutError("Please enter your email first"); return; }
    setLoading(true);
    setCheckoutError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setCheckoutError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setCheckoutError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const spotsLeft = remaining ?? 27;
  const pct = Math.max(0, Math.min(100, ((50 - spotsLeft) / 50) * 100));

  return (
    <section id="offer" ref={ref} className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 32 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }}>
          <div className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 rounded-3xl p-8 sm:p-12 text-white overflow-hidden relative shadow-2xl shadow-emerald-200">
            {/* Background decoration */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/5 rounded-full"/>
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full"/>

            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-white/20 border border-white/20 text-amber-200 text-sm font-semibold px-4 py-2 rounded-full mb-6">
                ★ Limited · Founding Store Program
              </div>

              <h2 className="text-4xl sm:text-5xl font-black mb-4 leading-tight">
                Be a Founding Store —<br/>
                <span className="text-amber-300">get +50% bonus, forever.</span>
              </h2>

              <p className="text-emerald-100 text-lg leading-relaxed mb-8 max-w-xl">
                Top up <strong className="text-white">200 MAD</strong>, get <strong className="text-white">300 MAD</strong>. Every refill earns the same +50% bonus, for the lifetime of your account. No catch, no expiry.
              </p>

              {/* Email + CTA */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4 max-w-lg">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@store.ma"
                  className="flex-1 bg-white/20 border border-white/30 text-white placeholder:text-emerald-200 px-4 py-3 rounded-xl outline-none focus:bg-white/30 transition-colors text-sm"
                />
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="bg-white text-emerald-700 font-bold px-6 py-3 rounded-xl hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 whitespace-nowrap text-sm"
                >
                  {loading ? "Loading…" : "Reserve my spot — 200 MAD →"}
                </button>
              </div>
              {checkoutError && <p className="text-red-300 text-sm mb-4">{checkoutError}</p>}

              {/* Trust signals */}
              <div className="flex flex-wrap gap-4 text-emerald-200 text-xs mb-8">
                <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>Secured by Whop</span>
                <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>One-time payment</span>
                <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>No subscription</span>
              </div>

              {/* Spots counter */}
              <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-6xl font-black text-white">{spotsLeft}</span>
                  <span className="text-2xl text-emerald-200 font-bold">/50</span>
                </div>
                <p className="text-emerald-200 text-sm mb-4">spots remaining · filling fast</p>
                <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden mb-5">
                  <motion.div className="h-full bg-amber-400 rounded-full" initial={{ width: 0 }} animate={isInView ? { width: `${pct}%` } : {}} transition={{ duration: 1.2, delay: 0.3 }}/>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  {["+50% lifetime credit on every top-up", "Direct line to founders on WhatsApp", "Priority onboarding & custom AI tuning", "Founding Store badge on your dashboard"].map(b => (
                    <div key={b} className="flex items-start gap-2 text-emerald-100">
                      <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      {b}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
