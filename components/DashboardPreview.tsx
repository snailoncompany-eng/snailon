"use client";
import { useState, useRef, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

const SEED_ORDERS = [
  { id: "#SN-2841", customer: "Yasmine B.", total: 340, status: "CONFIRMED", time: "2m ago" },
  { id: "#SN-2840", customer: "Karim L.", total: 620, status: "SHIPPED", time: "14m ago" },
  { id: "#SN-2839", customer: "Salma R.", total: 180, status: "CONFIRMED", time: "22m ago" },
  { id: "#SN-2838", customer: "Mehdi A.", total: 790, status: "PENDING", time: "31m ago" },
];

const NEW_ORDERS = [
  { customer: "Fatima Z.", total: 450 }, { customer: "Omar B.", total: 290 }, { customer: "Aicha M.", total: 680 },
  { customer: "Youssef K.", total: 380 }, { customer: "Nadia S.", total: 520 },
];

const SEED_FEED = [
  { icon: "✓", text: "Order #SN-2841 confirmed in Darija", time: "11:24" },
  { icon: "↺", text: "Replied to Yasmine B. · sizing question", time: "11:22" },
  { icon: "★", text: "COD risk score: low (12) for #SN-2841", time: "11:19" },
  { icon: "✓", text: "Karim L. handed off to courier", time: "11:14" },
  { icon: "↺", text: "Replied to Salma R. · French", time: "11:08" },
];

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  SHIPPED: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  PENDING: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
};

function StatCard({ label, value, sub, subColor }: { label: string; value: string; sub: string; subColor: string }) {
  return (
    <div className="bg-neutral-800 rounded-xl p-4 border border-neutral-700">
      <div className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</div>
      <div className="text-3xl font-black text-white">{value}</div>
      <div className={`text-xs font-medium mt-1 ${subColor}`}>{sub}</div>
    </div>
  );
}

function useCountUp(target: number, active: boolean) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    const dur = 1500;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * ease));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [active, target]);
  return val;
}

export default function DashboardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const orders = useCountUp(47, isInView);
  const revenue = useCountUp(9820, isInView);
  const shipments = useCountUp(31, isInView);
  const wallet = useCountUp(412, isInView);

  const [orderList, setOrderList] = useState(SEED_ORDERS);
  const [feed, setFeed] = useState(SEED_FEED);
  const [newOrderIdx, setNewOrderIdx] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!isInView) return;
    const addOrder = () => {
      const o = NEW_ORDERS[newOrderIdx % NEW_ORDERS.length];
      setNewOrderIdx(i => i + 1);
      const newRow = { id: `#SN-${2842 + newOrderIdx}`, customer: o.customer, total: o.total, status: "CONFIRMED", time: "just now" };
      setOrderList(prev => [newRow, ...prev].slice(0, 6));
    };
    const addFeed = () => {
      const entries = [
        "↺ New conversation from Khadija A. · Arabic",
        "✓ Order confirmed via Darija",
        "★ COD risk: low — order dispatched",
        "↺ Upsell attempt: +120 MAD accessory suggested",
      ];
      const text = entries[Math.floor(Math.random() * entries.length)];
      const newEntry = { icon: text[0], text: text.slice(2), time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) };
      setFeed(prev => [newEntry, ...prev].slice(0, 5));
    };
    const t1 = setInterval(addOrder, 8500);
    const t2 = setInterval(addFeed, 11000);
    // @ts-ignore
    timers.current.push(t1, t2);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [isInView]);

  return (
    <section ref={ref} className="py-24 bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-neutral-100 border border-neutral-200 text-neutral-600 text-sm font-medium px-4 py-2 rounded-full mb-4">Dashboard</div>
          <h2 className="text-4xl sm:text-5xl font-black text-neutral-900 mb-4">One screen for the whole<br/>order lifecycle.</h2>
          <p className="text-lg text-neutral-500 max-w-lg mx-auto">Live orders, shipments, and AI activity — every conversation tied to a real-MAD outcome.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 32 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.1 }}
          className="bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800"
        >
          {/* Browser chrome */}
          <div className="bg-neutral-950 px-4 py-3 flex items-center gap-3 border-b border-neutral-800">
            <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-amber-500"/><div className="w-3 h-3 rounded-full bg-emerald-500"/></div>
            <div className="flex-1 bg-neutral-800 rounded-md px-3 py-1 text-xs text-neutral-400 font-mono">app.snailon.ma/orders</div>
            <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold border border-emerald-500/40 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>PREVIEW
            </span>
          </div>

          <div className="p-5 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Orders Today" value={orders.toString()} sub="↑ 23% vs yesterday" subColor="text-emerald-400"/>
              <StatCard label="Revenue" value={`${revenue.toLocaleString()} MAD`} sub="↑ 18%" subColor="text-emerald-400"/>
              <StatCard label="Shipments" value={shipments.toString()} sub="↑ 12%" subColor="text-emerald-400"/>
              <StatCard label="Wallet" value={`${wallet} MAD`} sub="↓ Low — top up" subColor="text-red-400"/>
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              {/* Orders table */}
              <div className="bg-neutral-800 rounded-xl border border-neutral-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-700 flex items-center justify-between">
                  <span className="text-white font-semibold text-sm">Live orders</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 text-xs"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>Live</span>
                </div>
                <div className="overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-neutral-700">
                      {["ORDER","CUSTOMER","TOTAL","STATUS","TIME"].map(h => <th key={h} className="px-3 py-2 text-left text-neutral-500 font-semibold uppercase tracking-wider">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      <AnimatePresence mode="popLayout">
                        {orderList.map((order, i) => (
                          <motion.tr key={order.id}
                            initial={i === 0 ? { opacity: 0, backgroundColor: "rgba(16,185,129,0.2)" } : { opacity: 1 }}
                            animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }}
                            transition={{ duration: 0.8 }}
                            className="border-b border-neutral-700/50"
                          >
                            <td className="px-3 py-2.5 text-emerald-400 font-mono">{order.id}</td>
                            <td className="px-3 py-2.5 text-neutral-300">{order.customer}</td>
                            <td className="px-3 py-2.5 text-white font-semibold">{order.total} MAD</td>
                            <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLES[order.status] || ""}`}>{order.status}</span></td>
                            <td className="px-3 py-2.5 text-neutral-500">{order.time}</td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* AI Feed */}
              <div className="bg-neutral-800 rounded-xl border border-neutral-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-700 flex items-center justify-between">
                  <span className="text-white font-semibold text-sm">AI activity</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 text-xs"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>Live</span>
                </div>
                <div className="p-3 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {feed.map((entry, i) => (
                      <motion.div key={entry.time + entry.text}
                        initial={i === 0 ? { opacity: 0, x: -12 } : { opacity: 1, x: 0 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                        className="flex items-start gap-3 text-xs"
                      >
                        <span className="text-neutral-500 font-mono shrink-0 mt-0.5">{entry.time}</span>
                        <span className="text-emerald-400 shrink-0 mt-0.5">{entry.icon}</span>
                        <span className="text-neutral-300">{entry.text}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {/* Retargeting card */}
                <div className="m-3 bg-gradient-to-r from-emerald-900/60 to-teal-900/60 rounded-lg p-3 border border-emerald-700/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-400 text-xs font-bold">⚡ Retargeting</span>
                    <div className="flex -space-x-1">
                      {["YB","KL","SR"].map(i => <div key={i} className="w-4 h-4 rounded-full bg-teal-600 border border-neutral-900 flex items-center justify-center text-[7px] font-bold text-white">{i}</div>)}
                    </div>
                  </div>
                  <p className="text-neutral-300 text-xs">12 abandoned conversations recovered this week</p>
                  <p className="text-emerald-400 text-xs font-semibold mt-0.5">1,800 MAD recovered</p>
                </div>
              </div>
            </div>

            {/* Shipment tracking */}
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-semibold text-sm">Shipment tracking</span>
                <span className="text-emerald-400 text-xs">● 3 active</span>
              </div>
              <div className="space-y-4">
                {[
                  { route: "Casablanca → Rabat", id: "SN-2840", stage: 3, eta: "ETA 14:20", label: "Out for delivery" },
                  { route: "Marrakech → Agadir", id: "SN-2837", stage: 2, eta: "ETA tomorrow", label: "In transit" },
                  { route: "Tangier → Fes", id: "SN-2835", stage: 4, eta: "09:42", label: "Delivered" },
                ].map(s => (
                  <div key={s.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-300 font-medium">{s.route}</span>
                      <span className="text-neutral-500 font-mono">{s.id}</span>
                    </div>
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 rounded-full flex-1 transition-all ${i <= s.stage ? "bg-emerald-500" : "bg-neutral-700"}`}/>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-500">{s.label}</span>
                      <span className="text-neutral-500">{s.eta}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
