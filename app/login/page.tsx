import LoginForm from "@/components/login-form";
import Link from "next/link";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-cream text-ink flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="serif text-2xl tracking-tightest block mb-12">
          snailon
        </Link>
        <h1 className="serif text-5xl tracking-tightest leading-none">
          Welcome <span className="italic text-terracotta">back.</span>
        </h1>
        <div className="mt-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 mono text-xs uppercase tracking-[0.18em] text-clay">
          new here?{" "}
          <Link href="/signup" className="text-terracotta">
            create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
