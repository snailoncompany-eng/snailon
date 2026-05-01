"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlatformDescriptor, CarrierDescriptor, CredentialField } from "@/lib/integrations/types";

type StoreConn = {
  id: string;
  platform: string;
  store_name: string | null;
  store_url: string | null;
  last_synced_at: string | null;
  product_count: number;
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

export default function IntegrationsClient({
  availableStores,
  availableCarriers,
  connectedStores,
  connectedCarriers,
}: {
  availableStores: PlatformDescriptor[];
  availableCarriers: CarrierDescriptor[];
  connectedStores: StoreConn[];
  connectedCarriers: CarrierConn[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<
    | { kind: "store"; descriptor: PlatformDescriptor }
    | { kind: "carrier"; descriptor: CarrierDescriptor }
    | null
  >(null);

  async function disconnect(id: string) {
    if (!confirm("Disconnect this integration?")) return;
    await fetch(`/api/integrations/${id}/disconnect`, { method: "POST" });
    router.refresh();
  }

  async function syncCatalog(id: string) {
    const res = await fetch(`/api/integrations/${id}/sync-catalog`, { method: "POST" });
    const j = await res.json();
    alert(res.ok ? `Synced ${j.count} products.` : `Sync failed: ${j.error}`);
    router.refresh();
  }

  // Sets of connected platforms for quick lookup
  const connectedStorePlatforms = new Set(connectedStores.map((s) => s.platform));
  const connectedCarrierPlatforms = new Set(connectedCarriers.map((c) => c.platform));

  return (
    <div className="mt-12 space-y-16">
      {/* CONNECTED — only render if there are any */}
      {(connectedStores.length > 0 || connectedCarriers.length > 0) && (
        <section>
          <h2 className="serif text-2xl tracking-tightest">Connected.</h2>
          <div className="mt-4 space-y-3">
            {connectedStores.map((s) => {
              const desc = availableStores.find((d) => d.id === s.platform);
              return (
                <div
                  key={s.id}
                  className="border border-sand p-5 flex items-center gap-4 flex-wrap"
                >
                  <Monogram letter={desc?.monogram ?? "?"} />
                  <div className="flex-1 min-w-[200px]">
                    <p className="serif text-xl tracking-tightest">
                      {s.store_name ?? desc?.label ?? s.platform}
                    </p>
                    <p className="mono text-[11px] text-clay">
                      {desc?.label ?? s.platform} ·{" "}
                      {s.product_count > 0
                        ? `${s.product_count} products synced`
                        : "no catalog yet"}
                      {s.last_synced_at &&
                        ` · last sync ${new Date(s.last_synced_at).toLocaleString()}`}
                    </p>
                  </div>
                  <button
                    onClick={() => syncCatalog(s.id)}
                    className="mono text-[11px] uppercase tracking-[0.18em] border border-ink px-4 py-2 hover:bg-sand"
                  >
                    sync catalog
                  </button>
                  <button
                    onClick={() => disconnect(s.id)}
                    className="mono text-[11px] uppercase tracking-[0.18em] text-clay hover:text-terracotta"
                  >
                    disconnect
                  </button>
                </div>
              );
            })}
            {connectedCarriers.map((c) => {
              const desc = availableCarriers.find((d) => d.id === c.platform);
              return (
                <div
                  key={c.id}
                  className="border border-sand p-5 flex items-center gap-4 flex-wrap"
                >
                  <Monogram letter={desc?.monogram ?? "?"} />
                  <div className="flex-1 min-w-[200px]">
                    <p className="serif text-xl tracking-tightest">
                      {desc?.label ?? c.platform}
                    </p>
                    <p className="mono text-[11px] text-clay">
                      delivery partner ·{" "}
                      {c.metadata?.note ?? "ready to schedule pickups"}
                    </p>
                  </div>
                  <button
                    onClick={() => disconnect(c.id)}
                    className="mono text-[11px] uppercase tracking-[0.18em] text-clay hover:text-terracotta"
                  >
                    disconnect
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* AVAILABLE STORES */}
      <section>
        <p className="mono text-[10px] uppercase tracking-[0.25em] text-clay">store platforms</p>
        <h2 className="serif text-2xl tracking-tightest mt-1">Where do your orders come from?</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {availableStores.map((d) => {
            const already = connectedStorePlatforms.has(d.id);
            return (
              <PlatformCard
                key={d.id}
                desc={d}
                connected={already}
                onClick={() => !already && setModal({ kind: "store", descriptor: d })}
              />
            );
          })}
        </div>
      </section>

      {/* AVAILABLE CARRIERS */}
      <section>
        <p className="mono text-[10px] uppercase tracking-[0.25em] text-clay">delivery partners</p>
        <h2 className="serif text-2xl tracking-tightest mt-1">Who delivers your orders?</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {availableCarriers.map((d) => {
            const already = connectedCarrierPlatforms.has(d.id);
            return (
              <PlatformCard
                key={d.id}
                desc={d}
                connected={already}
                onClick={() => !already && setModal({ kind: "carrier", descriptor: d })}
              />
            );
          })}
        </div>
      </section>

      {modal && (
        <ConnectModal
          kind={modal.kind}
          descriptor={modal.descriptor}
          onClose={() => setModal(null)}
          onConnected={() => {
            setModal(null);
            router.refresh();
          }}
        />
      )}
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

function PlatformCard({
  desc,
  connected,
  onClick,
}: {
  desc: PlatformDescriptor | CarrierDescriptor;
  connected: boolean;
  onClick: () => void;
}) {
  const statusBadge =
    desc.status === "live" ? null : (
      <span className="mono text-[9px] uppercase tracking-[0.2em] bg-sand text-clay px-2 py-1">
        {desc.status === "preview" ? "preview" : "coming soon"}
      </span>
    );
  return (
    <button
      onClick={onClick}
      disabled={connected}
      className={`text-left p-5 border transition-colors ${
        connected
          ? "border-moss bg-cream cursor-default"
          : "border-sand hover:border-ink"
      }`}
    >
      <div className="flex items-start gap-3">
        <Monogram letter={desc.monogram} />
        <div className="flex-1">
          <p className="serif text-xl tracking-tightest">{desc.label}</p>
          <p className="text-[12px] text-clay mt-1 leading-snug">{desc.tagline}</p>
        </div>
      </div>
      <div className="flex justify-between items-center mt-4">
        {statusBadge ?? <span />}
        {connected ? (
          <span className="mono text-[10px] uppercase tracking-[0.2em] text-moss">✓ connected</span>
        ) : (
          <span className="mono text-[10px] uppercase tracking-[0.2em] text-terracotta">connect →</span>
        )}
      </div>
    </button>
  );
}

function ConnectModal({
  kind,
  descriptor,
  onClose,
  onConnected,
}: {
  kind: "store" | "carrier";
  descriptor: PlatformDescriptor | CarrierDescriptor;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          platform: descriptor.id,
          credentials: values,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "connection failed");
      if (j.webhook_url) {
        setWebhookUrl(j.webhook_url);
        // Brief moment to show the webhook URL, then close
        setTimeout(onConnected, 2500);
      } else {
        onConnected();
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-6">
      <div className="bg-cream max-w-lg w-full p-8 grain max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.25em] text-terracotta">
              connect · {kind}
            </p>
            <h3 className="serif text-3xl tracking-tightest mt-1">
              {descriptor.label}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="mono text-xl text-clay hover:text-terracotta leading-none"
          >
            ×
          </button>
        </div>

        {descriptor.setupHint && (
          <p className="text-[12px] text-clay mt-4 leading-relaxed border-l-2 border-sand pl-3">
            {descriptor.setupHint}
          </p>
        )}

        {webhookUrl ? (
          <div className="mt-6 space-y-3">
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-moss">✓ connected</p>
            <p className="text-sm">
              We'll auto-register the order webhook with {descriptor.label}. If
              you ever need it manually, this is the URL:
            </p>
            <pre className="mono text-[11px] bg-ink text-cream p-3 overflow-x-auto break-all whitespace-pre-wrap">
              {webhookUrl}
            </pre>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {descriptor.fields.map((f: CredentialField) => (
              <div key={f.key}>
                <label className="block mono text-[10px] uppercase tracking-[0.2em] text-clay mb-1">
                  {f.label}
                  {f.required && <span className="text-terracotta"> *</span>}
                </label>
                <input
                  type={f.type}
                  required={f.required}
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                  className="w-full bg-transparent border-b border-ink/30 focus:border-terracotta outline-none py-2 text-sm placeholder:text-clay/50"
                />
                {f.hint && <p className="text-[11px] text-clay mt-1">{f.hint}</p>}
              </div>
            ))}
            {err && (
              <p className="text-terracotta text-sm border border-terracotta/30 p-2">
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-cream py-3 mono text-xs uppercase tracking-[0.2em] hover:bg-terracotta transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "testing connection..." : `connect ${descriptor.label} →`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
