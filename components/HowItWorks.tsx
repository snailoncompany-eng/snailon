"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const steps = [
  {
    number: "01",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x={3} y={3} width={8} height={8} rx={1}/>
        <rect x={13} y={3} width={8} height={8} rx={1}/>
        <rect x={3} y={13} width={8} height={8} rx={1}/>
        <path d="M13 17h4M15 13v8" strokeLinecap="round"/>
      </svg>
    ),
    title: "Connect your WhatsApp",
    body: "Scan a QR code from your existing WhatsApp Business number. No new line, no new app, no migration.",
    badge: "~ 60 seconds",
    color: "emerald",
  },
  {
    number: "02",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    title: "AI answers 24/7",
    body: "Trained on Moroccan e-commerce. Replies instantly in Darija, Arabic, or French — matching the customer's language.",
    badge: "Darija · العربية · Français",
    color: "teal",
  },
  {
    number: "03",
    icon: (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12h12L19 8"/>
        <path d="M10 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Confirmed in 5 min, delivered in 24h",
    body: "Orders get scored for COD risk, pushed to your fulfillment partner, and tracked end-to-end. You only pay per shipped order.",
    badge: "COD risk score · Auto-dispatch",
    color: "emerald",
  },
];

export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" ref={ref} className="py-24 bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-100 text-teal-600 text-sm font-medium px-4 py-2 rounded-full mb-4">
            How it works
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-neutral-900 mb-4">Three steps to autopilot.</h2>
          <p className="text-lg text-neutral-500 max-w-lg mx-auto">
            From your WhatsApp Business inbox to a confirmed, shipped order — without lifting a finger.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line on desktop */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-emerald-200 via-teal-200 to-emerald-200" style={{ left: "20%", right: "20%" }}/>

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 32 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
              className="relative bg-white rounded-2xl p-8 shadow-sm border border-neutral-100 hover:shadow-md hover:-translate-y-1 transition-all group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center transition-colors">
                  {step.icon}
                </div>
                <span className="text-5xl font-black text-neutral-100 group-hover:text-emerald-100 transition-colors">{step.number}</span>
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">{step.title}</h3>
              <p className="text-neutral-600 leading-relaxed mb-4">{step.body}</p>
              <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">{step.badge}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
