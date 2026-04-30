"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";

type Sender = "customer" | "ai";
interface Message { id: string; sender: Sender; text: string; time: string; status?: "sent" | "delivered" | "read"; }

function nowTime(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const PRELOADED: Message[] = [
  { id: "p1", sender: "customer", text: "Salam, 3ndkom jacket rouge taille M?", time: "11:02" },
  { id: "p2", sender: "ai", text: "Salam! Yes, size M is in stock — 350 MAD with free delivery. Confirm?", time: "11:02", status: "read" },
  { id: "p3", sender: "customer", text: "Wakha, confirmer 🙌", time: "11:03" },
  { id: "p4", sender: "ai", text: "✅ Confirmed! Delivery in 24h to Casablanca. Tracking link coming shortly. Choukran!", time: "11:03", status: "read" },
];

const FALLBACK = "Thanks for trying Snailon! When we launch, our AI will answer all your customers like this — in Darija, Arabic, and French. Join the waitlist to be first 🇲🇦";

function DoubleCheck({ status }: { status: "sent" | "delivered" | "read" }) {
  const color = status === "read" ? "#4fc3f7" : "#8696a0";
  return (
    <svg width="15" height="11" viewBox="0 0 15 11" fill={color}>
      <path d="M11.07.42L4.93 6.57 2.93 4.57 1.5 6l3.43 3.43 7.57-7.57L11.07.42z"/>
      <path d="M14.07.42L7.93 6.57l-1-1L5.5 7l2.43 2.43 7.57-7.57L14.07.42z"/>
    </svg>
  );
}

function Bubble({ msg }: { msg: Message }) {
  const isAI = msg.sender === "ai";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
      className={`flex ${isAI ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[78%] px-3 py-2 rounded-2xl shadow-sm text-sm ${isAI ? "bg-[#d9fdd3] rounded-tr-sm" : "bg-white rounded-tl-sm"}`}>
        <p className="text-neutral-800 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span className="text-[10px] text-[#667781]">{msg.time}</span>
          {isAI && msg.status && <DoubleCheck status={msg.status}/>}
        </div>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-end">
      <div className="bg-[#d9fdd3] px-4 py-3 rounded-2xl rounded-tr-sm shadow-sm flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <motion.div key={i} className="w-2 h-2 bg-[#667781] rounded-full"
            animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}/>
        ))}
      </div>
    </motion.div>
  );
}

export default function WhatsAppDemo() {
  const [messages, setMessages] = useState<Message[]>(PRELOADED);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [statusLine, setStatusLine] = useState("online");
  const endRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const userMsg: Message = { id: Date.now().toString(), sender: "customer", text, time: nowTime() };
    setMessages(prev => [...prev, userMsg]);

    const t1 = setTimeout(() => { setTyping(true); setStatusLine("typing in Darija…"); }, 600);
    const t2 = setTimeout(() => {
      setTyping(false);
      setStatusLine("online");
      const aiMsg: Message = { id: (Date.now()+1).toString(), sender: "ai", text: FALLBACK, time: nowTime(), status: "sent" };
      setMessages(prev => [...prev, aiMsg]);

      const t3 = setTimeout(() => setMessages(prev => prev.map(m => m.id === aiMsg.id ? { ...m, status: "delivered" } : m)), 500);
      const t4 = setTimeout(() => setMessages(prev => prev.map(m => m.id === aiMsg.id ? { ...m, status: "read" } : m)), 1200);
      timers.current.push(t3, t4);
    }, 2000);
    timers.current.push(t1, t2);
  }, [input]);

  return (
    <section id="demo" ref={containerRef} className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 text-green-600 text-sm font-medium px-4 py-2 rounded-full mb-4">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>Live demo
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-neutral-900 mb-4">Watch a real Snailon<br/>conversation.</h2>
          <p className="text-lg text-neutral-500 max-w-xl mx-auto">This is exactly what your customers see. Snailon mirrors WhatsApp&apos;s interface — instant, native, familiar.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 32 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: 0.15 }}
          className="max-w-sm mx-auto"
        >
          <div className="bg-neutral-900 rounded-[2rem] p-2 shadow-2xl">
            <div className="rounded-[1.6rem] overflow-hidden">
              {/* WA Header */}
              <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-400 flex items-center justify-center text-white font-bold">S</div>
                <div className="flex-1">
                  <div className="text-white font-semibold text-sm">Snailon AI</div>
                  <div className="text-emerald-200 text-xs">{statusLine}</div>
                </div>
                <div className="flex gap-3 text-white/70">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                </div>
              </div>

              {/* Chat area */}
              <div className="bg-[#ece5dd] h-80 overflow-y-auto p-3 space-y-2" style={{ backgroundImage: "radial-gradient(circle, #d4d0cb 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
                <div className="text-center text-xs text-[#667781] bg-[#e1f3fb] px-3 py-1 rounded-full inline-block mx-auto block">
                  Today
                </div>
                <AnimatePresence mode="popLayout">
                  {messages.map(msg => <Bubble key={msg.id} msg={msg}/>)}
                  {typing && <TypingIndicator key="typing"/>}
                </AnimatePresence>
                <div ref={endRef}/>
              </div>

              {/* Input */}
              <div className="bg-[#f0f0f0] px-3 py-2 flex items-center gap-2">
                <div className="flex-1 bg-white rounded-full px-4 py-2 flex items-center gap-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && send()}
                    placeholder="Type a message…"
                    className="flex-1 bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
                  />
                </div>
                <button onClick={send} className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 rounded-full flex items-center justify-center transition-colors flex-shrink-0">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-neutral-400 mt-4">Try typing something — the AI will respond 💬</p>
        </motion.div>
      </div>
    </section>
  );
}
