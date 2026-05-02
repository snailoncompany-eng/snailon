import type { SnailonPlatform } from "@/lib/snailon-ingest/types";

export interface InstallStep {
  /** One short imperative sentence. */
  text: string;
  /** Optional secondary line below the step. */
  hint?: string;
  /** Optional deep-link to open the merchant's admin in a new tab. */
  link?: { label: string; pattern: string };
}

export interface PlatformInfo {
  id: SnailonPlatform;
  name: string;
  description: string;
  /** Short tagline shown on the picker card. */
  tagline: string;
  /** Where to paste the snippet. */
  insertionLocation: string;
  /** Steps shown in the wizard. {{DOMAIN}} is substituted with the merchant's domain. */
  steps: InstallStep[];
  /** Two-three "if it didn't work" hints — surfaced as a tooltip / accordion. */
  troubleshooting: string[];
  /** Hex color used as the accent border on the picker card. */
  accent: string;
}

const PLATFORMS: Record<SnailonPlatform, PlatformInfo> = {
  woocommerce: {
    id: 'woocommerce',
    name: 'WooCommerce',
    tagline: 'WordPress + WooCommerce',
    description: 'Most popular in Morocco. The Snailon plugin handles everything.',
    insertionLocation: 'Plugins screen in your WordPress admin.',
    steps: [
      {
        text: 'Open Plugins → Add New in your WordPress admin.',
        link: { label: 'Open WP Plugins', pattern: 'https://{{DOMAIN}}/wp-admin/plugin-install.php' }
      },
      {
        text: 'Click "Upload Plugin" and select snailon.zip (download below).',
        hint: 'It\'s a small file (~4 KB). Activate it after upload.'
      },
      {
        text: 'In Settings → Snailon, paste your store key. Save.',
        hint: 'Already prefilled in the snippet on this screen.'
      },
      { text: 'Place a test order. We\'ll detect it within seconds.' }
    ],
    troubleshooting: [
      'If you see "Plugin upload disabled," your host blocks zip uploads — use the manual snippet method instead (paste the script in your active theme\'s functions.php).',
      'Make sure your thank-you page is the default WooCommerce "Order received" — heavily-customized templates may strip our script.',
      'If orders aren\'t arriving, check that ad-blockers aren\'t enabled on your test browser; some block third-party beacons.'
    ],
    accent: '#7F54B3'
  },

  shopify: {
    id: 'shopify',
    name: 'Shopify',
    tagline: 'Shopify (any plan)',
    description: 'Uses Shopify\'s sandboxed Custom Pixel — Shopify\'s own recommended path.',
    insertionLocation: 'Settings → Customer events → Custom pixels.',
    steps: [
      {
        text: 'Open Settings → Customer events in your Shopify admin.',
        link: { label: 'Open Customer events', pattern: 'https://{{DOMAIN}}/admin/settings/customer_events' }
      },
      { text: 'Click "Add custom pixel," name it "Snailon," and click Add pixel.' },
      { text: 'Paste the snippet shown below into the Code area.' },
      { text: 'Set "Permissions" to "Not required," then click Save and Connect.' },
      { text: 'Place a test order. We\'ll detect it within seconds.' }
    ],
    troubleshooting: [
      'If the pixel doesn\'t fire, check that the pixel is "Connected" (not "Disconnected") in Customer events. Newly-saved pixels start disconnected.',
      'Permissions must be "Not required" — if set to "Customer privacy required," the pixel only fires after consent, which most COD shoppers don\'t give.',
      'For Shopify Plus stores using checkout extensibility, no extra setup needed — the same custom pixel works.'
    ],
    accent: '#95BF47'
  },

  youcan: {
    id: 'youcan',
    name: 'YouCan',
    tagline: 'YouCan (Moroccan)',
    description: 'Paste once into your store\'s Custom Code panel.',
    insertionLocation: 'Settings → Tracking & analytics → Custom code.',
    steps: [
      {
        text: 'In your YouCan admin, open Settings → Tracking & analytics.',
        link: { label: 'Open YouCan settings', pattern: 'https://seller-area.youcan.shop/admin/settings/tracking' }
      },
      { text: 'Find "Custom code" → "Order page" (or "Thank you page").' },
      { text: 'Paste the snippet shown below. Click Save.' },
      { text: 'Place a test order. We\'ll detect it within seconds.' }
    ],
    troubleshooting: [
      'Make sure you\'re pasting in the "Order page" / "Thank you page" section — code in the "Header" section runs on every page, but our snippet is designed for the order-confirmation page.',
      'If your YouCan plan doesn\'t show a "Custom code" panel, contact YouCan support to enable Tracking; the feature is free.',
      'YouCan caches templates aggressively. If detection doesn\'t work after a real order, wait 5 minutes and place another test order.'
    ],
    accent: '#1E40AF'
  },

  storeino: {
    id: 'storeino',
    name: 'Storeino',
    tagline: 'Storeino',
    description: 'Paste in your store\'s tracking code panel.',
    insertionLocation: 'Settings → Custom scripts.',
    steps: [
      { text: 'Open Settings → Custom scripts in your Storeino admin.' },
      { text: 'Add a new script in the "Order confirmation" / "Thank you page" slot.' },
      { text: 'Paste the snippet shown below. Save.' },
      { text: 'Place a test order. We\'ll detect it within seconds.' }
    ],
    troubleshooting: [
      'If the script field doesn\'t appear, your Storeino plan may need an upgrade — check with their support.',
      'Make sure the script is enabled (the toggle next to the entry is green).'
    ],
    accent: '#10B981'
  },

  shopyan: {
    id: 'shopyan',
    name: 'Shopyan',
    tagline: 'Shopyan',
    description: 'Paste in the thank-you page tracking section.',
    insertionLocation: 'Theme settings → Order page → Custom code.',
    steps: [
      { text: 'Open Theme settings → Order page in your Shopyan admin.' },
      { text: 'Find "Custom code" / "Tracking pixels."' },
      { text: 'Paste the snippet shown below. Save.' },
      { text: 'Place a test order. We\'ll detect it within seconds.' }
    ],
    troubleshooting: [
      'Some Shopyan themes only allow custom code on the global header. The snippet still works there — it auto-detects whether it\'s on the thank-you page.',
      'If you don\'t see the field, your theme version may not support custom code; switch themes or contact Shopyan support.'
    ],
    accent: '#EA580C'
  },

  custom: {
    id: 'custom',
    name: 'Custom site',
    tagline: 'Anything else (custom HTML, headless, etc.)',
    description: 'Paste the snippet in your order-confirmation page\'s HTML.',
    insertionLocation: 'Your order-confirmation page, before </body>.',
    steps: [
      { text: 'Open your order-confirmation page template.' },
      { text: 'Paste the snippet just before the closing </body> tag.' },
      { text: 'Make sure your page exposes the order ID — either in the URL (?order_id=…), in a JSON-LD block, or in visible text.' },
      { text: 'Place a test order. We\'ll detect it within seconds.' }
    ],
    troubleshooting: [
      'For best results, embed a JSON-LD <script type="application/ld+json"> block with @type Order on your thank-you page. The pixel reads it directly.',
      'If you don\'t want to add JSON-LD, make sure the order ID appears in the page text (e.g., "Order #12345") or URL — the pixel can scrape from either.',
      'Headless / SPA stores: trigger the pixel after the order page renders by re-injecting the script tag, or call the ingest API directly server-side.'
    ],
    accent: '#475569'
  }
};

export function getPlatform(id: string): PlatformInfo | null {
  return (PLATFORMS as Record<string, PlatformInfo>)[id] || null;
}

export function listPlatforms(): PlatformInfo[] {
  // Order matters — present in market-share order so most merchants find theirs first.
  return [
    PLATFORMS.woocommerce,
    PLATFORMS.shopify,
    PLATFORMS.youcan,
    PLATFORMS.shopyan,
    PLATFORMS.storeino,
    PLATFORMS.custom
  ];
}
