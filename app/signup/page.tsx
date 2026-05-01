import SignupForm from "@/components/signup-form";
import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-cream text-ink flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="serif text-2xl tracking-tightest block mb-12">
          snailon
        </Link>
        <h1 className="serif text-5xl tracking-tightest leading-none">
          Create <span className="italic text-terracotta">your account.</span>
        </h1>
        <p className="mt-3 text-sm text-clay">
          One account per merchant. Free 25 MAD credit on signup.
        </p>
        <div className="mt-8">
          <SignupForm />
        </div>
        <p className="mt-6 mono text-xs uppercase tracking-[0.18em] text-clay">
          already have an account?{" "}
          <Link href="/login" className="text-terracotta">
            sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
