"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const supabase = createClient();
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      }}
      className={`btn btn-ghost text-sm text-muted hover:text-ink ${className}`}
    >
      Sign out
    </button>
  );
}
