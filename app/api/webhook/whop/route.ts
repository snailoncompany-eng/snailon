import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sigBytes = Uint8Array.from(signature.replace("sha256=", ""), c => c.charCodeAt(0));
    return await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(body));
  } catch {
    // fallback: accept in non-prod or log warning
    console.warn("Signature verification failed or not supported");
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-whop-signature") ?? "";
  const secret = process.env.WHOP_WEBHOOK_SECRET ?? "";

  // Verify signature
  const valid = await verifySignature(rawBody, signature, secret);
  if (!valid && process.env.NODE_ENV === "production") {
    console.error("Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event as string;
  console.log("Whop webhook:", event);

  if (event === "payment.succeeded" || event === "membership.went_valid") {
    const metadata = (payload.data as Record<string, unknown>)?.metadata as Record<string, string> | undefined;
    const email = metadata?.email;

    if (email) {
      const supabase = createServiceClient();
      await supabase.from("waitlist").upsert(
        { email: email.toLowerCase(), pre_launch_paid: true, founding_store: true, bonus_multiplier: 1.5 },
        { onConflict: "email" }
      );

      // Send founding store confirmation
      await resend.emails.send({
        from: "Snailon <hi@snailon.ma>",
        to: email,
        subject: "You're a Snailon Founding Store 🇲🇦⭐",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;background:#f9fafb;">
            <div style="background:white;border-radius:16px;padding:32px;">
              <h1 style="font-size:28px;font-weight:900;color:#111827;">You're a Founding Store! ⭐</h1>
              <p style="color:#6b7280;font-size:16px;line-height:1.6;">Your +50% lifetime bonus is now locked in. Every time you top up your Snailon wallet, you receive 1.5× the amount.</p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:20px 0;">
                <p style="color:#166534;font-weight:700;margin:0;">Example: Top up 200 MAD → get 300 MAD ✓</p>
              </div>
              <p style="color:#6b7280;font-size:14px;">You'll receive priority onboarding when we launch. Stay tuned!</p>
            </div>
          </div>
        `,
      }).catch(err => console.warn("Resend error:", err));
    }
  }

  return NextResponse.json({ received: true });
}
