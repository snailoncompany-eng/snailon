import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWaitlistThanks } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const business_name = body.business_name ? String(body.business_name).trim() : null;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("waitlist")
      .upsert({ email, phone, business_name, source: "homepage" }, { onConflict: "email" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Best-effort thank-you email; don't fail the whole request if Resend is down.
    sendWaitlistThanks(email).catch((e) => console.warn("waitlist email failed:", e));

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "bad request" }, { status: 400 });
  }
}
