"use client";
export default function Footer() {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <footer className="bg-neutral-950 text-neutral-400 py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current"><path d="M12 2C8 2 4.5 5.5 4.5 9.5c0 2.5 1.2 4.7 3 6.1V18l3-1.5 1.5.5V15a7.5 7.5 0 100-13z" opacity=".2"/><path d="M12 1C7.03 1 3 5.03 3 10a9 9 0 006 8.48V21l3-1 3 1v-2.52A9 9 0 0021 10c0-4.97-4.03-9-9-9zm0 2a7 7 0 110 14A7 7 0 0112 3z"/></svg>
              </div>
              <span className="text-white font-bold text-lg">Snailon</span>
            </div>
            <p className="text-sm leading-relaxed">The WhatsApp order-confirmation platform built for Moroccan e-commerce. Pay only on shipped orders.</p>
          </div>

          {[
            { title: "PRODUCT", links: [["roi","ROI Calculator"],["how-it-works","How it works"],["demo","Live Demo"],["offer","Pricing"]] },
            { title: "COMPANY", links: [["#","About"],["#","Blog"],["#","Press"],["#","Careers"]] },
            { title: "LEGAL", links: [["#","Privacy"],["#","Terms"],["#","Contact"]] },
          ].map(col => (
            <div key={col.title}>
              <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4">{col.title}</div>
              <ul className="space-y-2">
                {col.links.map(([id, label]) => (
                  <li key={label}>
                    <button onClick={() => id.startsWith("#") ? undefined : scrollTo(id)} className="text-sm hover:text-white transition-colors">
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-sm">© 2026 Snailon. All rights reserved.</p>
          <div className="flex items-center gap-4 text-sm">
            <span>Built in Morocco 🇲🇦</span>
            <a href="mailto:hi@snailon.ma" className="hover:text-white transition-colors">hi@snailon.ma</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
