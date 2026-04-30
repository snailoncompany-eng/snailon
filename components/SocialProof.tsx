"use client";
import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";

const TESTIMONIALS = [
  {
    initials: "YB", color: "bg-rose-500",
    name: "Yasmine Benali", role: "Founder · Atlas Boutique, Casablanca",
    quote: "We were missing 6 out of 10 WhatsApp orders after 7pm. Snailon's AI answers in Darija like a real person — our confirm rate jumped to 89% in week one.",
  },
  {
    initials: "KM", color: "bg-blue-500",
    name: "Karim Maaroufi", role: "CEO · Maroc Cosmetics, Rabat",
    quote: "The COD risk score alone paid for itself. We went from 28% return rate to 9% because Snailon flags the bad orders before we ship them.",
  },
  {
    initials: "SR", color: "bg-violet-500",
    name: "Salma Riad", role: "Owner · Riad Home Goods, Marrakech",
    quote: "I pay only when an order ships. So our marketing spend is finally tied to revenue, not WhatsApp ghosts. This is the model Morocco needed.",
  },
];

function useCountUp(target: number, active: boolean) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    const dur = 1800;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, target]);
  return val;
}

export default function SocialProof() {
  const [liveCount, setLiveCount] = useState<number>(1247);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const displayCount = useCountUp(liveCount, isInView);

  useEffect(() => {
    fetch("/api/waitlist/count")
      .then(r => r.json())
      .then(d => { if (d.count && d.count > 0) setLiveCount(d.count); })
      .catch(() => {});
  }, []);

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center mb-16">
          <div className="text-7xl sm:text-8xl font-black text-emerald-600 mb-3">{displayCount.toLocaleString()}</div>
          <p className="text-xl text-neutral-600">Moroccan stores have already joined the waitlist.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={t.name}
              initial={{ opacity: 0, y: 32 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.12, ease: "easeOut" }}
              className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-1 transition-all"
            >
              <div className="flex gap-0.5 text-amber-400 mb-4">★★★★★</div>
              <p className="text-neutral-700 leading-relaxed mb-6 italic">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-white text-sm font-bold`}>{t.initials}</div>
                <div>
                  <div className="font-semibold text-neutral-900 text-sm">{t.name}</div>
                  <div className="text-neutral-500 text-xs">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
