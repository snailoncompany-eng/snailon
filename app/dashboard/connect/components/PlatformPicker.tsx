'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { PlatformInfo } from '@/lib/snailon-platforms/catalog';

interface Props {
  platforms: PlatformInfo[];
}

export default function PlatformPicker({ platforms }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<PlatformInfo | null>(null);
  const [domain, setDomain] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(p: PlatformInfo) {
    setSelected(p);
    setError(null);
    if (!name) setName(p.name + ' store');
  }

  async function handleConnect() {
    if (!selected) return setError('Pick a platform first.');
    const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!cleaned || !cleaned.includes('.')) {
      return setError('Enter a valid domain like mystore.ma');
    }

    startTransition(async () => {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || selected.name + ' store',
          platform: selected.id,
          primary_domain: cleaned
        })
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error === 'invalid_domain' ? 'That domain doesn\'t look right.' : 'Couldn\'t create store. Try again.');
        return;
      }
      router.push(`/dashboard/connect/${selected.id}?store=${body.id}`);
    });
  }

  return (
    <div className="space-y-10">
      {/* Platform grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {platforms.map((p) => {
          const isSelected = selected?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p)}
              className={
                'group relative flex flex-col items-start gap-1 rounded-xl border bg-white px-5 py-4 text-left transition-all ' +
                (isSelected
                  ? 'border-stone-900 shadow-[0_2px_0_0_var(--accent)] ring-1 ring-stone-900'
                  : 'border-stone-200 hover:border-stone-400 hover:shadow-sm')
              }
              style={{ ['--accent' as string]: p.accent }}
            >
              <span
                className="absolute left-0 top-4 h-6 w-1 rounded-r-full transition-opacity"
                style={{
                  backgroundColor: p.accent,
                  opacity: isSelected ? 1 : 0
                }}
              />
              <span className="font-serif text-lg leading-tight text-stone-900">{p.name}</span>
              <span className="text-xs uppercase tracking-wider text-stone-500">{p.tagline}</span>
              <span className="mt-1 text-sm leading-snug text-stone-600">{p.description}</span>
            </button>
          );
        })}
      </div>

      {/* Domain + name input */}
      {selected && (
        <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-6">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
            Step 2 of 2
          </p>
          <h2 className="mb-5 font-serif text-2xl leading-tight text-stone-900">
            Where does your store live?
          </h2>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium text-stone-700">Store name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Shop"
              className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-base text-stone-900 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-700">
              Store domain
            </span>
            <div className="flex overflow-hidden rounded-lg border border-stone-300 bg-white focus-within:border-stone-900 focus-within:ring-2 focus-within:ring-stone-900/10">
              <span className="flex select-none items-center bg-stone-100 px-3 text-sm text-stone-500">
                https://
              </span>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="mystore.ma"
                className="w-full bg-transparent px-3 py-2.5 text-base text-stone-900 outline-none"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <span className="mt-1.5 block text-xs text-stone-500">
              Just the domain &mdash; no http://, no slashes, no /admin.
            </span>
          </label>

          {error && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleConnect}
            disabled={isPending}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800 active:translate-y-[1px] disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? 'Creating…' : (
              <>
                Continue
                <span aria-hidden>→</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
