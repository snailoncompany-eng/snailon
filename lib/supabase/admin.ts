import { createClient as createSbClient } from "@supabase/supabase-js";

// SERVER-ONLY. Never import this in a client component.
// Bypasses RLS — use for webhooks, internal jobs, admin operations.
export function createAdminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
