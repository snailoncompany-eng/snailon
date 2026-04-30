import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const apiKey = process.env.WHOP_API_KEY!;
    const planId = process.env.WHOP_PLAN_ID!;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://snailon.com";

    const res = await fetch("https://api.whop.com/api/v5/checkout_sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        redirect_url: `${baseUrl}/thank-you`,
        metadata: { email },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Whop API error:", errBody);
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 502 });
    }

    const data = await res.json();
    const checkoutUrl = data.purchase_url ?? data.url ?? data.checkout_url;

    if (!checkoutUrl) {
      console.error("No checkout URL in response:", JSON.stringify(data));
      return NextResponse.json({ error: "No checkout URL returned" }, { status: 502 });
    }

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
