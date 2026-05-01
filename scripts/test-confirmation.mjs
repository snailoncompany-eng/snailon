#!/usr/bin/env node
/**
 * End-to-end smoke test for Snailon MVP.
 *
 * Usage:
 *   1. Start the dev server: npm run dev
 *   2. Sign up via /signup
 *   3. Get your merchant_id from the dashboard
 *   4. node scripts/test-confirmation.mjs <BASE_URL> <MERCHANT_ID>
 *
 * Example:
 *   node scripts/test-confirmation.mjs http://localhost:3000 abc-123-merchant-uuid
 */

const [, , BASE = "http://localhost:3000", MERCHANT_ID] = process.argv;

if (!MERCHANT_ID) {
  console.error("Usage: node test-confirmation.mjs <BASE_URL> <MERCHANT_ID>");
  process.exit(1);
}

async function step(label, fn) {
  console.log(`\n→ ${label}`);
  const r = await fn();
  console.log(JSON.stringify(r, null, 2));
  return r;
}

(async () => {
  // 1. Create an order
  const created = await step("Create order", async () => {
    const r = await fetch(`${BASE}/api/orders/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MERCHANT_ID}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_name: "Khalid",
        customer_phone: "+212600000000",
        customer_address: "Rue Tarik, Maarif",
        customer_city: "Casablanca",
        product_name: "Montre digitale",
        product_price_mad: 199,
        quantity: 1,
      }),
    });
    return r.json();
  });

  if (!created.order_id) {
    console.error("Order creation failed.");
    process.exit(1);
  }
  const orderId = created.order_id;

  // 2. Simulate a confirmation reply
  const confirmed = await step("Simulate 'wakhha'", async () => {
    const r = await fetch(`${BASE}/api/confirm/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_message: "wakhha sayb" }),
    });
    return r.json();
  });

  // 3. Fetch full conversation
  await step("Fetch conversation", async () => {
    const r = await fetch(`${BASE}/api/confirm/${orderId}`);
    return r.json();
  });

  console.log("\nDone.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
