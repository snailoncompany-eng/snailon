// ─────────────────────────────────────────────────────────────────────────
// Snailon — Shopify Custom Pixel (REFERENCE)
// ─────────────────────────────────────────────────────────────────────────
//
// This is the canonical source. The Snailon dashboard generates a copy of
// this snippet with the merchant's snk_xxx public key substituted in —
// see lib/stores/snippets.ts → shopifySnippet().
//
// Where this goes:
//   Shopify admin → Settings → Customer events → Add custom pixel
//
// Critical settings on the pixel:
//   Permissions: "Not required"
//     Why: with "Customer privacy required", the pixel only fires for users
//     who consented to marketing cookies. For Moroccan COD merchants without
//     a consent banner, that's effectively zero — no orders would arrive.
//     "Not required" treats this as essential business logic (order
//     confirmation), which doesn't need consent to operate.
//
// Why a Custom Pixel and not an Additional Script?
//   Shopify is sunsetting Additional Scripts in August 2026. Custom Pixels
//   are the supported path going forward, and they run in a sandboxed
//   iframe — meaning we can't touch document.head or load external scripts.
//   So we POST directly to /api/ingest from inside the sandbox using
//   sendBeacon (with a fetch fallback).
//
// Replace SNAILON_KEY_PLACEHOLDER with the snk_xxx key shown on your
// Snailon Connect screen, then paste the entire snippet into the Code field.

analytics.subscribe("checkout_completed", (event) => {
  try {
    var c = event.data.checkout || {};
    var order = c.order || {};
    var addr = c.shippingAddress || c.billingAddress || {};

    var lines = (c.lineItems || []).map(function (li) {
      return {
        name: (li.title || ""),
        sku: (li.variant && li.variant.sku) || null,
        quantity: li.quantity || 1,
        price: (li.variant && li.variant.price && li.variant.price.amount) || null
      };
    });

    var payload = {
      v: 1,
      public_key: "SNAILON_KEY_PLACEHOLDER",
      source: "pixel",
      platform: "shopify",
      page_url: (event.context && event.context.window && event.context.window.location && event.context.window.location.href) || "",
      detected_at: new Date().toISOString(),
      order: {
        external_id: String(order.id || c.token || ""),
        customer_name: [addr.firstName, addr.lastName].filter(Boolean).join(" ") || null,
        customer_phone: c.phone || addr.phone || null,
        customer_email: c.email || null,
        total_amount: c.totalPrice ? Number(c.totalPrice.amount) : null,
        currency: (c.totalPrice && c.totalPrice.currencyCode) || "MAD",
        shipping_address: {
          line1: addr.address1 || "",
          line2: addr.address2 || "",
          city: addr.city || "",
          region: addr.provinceCode || "",
          postal_code: addr.zip || "",
          country: addr.countryCode || ""
        },
        items: lines
      },
      needs_phone: !(c.phone || addr.phone)
    };

    var body = JSON.stringify(payload);
    var endpoint = "https://snailon.com/api/ingest";

    // Prefer sendBeacon — it's queued by the browser and survives the page
    // unload that immediately follows checkout_completed (Shopify often
    // redirects to a thank-you page right after this event fires).
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      var blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon(endpoint, blob)) return;
    }

    // Fallback: fetch with keepalive so it also survives unload.
    fetch(endpoint, {
      method: "POST",
      body: body,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      keepalive: true,
      credentials: "omit",
      mode: "no-cors"
    });
  } catch (e) {
    // Swallow. We'd rather lose one order detection than throw inside the
    // pixel sandbox and have Shopify disable our pixel for the merchant.
  }
});
