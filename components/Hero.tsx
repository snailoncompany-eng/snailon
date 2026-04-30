"use client";
import { motion } from "framer-motion";

export default function Hero() {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden bg-neutral-50 pt-16">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-100 rounded-full opacity-60 blur-3xl"/>
        <div className="absolute top-1/2 -left-32 w-80 h-80 bg-teal-50 rounded-full opacity-80 blur-2xl"/>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-emerald-50 rounded-full opacity-60 blur-2xl"/>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium px-4 py-2 rounded-full mb-6"
          >
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/>
            🇲🇦 Pre-launching in Morocco · 2026
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight text-neutral-900 mb-6"
          >
            Your orders<br/>
            <span className="text-emerald-600">confirm<br/>themselves.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }}
            className="text-xl text-neutral-600 leading-relaxed mb-8 max-w-lg"
          >
            Snailon confirms every WhatsApp order, scores COD risk, and builds your customer relationships — all in Darija, French, or Arabic.{" "}
            <strong className="text-neutral-800">You only pay per order that ships.</strong>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row gap-3 mb-8"
          >
            <button onClick={() => scrollTo("waitlist")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all hover:shadow-xl hover:shadow-emerald-200 hover:-translate-y-1 active:translate-y-0"
            >
              Get started free →
            </button>
            <button onClick={() => scrollTo("demo")}
              className="border-2 border-neutral-200 hover:border-emerald-300 bg-white text-neutral-700 font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:shadow-md"
            >
              See it work ↓
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.55 }}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-500"
          >
            {["No credit card", "Pay only on shipped orders", "Setup in 5 minutes"].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                {t}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Phone mockup */}
        <motion.div
          initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.3 }}
          className="hidden lg:flex justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-400 blur-3xl opacity-20 rounded-full scale-90"/>
            <div className="relative w-72 bg-neutral-900 rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-neutral-800">
              <div className="bg-neutral-900 px-6 pt-3 pb-1 flex justify-between items-center">
                <span className="text-white text-xs font-medium">9:41</span>
                <div className="w-24 h-5 bg-neutral-800 rounded-full"/>
                <div className="w-6 h-3 border border-white/40 rounded-sm relative"><div className="absolute top-0.5 left-0.5 right-1 bottom-0.5 bg-white/40 rounded-sm"/></div>
              </div>
              <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-400 flex items-center justify-center text-white text-sm font-bold">S</div>
                <div>
                  <div className="text-white text-sm font-semibold">Snailon AI</div>
                  <div className="text-emerald-200 text-xs">online · typing in Darija</div>
                </div>
              </div>
              <div className="bg-[#ece5dd] min-h-64 p-3 space-y-2">
                {[
                  { r: false, text: "Salam, 3ndkom jacket rouge taille M?", t: "11:02" },
                  { r: true,  text: "Salam! Yes, size M is in stock — 350 MAD with free delivery. Confirm?", t: "11:02" },
                  { r: false, text: "Wakha, confirmer 🙌", t: "11:03" },
                  { r: true,  text: "✅ Confirmed! Delivery in 24h to Casablanca. Choukran!", t: "11:03" },
                ].map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.3, duration: 0.4 }}
                    className={`flex ${msg.r ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs shadow-sm ${msg.r ? "bg-[#d9fdd3] rounded-tr-sm" : "bg-white rounded-tl-sm"}`}>
                      <p className="text-neutral-800 leading-relaxed">{msg.text}</p>
                      <p className="text-neutral-400 text-[10px] text-right mt-0.5">{msg.t} {msg.r ? "✓✓" : ""}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="bg-emerald-600 px-4 py-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                <span className="text-white text-xs font-semibold">Order confirmed · 12s</span>
              </div>
            </div>
            <div className="absolute -right-4 top-1/3 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg rotate-6">
              ★ AI · Darija fluency
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
