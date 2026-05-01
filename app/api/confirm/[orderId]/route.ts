import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideFromConversation, type ConfirmationDecision } from "@/lib/confirm";
import { PRICING } from "@/lib/pricing";
import { sendOrderConfirmedEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/confirm/:orderId
// Body: { customer_message: string }
//
// Simulates a customer replying via WhatsApp. We:
//   1. Persist the inbound message
//   2. Run DeepSeek over the full conversation
//   3. Persist the AI reply
//   4. If intent === "confirm": flip order to confirmed, debit merchant wallet, email merchant
//   5. If intent === "reject": flip order to unconfirmed
//   6. Return the AI reply + new order status
//
// When WhatsApp is wired up, the WhatsApp webhook will call this same logic
// instead of the simulator.
export async function POST(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  const orderId = params.orderId;
  const admin = createAdminClient();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const customerMessage = String(body.customer_message ?? "").trim();
  if (!customerMessage) {
    return NextResponse.json({ error: "customer_message required" }, { status: 400 });
  }

  const { data: order, error: oerr } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (oerr || !order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  // Already finalized — refuse further turns.
  if (["confirmed", "cancelled", "failed"].includes(order.status)) {
    return NextResponse.json(
      { error: `order already ${order.status}` },
      { status: 409 }
    );
  }

  // Get the merchant (for wallet operations + email)
  const { data: merchant } = await admin
    .from("merchants")
    .select("*")
    .eq("id", order.merchant_id)
    .maybeSingle();

  // Persist inbound message
  await admin.from("confirmation_messages").insert({
    order_id: order.id,
    direction: "inbound",
    channel: "whatsapp",
    content: customerMessage,
  });

  // Pull conversation history (oldest → newest)
  const { data: history } = await admin
    .from("confirmation_messages")
    .select("direction, content")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  // Decide via DeepSeek
  let decision: ConfirmationDecision;
  try {
    decision = await decideFromConversation(
      {
        customerName: order.customer_name,
        productName: order.product_name,
        productPriceMad: Number(order.product_price_mad),
        quantity: order.quantity,
        address: order.customer_address,
        city: order.customer_city,
      },
      (history ?? []) as any
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: `deepseek failed: ${e.message ?? e}` },
      { status: 502 }
    );
  }

  // Persist the AI reply
  await admin.from("confirmation_messages").insert({
    order_id: order.id,
    direction: "outbound",
    channel: "whatsapp",
    content: decision.reply,
    ai_meta: decision,
  });

  // Apply state changes
  let newStatus = order.status;
  let walletError: string | null = null;

  if (decision.intent === "confirm") {
    // Address correction (optional)
    const updates: any = {
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      ai_summary: "Confirmed by customer.",
      attempts: (order.attempts ?? 0) + 1,
      last_message_at: new Date().toISOString(),
    };
    if ((decision as any).address_correction) {
      updates.customer_address = (decision as any).address_correction;
      updates.ai_summary = `Confirmed; address corrected to: ${(decision as any).address_correction}`;
    }
    await admin.from("orders").update(updates).eq("id", order.id);
    newStatus = "confirmed";

    // Debit merchant wallet (best-effort — if insufficient balance, we still
    // confirm the order but mark a wallet error so it shows in the merchant UI).
    try {
      const { error: debitErr } = await admin.rpc("debit_wallet", {
        p_merchant_id: order.merchant_id,
        p_amount_mad: PRICING.pricePerConfirmedOrderMad,
        p_type: "confirmation_charge",
        p_reference: order.id,
        p_metadata: null,
      });
      if (debitErr) walletError = debitErr.message;
    } catch (e: any) {
      walletError = e.message ?? "debit failed";
    }

    // Notify merchant by email (best-effort)
    if (merchant?.email) {
      sendOrderConfirmedEmail(merchant.email, {
        customerName: order.customer_name,
        productName: order.product_name,
        total: Number(order.product_price_mad) * order.quantity,
        address: (decision as any).address_correction ?? order.customer_address,
      }).catch((e) => console.warn("email failed:", e));
    }
  } else if (decision.intent === "reject") {
    await admin
      .from("orders")
      .update({
        status: "unconfirmed",
        ai_summary: `Rejected: ${(decision as any).reason ?? "no reason given"}`,
        attempts: (order.attempts ?? 0) + 1,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    newStatus = "unconfirmed";
  } else {
    // ask / reschedule / noise → keep confirming
    await admin
      .from("orders")
      .update({
        status: "confirming",
        attempts: (order.attempts ?? 0) + 1,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    newStatus = "confirming";
  }

  return NextResponse.json({
    ok: true,
    order_id: order.id,
    status: newStatus,
    decision,
    wallet_error: walletError,
  });
}

// GET /api/confirm/:orderId — fetch the conversation so far (debug/dev tool)
export async function GET(
  _req: Request,
  { params }: { params: { orderId: string } }
) {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("id", params.orderId)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { data: messages } = await admin
    .from("confirmation_messages")
    .select("*")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });
  return NextResponse.json({ order, messages });
}
