import LoginForm from "@/components/login-form";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/ui/logo";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-bg text-ink flex flex-col">
      <nav className="px-5 sm:px-8 py-5 max-w-7xl w-full mx-auto">
        <Logo />
      </nav>
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md card p-8">
          <div className="mb-6">
            <p className="eyebrow eyebrow-accent">welcome back</p>
            <h1 className="headline text-3xl mt-2">Sign in to Snailon.</h1>
          </div>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
          <p className="text-sm text-muted mt-6 text-center">
            New here?{" "}
            <Link href="/signup" className="btn-link">
              create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
