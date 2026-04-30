"use client";
import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";

const LAUNCH_DATE = process.env.NEXT_PUBLIC_LAUNCH_DATE ?? "2026-05-21T00:00:00Z";

function getTimeLeft() {
  const diff = new Date(LAUNCH_DATE).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const s = Math.floor(diff / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, expired: false };
}

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 text-center shadow-sm border border-neutral-200 min-w-[70px] sm:min-w-[90px]">
      <div className="text-4xl sm:text-6xl font-black text-emerald-600 tabular-nums">{String(value).padStart(2, "0")}</div>
      <div className="text-xs sm:text-sm font-semibold text-neutral-400 uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

export default function Countdown() {
  const [time, setTime] = useState(getTimeLeft);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <section ref={ref} className="py-24 bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-4 py-2 rounded-full mb-6">
            ⚡ Pre-launch closes in
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-neutral-900 mb-3">Founding stores program<br/>ends soon.</h2>
          <p className="text-neutral-500 text-lg mb-10">Spots are capped at 50. Once the timer hits zero, the +50% lifetime bonus is gone for good.</p>

          {time.expired ? (
            <div className="text-3xl font-bold text-emerald-600">🚀 Snailon is launching!</div>
          ) : (
            <div className="flex justify-center gap-3 sm:gap-4">
              <Digit value={time.days} label="Days"/>
              <div className="text-5xl font-black text-neutral-300 self-center pb-6">:</div>
              <Digit value={time.hours} label="Hours"/>
              <div className="text-5xl font-black text-neutral-300 self-center pb-6">:</div>
              <Digit value={time.minutes} label="Minutes"/>
              <div className="text-5xl font-black text-neutral-300 self-center pb-6">:</div>
              <Digit value={time.seconds} label="Seconds"/>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
