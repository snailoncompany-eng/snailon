"use client";
import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

type State = "idle" | "loading" | "success" | "error";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [storeName, setStoreName] = useState("");
  const [monthlyOrders, setMonthlyOrders] = useState("Just starting");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const referralLink = typeof window !== "undefined" ? `${window.location.origin}?ref=${btoa(email).slice(0, 8)}` : "";

  const handleSubmit = async () => {
    if (!email.trim()) { setErrorMsg("Email is required"); return; }
    setState("loading"); setErrorMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), store_name: storeName || undefined, monthly_orders: monthlyOrders }),
      });
      const data = await res.json();
      if (data.success) setState("success");
      else { setErrorMsg(data.error ?? "Something went wrong"); setState("error"); }
    } catch {
      setErrorMsg("Network error. Please try again."); setState("error");
    }
  };

  return (
    <section id="waitlist" ref={ref} className="py-24 bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-medium px-4 py-2 rounded-full mb-4">Join the waitlist</div>
          <h2 className="text-4xl sm:text-5xl font-black text-neutral-900 mb-4">Get early access<br/>before public launch.</h2>
          <p className="text-neutral-500 text-lg">We&apos;re onboarding stores in waves. Tell us about yours and we&apos;ll prioritize a slot.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 32 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: 0.1 }}
          className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-200"
        >
          <AnimatePresence mode="wait">
            {state === "success" ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <h3 className="text-2xl font-black text-neutral-900 mb-2">You&apos;re on the list! 🇲🇦</h3>
                <p className="text-neutral-600 mb-6">We&apos;ll send your access code before launch. Check your email.</p>
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-neutral-700 mb-2">Share your referral link — you both get an extra 10% bonus:</p>
                  <div className="bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-mono text-emerald-600 break-all">{referralLink || "snailon.com?ref=yourcode"}</div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Email — we&apos;ll send your access code here *</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@yourstore.ma"
                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Store name (optional)</label>
                  <input
                    type="text" value={storeName} onChange={e => setStoreName(e.target.value)}
                    placeholder="e.g. Atlas Boutique"
                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Monthly orders (optional)</label>
                  <select
                    value={monthlyOrders} onChange={e => setMonthlyOrders(e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
                  >
                    {["Just starting", "1–50", "50–200", "200–500", "500+"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
                <button
                  onClick={handleSubmit}
                  disabled={state === "loading"}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0 text-sm"
                >
                  {state === "loading" ? "Joining…" : "Join the waitlist →"}
                </button>
                <p className="text-center text-xs text-neutral-400">No spam. Unsubscribe anytime. We&apos;ll only email you about your access.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
