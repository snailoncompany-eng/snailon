"use client";
import { useState, useRef, useCallback } from "react";
import { motion, useInView, animate } from "framer-motion";

function Slider({ label, value, min, max, step, format, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-3">
        <span className="text-sm font-semibold text-neutral-700">{label}</span>
        <span className="text-xl font-bold text-emerald-600">{format(value)}</span>
      </div>
      <div className="relative">
        <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }}/>
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
        <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-600 border-2 border-white shadow-md pointer-events-none transition-all" style={{ left: `calc(${pct}% - 10px)` }}/>
      </div>
      <div className="flex justify-between text-xs text-neutral-400 mt-1">
        <span>{format(min)}</span><span>{format(max)}</span>
      </div>
    </div>
  );
}

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevRef = useRef(value);
  const rafRef = useRef<number | undefined>(undefined);

  const animateValue = useCallback((to: number) => {
    const from = prevRef.current;
    prevRef.current = to;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const dur = 600;
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const cur = Math.round(from + (to - from) * ease);
      if (ref.current) ref.current.textContent = `${prefix}${cur.toLocaleString()}${suffix}`;
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [prefix, suffix]);

  if (ref.current && prevRef.current !== value) animateValue(value);

  return <span ref={ref}>{prefix}{value.toLocaleString()}{suffix}</span>;
}

export default function ROICalculator() {
  const [conversations, setConversations] = useState(100);
  const [avgOrderValue, setAvgOrderValue] = useState(200);
  const [replyRate, setReplyRate] = useState(40);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const lostConversations = Math.round(conversations * (1 - replyRate / 100));
  const lostRevenue = Math.round(lostConversations * avgOrderValue * 0.35);
  const annualRecovery = Math.round(lostRevenue * 0.80 * 12);

  return (
    <section id="roi" ref={ref} className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-medium px-4 py-2 rounded-full mb-4">
            ROI Calculator
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-neutral-900 mb-4 leading-tight">
            See how much revenue<br/>you&apos;re leaving on the table.
          </h2>
          <p className="text-lg text-neutral-500 max-w-xl mx-auto">
            Slide through your numbers. We&apos;ll show you what unanswered WhatsApp messages cost you every month.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="grid lg:grid-cols-2 gap-8 items-start"
        >
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-neutral-200 space-y-8">
            <Slider label="Monthly WhatsApp conversations" value={conversations} min={10} max={500} step={5} format={v => v.toString()} onChange={setConversations}/>
            <Slider label="Average order value" value={avgOrderValue} min={50} max={1000} step={10} format={v => `${v} MAD`} onChange={setAvgOrderValue}/>
            <Slider label="Current reply rate" value={replyRate} min={10} max={90} step={5} format={v => `${v}%`} onChange={setReplyRate}/>
            <p className="text-xs text-neutral-400 pt-2 border-t border-neutral-100">
              Based on a 35% conversion rate on replied conversations and Moroccan COD market averages.
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-700 to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-200">
            <p className="text-emerald-200 text-xs font-semibold uppercase tracking-widest mb-2">YOU&apos;RE LOSING RIGHT NOW</p>
            <div className="text-5xl font-black mb-1">
              ≈ <AnimatedNumber value={lostRevenue} suffix=" MAD"/>
            </div>
            <p className="text-emerald-200 text-sm mb-6">per month</p>

            <div className="h-px bg-emerald-500/40 mb-6"/>

            <p className="text-emerald-200 text-sm mb-2">With Snailon you&apos;d recover</p>
            <div className="text-3xl font-black text-amber-300 mb-6">
              ≈ <AnimatedNumber value={annualRecovery} suffix=" MAD/year"/>
            </div>

            <button
              onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold py-3 rounded-xl transition-all text-sm"
            >
              See how it works ↓
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
