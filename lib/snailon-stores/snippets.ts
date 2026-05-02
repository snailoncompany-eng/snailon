import type { SnailonPlatform } from "@/lib/snailon-ingest/types";

const PIXEL_URL = process.env.NEXT_PUBLIC_PIXEL_URL || 'https://snailon.com/p.js';

/**
 * Generate the exact snippet a merchant pastes for their platform.
 *
 * The pixel itself is identical across all platforms — what differs is the
 * wrapping required by each platform's customization mechanism. Shopify
 * Custom Pixels run in a sandbox without document.head, so we use their
 * `analytics.subscribe` API. Everything else just gets a plain script tag.
 */
export function snippetFor(platform: SnailonPlatform, publicKey: string): string {
  switch (platform) {
    case 'shopify':
      return shopifySnippet(publicKey);
    default:
      return universalSnippet(publicKey);
  }
}

function universalSnippet(publicKey: string): string {
  return [
    `<!-- Snailon — order detection. Do not modify. -->`,
    `<script async src="${PIXEL_URL}" data-snailon-id="${publicKey}"></script>`
  ].join('\n');
}

/**
 * Shopify's Custom Pixel runs in a sandboxed iframe — no document.head, no
 * appendChild on the parent document, no direct DOM access. We have to use
 * their analytics.subscribe API and call our ingest endpoint directly.
 *
 * This subscribes to checkout_completed which fires once per order with full
 * customer + order data when the merchant has set Permissions="Not required".
 */
function shopifySnippet(publicKey: string): string {
  return `// Snailon — Shopify custom pixel. Paste exactly as-is.
analytics.subscribe("checkout_completed", (event) => {
  try {
    var c = event.data.checkout || {};
    var order = c.order || {};
    var customer = (c.email || c.phone) ? c : (c.shippingAddress || {});
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
      public_key: "${publicKey}",
      source: "pixel",
      platform: "shopify",
      page_url: (event.context && event.context.window && event.context.window.location && event.context.window.location.href) || "",
      detected_at: new Date().toISOString(),
      order: {
        external_id: String(order.id || c.token || c.order && c.order.id || ""),
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
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      var blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon("${PIXEL_URL.replace('/p.js', '/api/ingest')}", blob)) return;
    }
    fetch("${PIXEL_URL.replace('/p.js', '/api/ingest')}", {
      method: "POST",
      body: body,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      keepalive: true,
      credentials: "omit",
      mode: "no-cors"
    });
  } catch (e) { /* swallow */ }
});`;
}

/**
 * Generate the WordPress plugin download for a specific store. The plugin is
 * a single PHP file that hooks `woocommerce_thankyou` and POSTs to ingest
 * with the store's webhook_secret as a signed HMAC — much more reliable than
 * the pixel for WooCommerce since it runs server-side.
 *
 * Used by the wizard's "Download plugin" button on the WooCommerce step.
 */
export function woocommercePluginPhp(publicKey: string, webhookSecret: string): string {
  // Simple template fill — keep PHP identical to plugins/wordpress/snailon.php
  // but with the secrets baked in.
  return `<?php
/**
 * Plugin Name: Snailon — Order Sync
 * Description: Sends new WooCommerce orders to Snailon for AI confirmation.
 * Version: 1.0.0
 * Author: Snailon
 * Requires Plugins: woocommerce
 */
if (!defined('ABSPATH')) exit;

define('SNAILON_KEY',    '${publicKey}');
define('SNAILON_SECRET', '${webhookSecret}');
define('SNAILON_INGEST', '${PIXEL_URL.replace('/p.js', '/api/webhooks/snailon/woocommerce')}');

add_action('woocommerce_new_order', 'snailon_send_new_order', 10, 1);
add_action('woocommerce_checkout_order_processed', 'snailon_send_new_order', 10, 1);

function snailon_send_new_order($order_id) {
  $order = wc_get_order($order_id);
  if (!$order) return;

  $items = array();
  foreach ($order->get_items() as $item) {
    $product = $item->get_product();
    $items[] = array(
      'name' => $item->get_name(),
      'sku' => $product ? $product->get_sku() : null,
      'quantity' => $item->get_quantity(),
      'price' => floatval($item->get_total() / max(1, $item->get_quantity()))
    );
  }

  $payload = array(
    'id' => $order->get_id(),
    'currency' => $order->get_currency(),
    'total' => $order->get_total(),
    'billing' => array(
      'first_name' => $order->get_billing_first_name(),
      'last_name' => $order->get_billing_last_name(),
      'email' => $order->get_billing_email(),
      'phone' => $order->get_billing_phone()
    ),
    'shipping' => array(
      'first_name' => $order->get_shipping_first_name(),
      'last_name' => $order->get_shipping_last_name(),
      'address_1' => $order->get_shipping_address_1(),
      'address_2' => $order->get_shipping_address_2(),
      'city' => $order->get_shipping_city(),
      'state' => $order->get_shipping_state(),
      'postcode' => $order->get_shipping_postcode(),
      'country' => $order->get_shipping_country()
    ),
    'line_items' => $items
  );

  $body = wp_json_encode($payload);
  $sig = base64_encode(hash_hmac('sha256', $body, SNAILON_SECRET, true));

  wp_remote_post(SNAILON_INGEST . '/' . SNAILON_KEY, array(
    'body' => $body,
    'headers' => array(
      'Content-Type' => 'application/json',
      'X-Snailon-Signature' => $sig,
      'X-Snailon-Source' => 'wp-plugin'
    ),
    'timeout' => 5,
    'blocking' => false  // fire-and-forget so checkout isn't slowed down
  ));
}

add_action('admin_menu', function () {
  add_options_page('Snailon', 'Snailon', 'manage_options', 'snailon', function () {
    echo '<div class="wrap"><h1>Snailon</h1>';
    echo '<p>Connected. Store key: <code>' . esc_html(SNAILON_KEY) . '</code></p>';
    echo '<p>Orders are sent to Snailon automatically when checkout completes.</p>';
    echo '</div>';
  });
});
`;
}
