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
    <div className="space-y-10">
      {stage !== "result" && (
        <section className="card p-6 sm:p-8">
          <p className="eyebrow eyebrow-accent">one-click connect</p>
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight mt-2">
            Paste your store address.
          </h2>
          <p className="text-muted text-sm mt-1">
            Works with Shopify, WooCommerce, YouCan, and any other site.
          </p>

          <form onSubmit={quickConnect} className="mt-6 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yourstore.com"
              disabled={stage === "detecting"}
              className="input input-lg flex-1"
            />
            <button
              type="submit"
              disabled={stage === "detecting" || !url.trim()}
              className="btn btn-primary px-6"
            >
              {stage === "detecting" ? "scanning..." : "Connect"}
              {stage !== "detecting" && <span aria-hidden>→</span>}
            </button>
          </form>

          {err && (
            <div className="mt-3 rounded-md bg-[#FFE9E9] border border-[#F4C5C5] p-3">
              <p className="text-error text-sm">{err}</p>
            </div>
          )}

          {stage === "detecting" && <DetectingProgress />}

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="dot bg-success" />no API keys</span>
            <span className="flex items-center gap-1.5"><span className="dot bg-success" />no copy-paste</span>
            <span className="flex items-center gap-1.5"><span className="dot bg-success" />catalog in seconds</span>
            <span className="flex items-center gap-1.5"><span className="dot bg-success" />orders real-time</span>
          </div>
        </section>
      )}

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

      {connectedStores.length > 0 && stage !== "result" && (
        <section>
          <h2 className="font-display text-2xl tracking-tight mb-4">Connected stores</h2>
          <div className="space-y-3">
            {connectedStores.map((s) => (
              <ConnectedRow key={s.id} conn={s} onDisconnect={() => disconnect(s.id)} />
            ))}
          </div>
        </section>
      )}

      {connectedCarriers.length > 0 && stage !== "result" && (
        <section>
          <h2 className="font-display text-2xl tracking-tight mb-4">Delivery</h2>
          <div className="space-y-3">
            {connectedCarriers.map((c) => (
              <div key={c.id} className="card p-5 flex items-center gap-4 flex-wrap">
                <Monogram letter="F" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">ForceLog</p>
                  <p className="text-xs text-muted">{c.metadata?.note ?? "auto-attached"}</p>
                </div>
                <span className="pill pill-success">
                  <span className="dot bg-success" />
                  ready
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
    <div className="mt-5 space-y-2 text-sm">
      <ProgressLine label="Resolving your store..." delay={0} />
      <ProgressLine label="Probing platform fingerprints..." delay={500} />
      <ProgressLine label="Pulling product catalog..." delay={1100} />
    </div>
  );
}

function ProgressLine({ label, delay }: { label: string; delay: number }) {
  return (
    <div className="flex items-center gap-2 text-muted animate-pulseDot" style={{ animationDelay: `${delay}ms` }}>
      <span className="dot bg-accent" />
      <span>{label}</span>
    </div>
  );
}

function ResultPanel({ result, onReset }: { result: QuickConnectResp; onReset: () => void }) {
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
    <section className="space-y-6 animate-rise">
      <div className="card p-6 sm:p-8 border-success bg-success-soft/40">
        <div className="flex items-center gap-2">
          <span className="text-success text-xl leading-none">✓</span>
          <p className="eyebrow text-success">store detected · {platformLabel}</p>
        </div>
        <h2 className="font-display text-3xl tracking-tight mt-2">{connection.store_name}</h2>
        <p className="font-mono text-xs text-muted mt-1 break-all">{connection.store_url}</p>

        {catalog_total > 0 ? (
          <div className="mt-6">
            <p className="eyebrow">{catalog_total} products imported</p>
            <div className="mt-3 grid sm:grid-cols-2 gap-2">
              {catalog_preview.slice(0, 6).map((p, i) => (
                <div key={i} className="flex justify-between gap-3 text-sm border-b border-line pb-2">
                  <span className="truncate min-w-0">{p.name}</span>
                  <span className="font-mono text-muted shrink-0">{Number(p.price_mad).toFixed(0)} MAD</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted mt-4">
            Catalog not publicly accessible. We'll sync it after the next step.
          </p>
        )}
      </div>

      <NextStepCard step={next_step} connectionId={connection.id} pixelSnippet={pixel_snippet} />

      <button onClick={onReset} className="btn-link text-sm">
        ← connect another store
      </button>
    </section>
  );
}

function NextStepCard({ step, connectionId, pixelSnippet }: { step: any; connectionId: string; pixelSnippet: string }) {
  const [done, setDone] = useState(false);
  if (!step) return null;
  return (
    <div className="card p-6 sm:p-8">
      <p className="eyebrow eyebrow-accent">finish setup</p>
      <h3 className="font-display text-2xl tracking-tight mt-2">{step.title}</h3>
      <p className="text-muted text-sm mt-2 max-w-xl">{step.description}</p>

      {step.kind === "woocommerce_auto_auth" && (
        <a href={step.url} className="btn btn-primary mt-5">
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
      {step.kind === "pixel_only" && <PixelStep snippet={pixelSnippet} />}

      <p className="text-xs text-muted mt-6">
        Or skip for now — we'll keep the catalog. Orders won't sync in real-time until you finish.
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
    <div className="mt-5">
      <TokenPasteStep
        connectionId={connectionId}
        fields={
          step.fallback?.fields ?? [
            { key: "admin_api_token", label: "Admin API token", type: "password", placeholder: "shpat_..." },
            { key: "api_secret_key", label: "API secret key", type: "password" },
          ]
        }
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
      <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-soft">
        <span className="text-success">✓</span>
        <span className="text-sm text-success font-medium">Orders will now sync in real time</span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3 max-w-md">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="eyebrow block mb-1.5">{f.label}</label>
          <input
            type={f.type as any}
            placeholder={f.placeholder}
            value={values[f.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            className="input"
          />
        </div>
      ))}
      {err && (
        <div className="rounded-md bg-[#FFE9E9] border border-[#F4C5C5] p-2.5">
          <p className="text-error text-sm">{err}</p>
        </div>
      )}
      <div className="flex gap-3 items-center pt-2">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? "verifying..." : "Finish setup"}
          {!loading && <span aria-hidden>→</span>}
        </button>
        {guideUrl && (
          <a href={guideUrl} target="_blank" rel="noreferrer" className="btn-link text-sm">
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
    <div className="mt-5">
      <p className="text-sm text-muted mb-2">
        Paste this snippet into your store's theme footer (just before <code className="font-mono">&lt;/body&gt;</code>):
      </p>
      <pre className="font-mono text-xs bg-ink text-white p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
        {snippet}
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(snippet);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="btn btn-secondary mt-3 text-sm"
      >
        {copied ? "✓ Copied" : "Copy snippet"}
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
    <div className="card p-4 sm:p-5 flex items-center gap-4 flex-wrap">
      <Monogram letter={monogram} />
      <div className="flex-1 min-w-[180px]">
        <p className="font-medium truncate">{conn.store_name ?? conn.store_url}</p>
        <p className="text-xs text-muted">
          {platformLabel} · {conn.product_count} products
          {conn.last_synced_at && ` · synced ${timeAgo(conn.last_synced_at)}`}
        </p>
      </div>
      <span className={realtime ? "pill pill-success" : "pill pill-muted"}>
        <span className={`dot ${realtime ? "bg-success" : "bg-subtle"}`} />
        {realtime ? "live orders" : conn.pending_step ? "setup pending" : "catalog only"}
      </span>
      <button onClick={onDisconnect} className="btn-link text-xs text-muted hover:text-error">
        disconnect
      </button>
    </div>
  );
}

function Monogram({ letter }: { letter: string }) {
  return (
    <div className="w-10 h-10 rounded-md bg-ink text-white flex items-center justify-center font-display text-lg shrink-0">
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
