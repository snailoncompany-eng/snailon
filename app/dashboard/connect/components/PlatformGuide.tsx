import type { PlatformInfo } from '@/lib/snailon-platforms/catalog';

interface Props {
  platform: PlatformInfo;
  adminLink?: string;
}

export default function PlatformGuide({ platform, adminLink }: Props) {
  return (
    <div className="mb-8">
      {adminLink && (
        <a
          href={adminLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition hover:border-stone-900 hover:shadow-sm"
        >
          {platform.steps[0].link?.label || 'Open admin'}
          <span aria-hidden className="text-stone-400">↗</span>
        </a>
      )}

      <ol className="space-y-3">
        {platform.steps.map((step: PlatformInfo["steps"][number], i: number) => (
          <li key={i} className="flex gap-4">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white font-mono text-xs font-semibold text-stone-700"
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="pt-0.5">
              <p className="text-base leading-relaxed text-stone-800">{step.text}</p>
              {step.hint && (
                <p className="mt-1 text-sm text-stone-500">{step.hint}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
