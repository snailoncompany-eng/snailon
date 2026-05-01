"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StoreConn = {
  id: string;
  platform: string;
  detected_platform: string | null;
  store_name: string | null;
  store_url: string | null;
  last_synced_at: string | null;
  product_count: number;
  capabilities: string[];
  pending_step: string | null;
  pixel_token: string | null;
  is_active: boolean;
  created_at: string;
};

type CarrierConn = {
  id: string;
  platform: string;
  is_active: boolean;
  created_at: string;
  metadata: any;
};

type QuickConnectResp = {
  ok: boolean;
  connection: {
    id: string;
    platform: string;
    detected_platform: string;
    store_name: string;
    store_url: string;
    capabilities: string[];
    pixel_token: string;
  };
  catalog_preview: { name: string; price_mad: number }[];
  catalog_total: number;
  next_step: any;
  pixel_snippet: string;
};

export default function IntegrationsClient({
  connectedStores,
  connectedCarriers,
}: {
  connectedStores: StoreConn[];
  connectedCarriers: CarrierConn[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<"idle" | "detecting" | "result">("idle");
  const [result, setResult] = useState<QuickConnectResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function quickConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setStage("detecting");
    setErr(null);
    try {
      const res = await fetch("/api/integrations/quick-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "couldn't connect");
      setResult(j);
      setStage("result");
      // Refresh the connected list in the background
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
      setStage("idle");
    }
  }

  async function disconnect(id: string) {
    if (!confirm("Disconnect this store?")) return;
    await fetch(`/api/integrations/${id}/disconnect`, { method: "POST" });
    router.refresh();
  }

  return (
    <div className="mt-12 space-y-12">
      {/* THE BIG CONNECT INPUT */}
      {stage !== "result" && (
        <section className="border border-sand p-8 md:p-10 bg-sand/30">
          <p className="mono text-[10px] uppercase tracking-[0.25em] text-terracotta">
            ⌬ &nbsp; one-click connect
          </p>
          <h2 className="serif text-3xl md:text-4xl tracking-tightest mt-2">
            Paste your store address.
          </h2>
          <p className="text-clay text-sm mt-1">
            Works with Shopify, WooCommerce, YouCan, and any other site.
          </p>

          <form onSubmit={quickConnect} className="mt-6 flex flex-col md:flex-row gap-3">
            <input
              type="text"
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yourstore.com"
              disabled={stage === "detecting"}
              className="flex-1 bg-cream border border-ink/20 focus:border-terracotta outline-none px-4 py-4 text-lg placeholder:text-clay/50 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={stage === "detecting" || !url.trim()}
              className="bg-ink text-cream px-8 py-4 mono text-xs uppercase tracking-[0.2em] hover:bg-terracotta transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {stage === "detecting" ? "scanning..." : "connect →"}
            </button>
          </form>

          {err && (
            <p className="text-terracotta text-sm mt-3 mono">{err}</p>
          )}

          {stage === "detecting" && <DetectingProgress />}

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[11px] mono uppercase tracking-[0.18em] text-clay">
            <span>✓ no API keys</span>
            <span>✓ no copy-paste</span>
            <span>✓ catalog in seconds</span>
            <span>✓ orders in real time</span>
          </div>
        </section>
      )}

      {/* RESULT VIEW */}
      {stage === "result" && result && (
        <ResultPanel
          result={result}
          onReset={() => {
            setStage("idle");
            setResult(null);
            setUrl("");
            router.refresh();
          }}
        />
      )}

      {/* CONNECTED LIST */}
      {connectedStores.length > 0 && stage !== "result" && (
        <section>
          <h2 className="serif text-2xl tracking-tightest">Connected.</h2>
          <div className="mt-4 space-y-3">
            {connectedStores.map((s) => (
              <ConnectedRow key={s.id} conn={s} onDisconnect={() => disconnect(s.id)} />
            ))}
          </div>
        </section>
      )}

      {/* CARRIERS */}
      {connectedCarriers.length > 0 && stage !== "result" && (
        <section>
          <p className="mono text-[10px] uppercase tracking-[0.25em] text-clay">delivery</p>
          <h2 className="serif text-2xl tracking-tightest mt-1">Delivery partner.</h2>
          <div className="mt-4 space-y-3">
            {connectedCarriers.map((c) => (
              <div key={c.id} className="border border-sand p-5 flex items-center gap-4 flex-wrap">
                <Monogram letter="F" />
                <div className="flex-1 min-w-[200px]">
                  <p className="serif text-xl tracking-tightest">ForceLog</p>
                  <p className="mono text-[11px] text-clay">
                    {c.metadata?.note ?? "auto-attached"}
                  </p>
                </div>
                <span className="mono text-[10px] uppercase tracking-[0.18em] text-moss">
                  ✓ ready
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DetectingProgress() {
  return (
    <div className="mt-6 space-y-2 text-[12px] mono">
      <p className="text-clay animate-pulse">⌬ resolving your store...</p>
      <p className="text-clay animate-pulse" style={{ animationDelay: "0.4s" }}>
        ⌬ probing platform fingerprints...
      </p>
      <p className="text-clay animate-pulse" style={{ animationDelay: "0.8s" }}>
        ⌬ pulling product catalog...
      </p>
    </div>
  );
}

function ResultPanel({
  result,
  onReset,
}: {
  result: QuickConnectResp;
  onReset: () => void;
}) {
  const { connection, catalog_preview, catalog_total, next_step, pixel_snippet } = result;
  const platformLabel =
    connection.detected_platform === "shopify"
      ? "Shopify"
      : connection.detected_platform === "woocommerce"
      ? "WooCommerce"
      : connection.detected_platform === "youcan"
      ? "YouCan"
      : "Custom site";

  return (
    <section className="space-y-8">
      {/* Hero result */}
      <div className="border border-moss p-6 md:p-8 bg-cream">
        <div className="flex items-center gap-2">
          <span className="serif text-2xl text-moss">✓</span>
          <p className="mono text-[10px] uppercase tracking-[0.25em] text-moss">
            store detected · {platformLabel}
          </p>
        </div>
        <h2 className="serif text-4xl tracking-tightest mt-2">
          {connection.store_name}
        </h2>
        <p className="mono text-[11px] text-clay mt-1">{connection.store_url}</p>

        {catalog_total > 0 ? (
          <div className="mt-6">
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-clay">
              {catalog_total} products imported
            </p>
            <div className="mt-2 grid sm:grid-cols-2 gap-2">
              {catalog_preview.slice(0, 6).map((p, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-sand pb-1">
                  <span className="truncate pr-2">{p.name}</span>
                  <span className="mono text-clay shrink-0">{Number(p.price_mad).toFixed(0)} MAD</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-clay mt-4">
            Catalog not publicly accessible. We'll sync it after the next step.
          </p>
        )}
      </div>

      {/* Next step */}
      <NextStepCard step={next_step} connectionId={connection.id} pixelSnippet={pixel_snippet} />

      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="mono text-[11px] uppercase tracking-[0.18em] text-clay hover:text-terracotta"
        >
          ← connect another store
        </button>
      </div>
    </section>
  );
}

function NextStepCard({
  step,
  connectionId,
  pixelSnippet,
}: {
  step: any;
  connectionId: string;
  pixelSnippet: string;
}) {
  const [done, setDone] = useState(false);

  if (!step) return null;

  return (
    <div className="border border-sand p-6 md:p-8">
      <p className="mono text-[10px] uppercase tracking-[0.25em] text-terracotta">
        ⌬ &nbsp; finish setup
      </p>
      <h3 className="serif text-2xl tracking-tightest mt-2">{step.title}</h3>
      <p className="text-clay text-sm mt-2 max-w-xl">{step.description}</p>

      {step.kind === "woocommerce_auto_auth" && (
        <a
          href={step.url}
          className="inline-block mt-6 bg-ink text-cream px-6 py-3 mono text-xs uppercase tracking-[0.2em] hover:bg-terracotta transition-colors"
        >
          {step.cta}
        </a>
      )}

      {step.kind === "shopify_install_app" && (
        <ShopifyStep step={step} connectionId={connectionId} onDone={() => setDone(true)} done={done} />
      )}

      {step.kind === "youcan_paste_token" && (
        <TokenPasteStep
          connectionId={connectionId}
          fields={step.fields}
          guideUrl={step.guideUrl}
          onDone={() => setDone(true)}
          done={done}
        />
      )}

      {step.kind === "pixel_only" && (
        <PixelStep snippet={pixelSnippet} />
      )}

      <p className="mono text-[10px] uppercase tracking-[0.18em] text-clay mt-6 leading-relaxed">
        Or skip for now — we'll keep the catalog you already have. Orders won't
        flow in real-time until you finish.
      </p>
    </div>
  );
}

function ShopifyStep({
  step,
  connectionId,
  onDone,
  done,
}: {
  step: any;
  connectionId: string;
  onDone: () => void;
  done: boolean;
}) {
  return (
    <div className="mt-6 space-y-6">
      {/* If our Shopify app isn't published yet, install URL is incomplete.
          Show fallback paste path always, plus the install link if configured. */}
      <TokenPasteStep
        connectionId={connectionId}
        fields={step.fallback?.fields ?? [
          { key: "admin_api_token", label: "Admin API token", type: "password", placeholder: "shpat_..." },
          { key: "api_secret_key", label: "API secret key", type: "password" },
        ]}
        onDone={onDone}
        done={done}
      />
    </div>
  );
}

function TokenPasteStep({
  connectionId,
  fields,
  guideUrl,
  onDone,
  done,
}: {
  connectionId: string;
  fields: { key: string; label: string; type: string; placeholder?: string }[];
  guideUrl?: string;
  onDone: () => void;
  done: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/integrations/finish-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connectionId, credentials: values }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "auth failed");
      onDone();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="mt-6 mono text-[11px] uppercase tracking-[0.18em] text-moss">
        ✓ orders will now sync in real time
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3 max-w-md">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block mono text-[10px] uppercase tracking-[0.2em] text-clay mb-1">
            {f.label}
          </label>
          <input
            type={f.type as any}
            placeholder={f.placeholder}
            value={values[f.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            className="w-full bg-transparent border-b border-ink/30 focus:border-terracotta outline-none py-2 text-sm"
          />
        </div>
      ))}
      {err && <p className="text-terracotta text-sm">{err}</p>}
      <div className="flex gap-3 items-center pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-ink text-cream px-6 py-3 mono text-xs uppercase tracking-[0.2em] hover:bg-terracotta transition-colors disabled:opacity-50"
        >
          {loading ? "verifying..." : "finish setup →"}
        </button>
        {guideUrl && (
          <a
            href={guideUrl}
            target="_blank"
            rel="noreferrer"
            className="mono text-[11px] uppercase tracking-[0.18em] text-clay hover:text-terracotta"
          >
            where do I find this? ↗
          </a>
        )}
      </div>
    </form>
  );
}

function PixelStep({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-6">
      <p className="text-[12px] text-clay mb-2">
        Paste this snippet into your store's theme footer (just before
        <code className="mono mx-1">&lt;/body&gt;</code>):
      </p>
      <pre className="mono text-[11px] bg-ink text-cream p-3 overflow-x-auto whitespace-pre-wrap break-all">
        {snippet}
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(snippet);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="mt-3 mono text-[11px] uppercase tracking-[0.18em] border border-ink px-4 py-2 hover:bg-sand transition-colors"
      >
        {copied ? "✓ copied" : "copy snippet"}
      </button>
    </div>
  );
}

function ConnectedRow({ conn, onDisconnect }: { conn: StoreConn; onDisconnect: () => void }) {
  const platformLabel =
    conn.detected_platform === "shopify"
      ? "Shopify"
      : conn.detected_platform === "woocommerce"
      ? "WooCommerce"
      : conn.detected_platform === "youcan"
      ? "YouCan"
      : "Custom";
  const monogram = platformLabel[0];
  const realtime = (conn.capabilities ?? []).includes("orders_realtime");
  return (
    <div className="border border-sand p-5 flex items-center gap-4 flex-wrap">
      <Monogram letter={monogram} />
      <div className="flex-1 min-w-[200px]">
        <p className="serif text-xl tracking-tightest">{conn.store_name ?? conn.store_url}</p>
        <p className="mono text-[11px] text-clay">
          {platformLabel} · {conn.product_count} products
          {conn.last_synced_at && ` · synced ${timeAgo(conn.last_synced_at)}`}
        </p>
      </div>
      <span
        className={`mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 ${
          realtime ? "bg-moss text-cream" : "bg-sand text-clay"
        }`}
      >
        {realtime ? "live orders" : conn.pending_step ? "setup pending" : "catalog only"}
      </span>
      <button
        onClick={onDisconnect}
        className="mono text-[11px] uppercase tracking-[0.18em] text-clay hover:text-terracotta"
      >
        disconnect
      </button>
    </div>
  );
}

function Monogram({ letter }: { letter: string }) {
  return (
    <div className="w-12 h-12 border border-ink flex items-center justify-center serif text-2xl tracking-tightest">
      {letter}
    </div>
  );
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
