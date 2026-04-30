import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Thank You — Snailon" };

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h1 className="text-4xl font-black text-neutral-900 mb-4">Payment confirmed! 🇲🇦</h1>
        <p className="text-neutral-600 text-lg mb-6 leading-relaxed">
          You&apos;re a Snailon Founding Store. Your +50% lifetime bonus is locked in. Check your email for confirmation.
        </p>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8 text-sm text-emerald-800">
          Top up <strong>200 MAD</strong> → receive <strong>300 MAD</strong>, for life.
        </div>
        <Link href="/" className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-xl transition-all">
          Back to Snailon →
        </Link>
      </div>
    </div>
  );
}
