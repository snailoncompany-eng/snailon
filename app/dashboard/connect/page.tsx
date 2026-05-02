import { listPlatforms } from '@/lib/snailon-platforms/catalog';
import PlatformPicker from './components/PlatformPicker';

export const metadata = {
  title: 'Connect your store · Snailon',
  description: 'Connect your e-commerce store to Snailon in under 15 seconds.'
};

export default function ConnectPage() {
  const platforms = listPlatforms();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
          Step 1 of 2
        </p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight text-stone-900 md:text-5xl">
          Connect your store
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-600">
          Pick the platform your shop runs on. We&rsquo;ll show you the one snippet
          to paste &mdash; and we&rsquo;ll detect your first order automatically.
        </p>
      </header>

      <PlatformPicker platforms={platforms} />

      <footer className="mt-16 border-t border-stone-200 pt-6">
        <p className="text-sm text-stone-500">
          Don&rsquo;t see your platform? Pick <span className="font-medium text-stone-700">Custom site</span> &mdash;
          our snippet works on any storefront with an order-confirmation page.
        </p>
      </footer>
    </main>
  );
}
