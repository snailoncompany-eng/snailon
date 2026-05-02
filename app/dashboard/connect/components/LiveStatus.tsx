'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  storeId: string;
  initialStatus: 'pending' | 'testing' | 'live' | 'disconnected' | string;
}

interface IngestLogEntry {
  outcome: 'accepted' | 'duplicate' | 'origin_rejected' | 'signature_rejected' | 'rate_limited' | 'malformed';
  origin: string | null;
  created_at: string;
}

interface StatusResponse {
  connection_status: 'pending' | 'testing' | 'live' | 'disconnected';
  first_order_at: string | null;
  last_order_at: string | null;
  recent_orders_5min: number;
  recent_log: IngestLogEntry[];
}

const POLL_MS = 2000;

/**
 * Wizard's live progress indicator. Three visual states:
 *
 *   1. waiting      — default, while we haven't seen any signal yet
 *   2. warning      — recent ingest_log shows origin_rejected/etc, so we
 *                     can tell the merchant *why* their test order didn't
 *                     count without making them dig through logs
 *   3. connected    — connection_status flipped to 'live' (first real order
 *                     accepted). We stop polling here; this is terminal.
 *
 * Polls every 2s. The status endpoint is cheap (one indexed select + count)
 * and merchants typically hit ✅ within 30-60s of pasting the snippet, so
 * we're talking ~30 calls worst case per session.
 */
export default function LiveStatus({ storeId, initialStatus }: Props) {
  const [status, setStatus] = useState<StatusResponse | null>(
    initialStatus === 'live'
      ? { connection_status: 'live', first_order_at: null, last_order_at: null, recent_orders_5min: 0, recent_log: [] }
      : null
  );
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    // Already live → no need to poll. We just render the success state.
    if (status?.connection_status === 'live') return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const res = await fetch(`/api/stores/${storeId}/status`, { cache: 'no-store' });
        if (!res.ok) throw new Error('status_failed');
        const data: StatusResponse = await res.json();
        if (cancelled) return;
        setStatus(data);
        setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
        // Stop polling on terminal state.
        if (data.connection_status !== 'live') {
          timer = setTimeout(tick, POLL_MS);
        }
      } catch {
        // Network blip — back off a bit, keep going.
        if (!cancelled) timer = setTimeout(tick, POLL_MS * 2);
      }
    }

    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // We intentionally re-run only if storeId changes; status changes are handled inside tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const lastWarning = findLatestWarning(status?.recent_log || []);
  const isLive = status?.connection_status === 'live';

  // ─── Live state ────────────────────────────────────────────────────────
  if (isLive) {
    return (
      <div className="mt-8 flex items-start gap-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm text-white">
          ✓
        </span>
        <div className="flex-1">
          <p className="font-serif text-lg text-emerald-900">Connected — receiving orders</p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-800/80">
            Your store is now live with Snailon. New orders will be auto-confirmed on WhatsApp within 5 minutes.
            {status?.recent_orders_5min ? ` (${status.recent_orders_5min} order${status.recent_orders_5min === 1 ? '' : 's'} in the last 5 minutes.)` : ''}
          </p>
        </div>
      </div>
    );
  }

  // ─── Warning state — merchant *did* trigger something, but it failed ───
  if (lastWarning) {
    return (
      <div className="mt-8 flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50/60 p-5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm text-white">
          !
        </span>
        <div className="flex-1">
          <p className="font-serif text-lg text-amber-900">{warningTitle(lastWarning.outcome)}</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
            {warningExplanation(lastWarning)}
          </p>
          <p className="mt-2 font-mono text-xs text-amber-800/70">
            Still listening — fix the issue and place another test order.
          </p>
        </div>
      </div>
    );
  }

  // ─── Default waiting state ─────────────────────────────────────────────
  return (
    <div className="mt-8 flex items-start gap-4 rounded-xl border border-stone-200 bg-white p-5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-stone-50">
        <span className="block h-2 w-2 animate-pulse rounded-full bg-stone-400" />
      </span>
      <div className="flex-1">
        <p className="font-serif text-lg text-stone-900">Waiting for your first order</p>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          Place a test order on your store. We&apos;ll detect it within seconds and flip this card to ✓.
        </p>
        {elapsed > 5 && (
          <p className="mt-2 font-mono text-xs text-stone-400">
            Listening for {elapsed}s…
          </p>
        )}
      </div>
    </div>
  );
}

function findLatestWarning(log: IngestLogEntry[]): IngestLogEntry | null {
  const bad = log.find(
    (l) =>
      l.outcome === 'origin_rejected' ||
      l.outcome === 'signature_rejected' ||
      l.outcome === 'rate_limited' ||
      l.outcome === 'malformed'
  );
  return bad || null;
}

function warningTitle(outcome: IngestLogEntry['outcome']): string {
  switch (outcome) {
    case 'origin_rejected':
      return 'Domain mismatch';
    case 'signature_rejected':
      return 'Signature mismatch';
    case 'rate_limited':
      return 'Too many requests — slowing down';
    case 'malformed':
      return 'Order data was incomplete';
    default:
      return 'Detected an issue';
  }
}

function warningExplanation(entry: IngestLogEntry): string {
  switch (entry.outcome) {
    case 'origin_rejected':
      return entry.origin
        ? `We received an order from "${entry.origin}", but that domain isn't on your store's allow-list. Make sure the snippet is installed on the same domain you registered.`
        : `An order arrived from a domain that isn't registered to this store. Check that the snippet is on the right site.`;
    case 'signature_rejected':
      return `The signature on the incoming webhook didn't match. If you copied the plugin manually, please re-download it — it includes your unique secret.`;
    case 'rate_limited':
      return `We're seeing a burst of orders from your store — that's good news, but we briefly throttled to protect our pipeline. New orders are being accepted again.`;
    case 'malformed':
      return `An order arrived with missing fields (likely no customer phone). It will still queue, but the agent may need to ask the customer for it.`;
    default:
      return `Something unexpected happened. Try placing another test order.`;
  }
}
