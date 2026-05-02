<?php
/**
 * Plugin Name: Snailon — Order Sync
 * Plugin URI:  https://snailon.com
 * Description: Sends new WooCommerce orders to Snailon for AI-powered WhatsApp confirmation. Built for Moroccan COD merchants.
 * Version:     1.0.0
 * Author:      Snailon
 * Author URI:  https://snailon.com
 * License:     MIT
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REFERENCE / TEMPLATE FILE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * This is the canonical source. The Snailon dashboard generates a copy of
 * this file with the merchant's unique credentials baked into SNAILON_KEY
 * and SNAILON_SECRET — see lib/stores/snippets.ts → woocommercePluginPhp().
 *
 * If you're hand-installing for development, replace the two placeholders
 * below with the values from your store's Connect screen, then drop this
 * file into wp-content/plugins/snailon/ and activate from the Plugins
 * page in WP admin.
 */

if (!defined('ABSPATH')) exit;

define('SNAILON_KEY',    'SNAILON_KEY_PLACEHOLDER');     // your store's snk_xxx public key
define('SNAILON_SECRET', 'SNAILON_SECRET_PLACEHOLDER');  // your store's webhook secret
define('SNAILON_INGEST', 'https://snailon.com/api/webhooks/woocommerce');

/**
 * Hook both common new-order events.
 *
 * `woocommerce_new_order`              — fires whenever any order is created
 *                                        (admin-created, REST-created, etc.)
 * `woocommerce_checkout_order_processed` — fires specifically on shopper
 *                                        checkout completion. We hook both
 *                                        because some themes / payment flows
 *                                        skip one or the other; the ingest
 *                                        endpoint is idempotent so duplicates
 *                                        from both firing are safely deduped
 *                                        on (store_id, external_id).
 */
add_action('woocommerce_new_order',                'snailon_send_new_order', 10, 1);
add_action('woocommerce_checkout_order_processed', 'snailon_send_new_order', 10, 1);

function snailon_send_new_order($order_id) {
  if (!function_exists('wc_get_order')) return;
  $order = wc_get_order($order_id);
  if (!$order) return;

  $items = array();
  foreach ($order->get_items() as $item) {
    $product = $item->get_product();
    $items[] = array(
      'name'     => $item->get_name(),
      'sku'      => $product ? $product->get_sku() : null,
      'quantity' => $item->get_quantity(),
      'price'    => floatval($item->get_total() / max(1, $item->get_quantity()))
    );
  }

  $payload = array(
    'id'       => $order->get_id(),
    'currency' => $order->get_currency(),
    'total'    => $order->get_total(),
    'billing'  => array(
      'first_name' => $order->get_billing_first_name(),
      'last_name'  => $order->get_billing_last_name(),
      'email'      => $order->get_billing_email(),
      'phone'      => $order->get_billing_phone()
    ),
    'shipping' => array(
      'first_name' => $order->get_shipping_first_name(),
      'last_name'  => $order->get_shipping_last_name(),
      'address_1'  => $order->get_shipping_address_1(),
      'address_2'  => $order->get_shipping_address_2(),
      'city'       => $order->get_shipping_city(),
      'state'      => $order->get_shipping_state(),
      'postcode'   => $order->get_shipping_postcode(),
      'country'    => $order->get_shipping_country()
    ),
    'line_items' => $items
  );

  $body = wp_json_encode($payload);

  // base64(HMAC-SHA256(body, secret)) — matches verifyWooHmac() server-side.
  $sig  = base64_encode(hash_hmac('sha256', $body, SNAILON_SECRET, true));

  // Fire-and-forget. `blocking => false` prevents WP from waiting on the
  // HTTP response, so the customer's checkout never sees a delay even if
  // Snailon is briefly slow or unreachable.
  wp_remote_post(SNAILON_INGEST . '/' . SNAILON_KEY, array(
    'body'     => $body,
    'headers'  => array(
      'Content-Type'        => 'application/json',
      'X-Snailon-Signature' => $sig,
      'X-Snailon-Source'    => 'wp-plugin'
    ),
    'timeout'  => 5,
    'blocking' => false
  ));
}

/**
 * Tiny settings page — purely informational. There's nothing to configure
 * because the credentials are baked into the file the dashboard hands out;
 * this page just confirms which store the plugin is connected to.
 */
add_action('admin_menu', function () {
  add_options_page('Snailon', 'Snailon', 'manage_options', 'snailon', function () {
    echo '<div class="wrap">';
    echo '<h1>Snailon — Order Sync</h1>';
    echo '<p>Connected store key: <code>' . esc_html(SNAILON_KEY) . '</code></p>';
    echo '<p>Orders are sent to Snailon automatically when checkout completes. ';
    echo 'Manage your store at <a href="https://snailon.com/dashboard" target="_blank" rel="noopener">snailon.com/dashboard</a>.</p>';
    echo '</div>';
  });
});
