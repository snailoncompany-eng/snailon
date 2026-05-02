'use client';

import { useEffect, useState } from 'react';
import type { PlatformInfo } from '@/lib/snailon-platforms/catalog';

interface Props {
  snippet: string;
  platform: PlatformInfo;
  storeId: string;
}

/**
 * The single thing the merchant has to copy. Big code box, one button.
 *
 * For WooCommerce we additionally offer a one-click plugin download — the
 * server returns the same secrets baked in via /api/stores/[id]?include=plugin.
 *
 * No syntax-highlighting library: we render the snippet in a monospace box
 * with stone-50 background and a stone-200 border. Anything more is noise.
 */
export default function SnippetCard({ snippet, platform, storeId }: Props) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Reset the "Copied" state after 2s so a second copy still gives feedback.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
    } catch {
      // Fallback for older browsers / restricted contexts (some embedded views).
      const ta = document.createElement('textarea');
      ta.value = snippet;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
    }
  }

  async function handleDownloadPlugin() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/stores/${storeId}?include=plugin`);
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      if (!data.plugin_php) throw new Error('no plugin');

      // Trigger download as a single PHP file. Merchants can also drop this
      // directly into wp-content/plugins/snailon/ if they prefer manual install.
      const blob = new Blob([data.plugin_php], { type: 'application/x-php' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'snailon.php';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Could not download plugin. Please copy the snippet manually.');
    } finally {
      setDownloading(false);
    }
  }

  const isWoo = platform.id === 'woocommerce';
  const isShopify = platform.id === 'shopify';

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="font-serif text-xl text-stone-900">
          {isWoo ? 'Plugin or snippet' : 'Your snippet'}
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-wider text-stone-400">
          {isShopify ? 'Custom Pixel code' : 'HTML'}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50/60">
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-2.5">
          <span className="flex items-center gap-2 text-xs text-stone-500">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: platform.accent }}
              aria-hidden
            />
            <span className="font-medium text-stone-600">{platform.insertionLocation}</span>
          </span>
          <button
            onClick={handleCopy}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              copied
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-stone-900 text-white hover:bg-stone-800'
            }`}
            aria-label="Copy snippet to clipboard"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <pre className="max-h-[340px] overflow-auto px-4 py-4 font-mono text-[12.5px] leading-relaxed text-stone-700">
          <code>{snippet}</code>
        </pre>
      </div>

      {isWoo && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-800">
              Easier: install the plugin
            </p>
            <p className="text-xs text-stone-500">
              One-click install. Your store key is already baked in — nothing else to configure.
            </p>
          </div>
          <button
            onClick={handleDownloadPlugin}
            disabled={downloading}
            className="rounded-md border border-stone-900 bg-white px-4 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-stone-900 hover:text-white disabled:opacity-50"
          >
            {downloading ? 'Preparing…' : 'Download snailon.php'}
          </button>
        </div>
      )}

      {isShopify && (
        <p className="mt-3 text-xs leading-relaxed text-stone-500">
          In Shopify admin, go to <span className="font-medium text-stone-700">Settings → Customer events → Add custom pixel</span>, name it <span className="font-mono">Snailon</span>, set <span className="font-medium text-stone-700">Permissions</span> to <span className="font-mono">Not required</span>, paste the code above, and click <span className="font-medium text-stone-700">Save</span> then <span className="font-medium text-stone-700">Connect</span>.
        </p>
      )}
    </section>
  );
}
