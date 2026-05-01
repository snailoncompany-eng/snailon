import SignupForm from "@/components/signup-form";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-bg text-ink flex flex-col">
      <nav className="px-5 sm:px-8 py-5 max-w-7xl w-full mx-auto">
        <Logo />
      </nav>
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md card p-8">
          <div className="mb-6">
            <p className="eyebrow eyebrow-accent">create account</p>
            <h1 className="headline text-3xl mt-2">Start with Snailon.</h1>
            <p className="text-muted text-sm mt-2">One account per merchant. 25 MAD free credit on signup.</p>
          </div>
          <SignupForm />
          <p className="text-sm text-muted mt-6 text-center">
            Already have an account?{" "}
            <Link href="/login" className="btn-link">
              sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
