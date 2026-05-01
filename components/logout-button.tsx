"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      }}
      className="mono text-[11px] uppercase tracking-[0.2em] text-clay hover:text-terracotta mt-2"
    >
      sign out →
    </button>
  );
}
