import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, store_name, monthly_orders, avg_order_value } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error: dbError } = await supabase.from("waitlist").upsert(
      { email: email.toLowerCase(), store_name, monthly_orders, avg_order_value },
      { onConflict: "email", ignoreDuplicates: false }
    );

    if (dbError && !dbError.message.includes("duplicate")) {
      console.error("Supabase error:", dbError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Send welcome email
    await resend.emails.send({
      from: "Snailon <hi@snailon.ma>",
      to: email,
      subject: "You're on the Snailon waitlist 🇲🇦",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
          <div style="background:#059669;width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
            <span style="color:white;font-size:24px;">🐌</span>
          </div>
          <h1 style="font-size:28px;font-weight:900;color:#111827;margin-bottom:8px;">You're on the list!</h1>
          <p style="color:#6b7280;font-size:16px;line-height:1.6;margin-bottom:24px;">
            Thanks for joining the Snailon waitlist${store_name ? `, <strong>${store_name}</strong>` : ""}. We're onboarding Moroccan stores in waves and you'll be among the first to get access.
          </p>
          <p style="color:#6b7280;font-size:14px;line-height:1.6;margin-bottom:32px;">
            In the meantime, check out our early-access Founding Store offer: get <strong>+50% bonus forever</strong> on every wallet top-up for just 200 MAD.
          </p>
          <a href="https://snailon.com/#offer" style="background:#059669;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;display:inline-block;margin-bottom:32px;">
            View the Founding Store offer →
          </a>
          <p style="color:#9ca3af;font-size:12px;">Snailon · Built in Morocco 🇲🇦 · <a href="https://snailon.com" style="color:#9ca3af;">snailon.com</a></p>
        </div>
      `,
    }).catch(err => console.warn("Resend error (non-fatal):", err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
