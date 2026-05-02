/**
 * Universal Snailon order-detection pixel.
 *
 * Source of truth lives at /home/claude/snailon-integration/public/p.js
 * during development and is embedded as a string here so the Next route
 * at app/p.js/route.ts can serve it without filesystem access at runtime.
 *
 * Build pipeline note: ~14KB unminified. With terser -c -m the gzip-on-wire
 * size is around 5 KB, well within budget for an async script tag.
 */
export const PIXEL_SOURCE = `/*!
 * Snailon Pixel — universal order detection.
 * Drop one tag on the thank-you page. We figure out the rest.
 *
 *   <script async src="https://snailon.com/p.js"
 *           data-snailon-id="snk_xxxxxxxxxxxxxxxxxx"></script>
 *
 * Strategy (first that yields a usable order wins):
 *   1. Schema.org JSON-LD with @type Order
 *   2. window.dataLayer purchase event
 *   3. Platform-specific DOM scrape (woo / shopify / youcan / generic)
 *   4. URL params (?order_id=…) — last resort
 *
 * Sends with navigator.sendBeacon (no CORS preflight, survives tab close).
 * Falls back to fetch with text/plain content-type for ancient browsers.
 *
 * Size target: <5 KB minified. Build: terser p.js -c -m
 */
(function () {
  'use strict';

  // ---- Config -------------------------------------------------------------
  var ENDPOINT = 'https://snailon.com/api/ingest';
  var SCRIPT_TAG = document.currentScript ||
    (function () {
      var s = document.querySelectorAll('script[data-snailon-id]');
      return s.length ? s[s.length - 1] : null;
    })();

  if (!SCRIPT_TAG) return;
  var STORE_KEY = SCRIPT_TAG.getAttribute('data-snailon-id');
  if (!STORE_KEY || STORE_KEY.indexOf('snk_') !== 0) return;

  // Deliberate dedup: we only want to fire once per page load.
  if (window.__snailon_fired) return;
  window.__snailon_fired = true;

  // ---- Utilities ----------------------------------------------------------
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }
  function txt(el) {
    return el && el.textContent ? el.textContent.trim() : '';
  }
  function digits(s) {
    return (s || '').replace(/[^\\d+]/g, '');
  }
  // Best-effort phone extraction. Moroccan format priority, then international.
  function findPhone(s) {
    if (!s) return '';
    var m = s.match(/(?:\\+212|0)\\s*[5-7](?:[\\s.-]?\\d){8}/);
    if (m) return digits(m[0]);
    m = s.match(/\\+?\\d[\\d\\s().-]{7,}\\d/);
    return m ? digits(m[0]) : '';
  }

  // ---- Source 1: JSON-LD --------------------------------------------------
  function fromJsonLd() {
    var nodes = $$('script[type="application/ld+json"]');
    for (var i = 0; i < nodes.length; i++) {
      try {
        var data = JSON.parse(nodes[i].textContent);
        var arr = Array.isArray(data) ? data : [data];
        for (var j = 0; j < arr.length; j++) {
          var d = arr[j];
          var t = d['@type'];
          if (t === 'Order' || (Array.isArray(t) && t.indexOf('Order') !== -1)) {
            return {
              external_id: String(d.orderNumber || d.confirmationNumber || d.identifier || ''),
              total_amount: parseFloat(
                (d.priceSpecification && d.priceSpecification.price) || d.price || d.totalPaymentDue || 0
              ) || null,
              currency: (d.priceSpecification && d.priceSpecification.priceCurrency) || d.priceCurrency || 'MAD',
              customer_name:
                (d.customer && (d.customer.name || (d.customer.givenName + ' ' + (d.customer.familyName || '')).trim())) ||
                '',
              customer_email: (d.customer && d.customer.email) || '',
              customer_phone: (d.customer && d.customer.telephone) || '',
              shipping_address: addressFromSchema(d.orderDelivery && d.orderDelivery.deliveryAddress),
              items: (d.orderedItem || []).map(function (it) {
                var p = it.orderedItem || it;
                return {
                  name: p.name || '',
                  sku: p.sku || p.productID || '',
                  quantity: parseInt(it.orderQuantity || 1, 10),
                  price: parseFloat((p.offers && p.offers.price) || p.price || 0) || null
                };
              })
            };
          }
        }
      } catch (e) { /* skip malformed JSON */ }
    }
    return null;
  }

  function addressFromSchema(a) {
    if (!a) return null;
    return {
      line1: a.streetAddress || '',
      city: a.addressLocality || '',
      region: a.addressRegion || '',
      postal_code: a.postalCode || '',
      country: a.addressCountry || ''
    };
  }

  // ---- Source 2: dataLayer purchase event ---------------------------------
  function fromDataLayer() {
    var dl = window.dataLayer;
    if (!dl || !dl.length) return null;
    for (var i = dl.length - 1; i >= 0; i--) {
      var e = dl[i] || {};
      var ev = e.event || '';
      var ec = e.ecommerce || {};
      var purchase = ec.purchase || (ev === 'purchase' ? ec : null);
      if (purchase) {
        var t = purchase.actionField || purchase;
        return {
          external_id: String(t.id || t.transaction_id || ''),
          total_amount: parseFloat(t.revenue || t.value || 0) || null,
          currency: t.currency || ec.currencyCode || 'MAD',
          items: (purchase.products || ec.items || []).map(function (p) {
            return {
              name: p.name || p.item_name || '',
              sku: p.sku || p.id || p.item_id || '',
              quantity: parseInt(p.quantity || 1, 10),
              price: parseFloat(p.price || 0) || null
            };
          })
        };
      }
    }
    return null;
  }

  // ---- Source 3: platform-specific DOM scraping ---------------------------
  // Each adapter returns a partial Order or null. We pick best by completeness.
  var ADAPTERS = {
    woocommerce: function () {
      var root = document.querySelector('.woocommerce-order, .wc-block-order-confirmation, .woocommerce-thankyou-order-received');
      if (!root) return null;
      var page = txt(document.body);
      var orderNumEl = document.querySelector('.woocommerce-order-overview__order, [class*="order-number"] strong, .order-number');
      var emailEl = document.querySelector('.woocommerce-order-overview__email, [class*="order-email"]');
      var totalEl = document.querySelector('.woocommerce-Price-amount.amount, .order-total .amount, .wc-block-components-totals-footer-item .wc-block-formatted-money-amount');
      var customerEl = document.querySelector('.woocommerce-customer-details address, .wc-block-order-confirmation-billing-address__address');
      var addressText = txt(customerEl);
      return {
        external_id: digitsOnly(txt(orderNumEl)),
        customer_email: txt(emailEl),
        customer_phone: findPhone(addressText) || findPhone(page),
        customer_name: firstLine(addressText),
        shipping_address: { line1: addressText },
        total_amount: parseFloat(txt(totalEl).replace(/[^\\d.]/g, '')) || null,
        currency: detectCurrency(txt(totalEl)),
        items: $$('.woocommerce-table--order-details tr.order_item, .wc-block-order-confirmation-summary li').map(function (row) {
          return {
            name: txt(row.querySelector('.wc-item-meta-label, .product-name, .wc-block-components-product-name')),
            quantity: parseInt(txt(row.querySelector('.product-quantity, .wc-block-components-product-badge')).replace(/\\D/g, '') || 1, 10),
            price: parseFloat(txt(row.querySelector('.product-total, .wc-block-components-product-price')).replace(/[^\\d.]/g, '')) || null
          };
        }).filter(function (i) { return i.name; })
      };
    },

    shopify: function () {
      // Note: Shopify thank-you page DOM is now sandboxed; this adapter is for
      // legacy stores or non-Plus stores still on classic order status. For
      // Plus / extensibility, use plugins/shopify/custom-pixel.js (which sends
      // structured data, not DOM scraping).
      if (!window.Shopify && !document.querySelector('.os-step, [data-checkout-id]')) return null;
      var page = txt(document.body);
      var orderNumMatch = page.match(/(?:Order\\s+|#)([A-Z0-9-]+)/i);
      return {
        external_id: window.Shopify && window.Shopify.checkout && window.Shopify.checkout.order_id
          ? String(window.Shopify.checkout.order_id)
          : (orderNumMatch ? orderNumMatch[1] : ''),
        customer_phone: findPhone(page),
        total_amount: window.Shopify && window.Shopify.checkout && window.Shopify.checkout.total_price
          ? parseFloat(window.Shopify.checkout.total_price) / 100
          : null,
        currency: (window.Shopify && window.Shopify.checkout && window.Shopify.checkout.presentment_currency) || 'MAD'
      };
    },

    youcan: function () {
      var isYC = /youcan/i.test(document.documentElement.outerHTML.slice(0, 5000)) ||
                 location.hostname.indexOf('youcan.shop') !== -1 ||
                 document.querySelector('[class*="yc-"], [data-yc]');
      if (!isYC) return null;
      var page = txt(document.body);
      var idMatch = page.match(/(?:commande|order|طلب)[^\\d]{0,10}([A-Z0-9-]{3,})/i);
      var totalMatch = page.match(/(\\d[\\d.,\\s]*)\\s*(MAD|DH|درهم)/i);
      return {
        external_id: idMatch ? idMatch[1] : '',
        customer_phone: findPhone(page),
        total_amount: totalMatch ? parseFloat(totalMatch[1].replace(/[^\\d.]/g, '')) : null,
        currency: 'MAD'
      };
    },

    generic: function () {
      var page = txt(document.body);
      return {
        external_id: extractOrderId(page),
        customer_phone: findPhone(page),
        total_amount: null,
        currency: 'MAD'
      };
    }
  };

  function digitsOnly(s) { return (s || '').replace(/\\D/g, ''); }
  function firstLine(s) { return (s || '').split(/[\\n,]/)[0].trim(); }
  function detectCurrency(s) {
    if (!s) return 'MAD';
    if (/MAD|DH|درهم/i.test(s)) return 'MAD';
    if (/EUR|€/.test(s)) return 'EUR';
    if (/USD|\\$/.test(s)) return 'USD';
    return 'MAD';
  }
  function extractOrderId(page) {
    var p = (page || '').slice(0, 4000);
    var pats = [
      /(?:order|commande|طلب)\\s*[#№:n°]*\\s*([A-Z0-9-]{4,})/i,
      /confirmation\\s*[#№:]*\\s*([A-Z0-9-]{4,})/i,
      /reference\\s*[#№:]*\\s*([A-Z0-9-]{4,})/i
    ];
    for (var i = 0; i < pats.length; i++) {
      var m = p.match(pats[i]);
      if (m) return m[1];
    }
    var url = new URL(location.href);
    return url.searchParams.get('order_id') || url.searchParams.get('order') || '';
  }

  // ---- Score & merge ------------------------------------------------------
  function score(order) {
    if (!order) return 0;
    var s = 0;
    if (order.external_id) s += 5;
    if (order.customer_phone) s += 4;
    if (order.customer_name) s += 1;
    if (order.customer_email) s += 1;
    if (order.total_amount) s += 1;
    if (order.items && order.items.length) s += 2;
    return s;
  }

  function merge(a, b) {
    if (!a) return b;
    if (!b) return a;
    var out = {};
    var keys = ['external_id', 'customer_name', 'customer_phone', 'customer_email',
                'total_amount', 'currency', 'shipping_address', 'items'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      out[k] = (a[k] && (Array.isArray(a[k]) ? a[k].length : true)) ? a[k] : b[k];
    }
    return out;
  }

  function detectPlatform() {
    var h = location.hostname;
    if (window.Shopify || /myshopify\\.com/.test(h)) return 'shopify';
    if (document.querySelector('.woocommerce-order, .wc-block-order-confirmation, body.woocommerce-order-received')) return 'woocommerce';
    if (/youcan/i.test(document.documentElement.outerHTML.slice(0, 2000)) || h.indexOf('youcan.shop') !== -1) return 'youcan';
    return 'custom';
  }

  // ---- Main ---------------------------------------------------------------
  function run() {
    var platform = detectPlatform();
    var candidates = [
      fromJsonLd(),
      fromDataLayer(),
      ADAPTERS[platform] ? ADAPTERS[platform]() : null,
      ADAPTERS.generic()
    ];

    var best = null;
    for (var i = 0; i < candidates.length; i++) {
      best = score(candidates[i]) > score(best) ? merge(candidates[i], best) : merge(best, candidates[i]);
    }

    // Refuse to send garbage. Without an external_id we have nothing to dedupe on.
    if (!best || !best.external_id) {
      return;
    }

    var payload = {
      v: 1,
      public_key: STORE_KEY,
      source: 'pixel',
      platform: platform,
      page_url: location.href,
      page_title: (document.title || '').slice(0, 200),
      detected_at: new Date().toISOString(),
      order: {
        external_id: String(best.external_id).slice(0, 128),
        customer_name: (best.customer_name || '').slice(0, 200),
        customer_phone: best.customer_phone || '',
        customer_email: (best.customer_email || '').slice(0, 200),
        total_amount: best.total_amount || null,
        currency: best.currency || 'MAD',
        shipping_address: best.shipping_address || null,
        items: (best.items || []).slice(0, 50)
      },
      needs_phone: !best.customer_phone
    };

    send(payload);
  }

  function send(payload) {
    var body = JSON.stringify(payload);
    // sendBeacon: no CORS preflight, survives navigation/tab close. Best path.
    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
        if (navigator.sendBeacon(ENDPOINT, blob)) return;
      } catch (e) { /* fall through */ }
    }
    // Fallback for browsers without sendBeacon. text/plain avoids preflight.
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        body: body,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        keepalive: true,
        credentials: 'omit',
        mode: 'no-cors'
      });
    } catch (e) { /* swallow — this is a fire-and-forget pixel */ }
  }

  // Wait for DOM if needed; many themes inject order details after DOMContentLoaded.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // small delay lets dataLayer.push events from theme JS land first
      setTimeout(run, 250);
    });
  } else {
    setTimeout(run, 250);
  }
})();
`;
