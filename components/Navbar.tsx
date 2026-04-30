"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 768) setMenuOpen(false); };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <motion.nav
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-neutral-100" : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo("hero")} className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-emerald-300 transition-shadow">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                <path d="M12 2C8 2 4.5 5.5 4.5 9.5c0 2.5 1.2 4.7 3 6.1V18l3-1.5 1.5.5V15a7.5 7.5 0 100-13z" opacity=".2"/>
                <path d="M12 1C7.03 1 3 5.03 3 10a9 9 0 006 8.48V21l3-1 3 1v-2.52A9 9 0 0021 10c0-4.97-4.03-9-9-9zm0 2a7 7 0 110 14A7 7 0 0112 3z"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-neutral-900 tracking-tight">Snailon</span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            {[["roi", "ROI Calculator"], ["how-it-works", "How it works"], ["offer", "Pricing"]].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-sm text-neutral-600 hover:text-emerald-600 transition-colors font-medium">
                {label}
              </button>
            ))}
            <button
              onClick={() => scrollTo("waitlist")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              Join Waitlist
            </button>
          </div>

          <button className="md:hidden p-2 rounded-lg text-neutral-700" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <div className="w-5 h-0.5 bg-current mb-1.5 transition-all" style={menuOpen ? {transform:"rotate(45deg) translate(2px,2px)"}:{}}/>
            <div className="w-5 h-0.5 bg-current mb-1.5 transition-all" style={menuOpen ? {opacity:0}:{}}/>
            <div className="w-5 h-0.5 bg-current transition-all" style={menuOpen ? {transform:"rotate(-45deg) translate(2px,-2px)"}:{}}/>
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-40 bg-white/95 backdrop-blur-md shadow-lg border-b border-neutral-100 md:hidden"
          >
            <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3">
              {[["roi", "ROI Calculator"], ["how-it-works", "How it works"], ["offer", "Pricing"]].map(([id, label]) => (
                <button key={id} onClick={() => scrollTo(id)} className="text-left text-sm font-medium text-neutral-700 py-2">{label}</button>
              ))}
              <button onClick={() => scrollTo("waitlist")} className="bg-emerald-600 text-white text-sm font-semibold px-5 py-3 rounded-xl">
                Join Waitlist
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
