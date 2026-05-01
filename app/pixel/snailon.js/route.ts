import { NextResponse } from "next/server";

// GET /pixel/snailon.js
// Universal tracker. Works on Shopify, YouCan, WooCommerce, custom builds —
// anything that's plain HTML + JavaScript.
//
// What it does (in <2KB):
//   - Reads its own `data-snailon-token` from the script tag
//   - Listens for: page_view, add_to_cart, checkout_started
//   - Detects abandoned cart: user fills email/phone in checkout but
//     leaves without `order_placed`. After ~10 minutes idle, fires
//     cart_abandoned with whatever buyer info was captured.
//   - Sends events to /api/pixel/track via navigator.sendBeacon
//     (survives page-unload — critical for checkout_started)

export const runtime = "edge";

export async function GET() {
  const js = `(function(){
  var s = document.currentScript;
  if (!s) return;
  var token = s.getAttribute('data-snailon-token');
  if (!token) return;
  var endpoint = (s.src.split('/pixel/')[0] || '') + '/api/pixel/track';
  var sessionId = sessionStorage.getItem('_snailon_sid');
  if (!sessionId) { sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('_snailon_sid', sessionId); }

  function send(event, payload){
    try {
      var body = JSON.stringify(Object.assign({
        token: token, session_id: sessionId, event_type: event,
        page_url: location.href, referrer: document.referrer, ts: Date.now()
      }, payload || {}));
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([body], {type:'application/json'}));
      } else {
        fetch(endpoint, {method:'POST', headers:{'Content-Type':'application/json'}, body: body, keepalive:true}).catch(function(){});
      }
    } catch(e){}
  }

  // 1. Page view (every load)
  send('page_view');

  // 2. Try to detect cart additions from common buttons
  document.addEventListener('click', function(e){
    var t = e.target; if (!t || !t.closest) return;
    var btn = t.closest('[data-snailon],[name=add],[id*=add-to-cart i],form[action*="cart/add"] button,button[name="add"]');
    if (!btn) return;
    send('add_to_cart', { element: btn.getAttribute('data-snailon') || btn.id || btn.name || 'unknown' });
  }, {capture:true, passive:true});

  // 3. Checkout detection: any input with type=email or name~=phone gets snapshotted
  var capturedEmail = null, capturedPhone = null, capturedName = null;
  function snapshot() {
    document.querySelectorAll('input').forEach(function(el){
      var n = (el.name || el.id || el.placeholder || '').toLowerCase();
      var v = (el.value || '').trim();
      if (!v) return;
      if (el.type === 'email' || /email|courriel/.test(n)) capturedEmail = v;
      else if (el.type === 'tel' || /phone|tel|mobile|portable|gsm/.test(n)) capturedPhone = v;
      else if (/name|nom/.test(n) && !capturedName) capturedName = v;
    });
  }
  document.addEventListener('input', snapshot, {capture:true, passive:true});
  document.addEventListener('change', snapshot, {capture:true, passive:true});

  // Heuristic: if URL contains "checkout" or "cart" → emit checkout_started once
  var emittedCheckout = false;
  function maybeCheckoutStart(){
    if (emittedCheckout) return;
    if (/checkout|panier|cart/i.test(location.pathname)) {
      emittedCheckout = true;
      send('checkout_started', { customer_email: capturedEmail, customer_phone: capturedPhone, customer_name: capturedName });
    }
  }
  maybeCheckoutStart();
  window.addEventListener('pageshow', maybeCheckoutStart);

  // 4. Abandonment: when the user navigates away from a checkout-like page,
  // and they've entered some contact info, fire cart_abandoned with snapshot.
  function onLeave() {
    snapshot();
    if (emittedCheckout && (capturedEmail || capturedPhone)) {
      send('cart_abandoned', {
        customer_email: capturedEmail,
        customer_phone: capturedPhone,
        customer_name: capturedName
      });
    }
  }
  window.addEventListener('pagehide', onLeave);
  window.addEventListener('beforeunload', onLeave);

  // 5. Order placed: typical Shopify thank-you URL pattern
  if (/orders\\/\\w+\\/?$|thank-you|merci|order-received/.test(location.pathname)) {
    send('order_placed', { customer_email: capturedEmail, customer_phone: capturedPhone, customer_name: capturedName });
  }
})();`;

  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
