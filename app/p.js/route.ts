import { PIXEL_SOURCE } from "@/lib/snailon-stores/pixel-source";

/**
 * GET /p.js
 *
 * Universal order-detection pixel. Merchants drop this on their thank-you
 * page once and we detect every order from then on:
 *
 *   <script async src="https://snailon.com/p.js"
 *           data-snailon-id="snk_xxxxxxxxxxxxxxxx"></script>
 *
 * The pixel source lives in lib/snailon-stores/pixel-source.ts (single
 * source of truth that's also used by the dashboard's snippet generator
 * — same file, different consumers).
 *
 * Edge runtime is intentional: this script is fetched on every order
 * page-view across every connected merchant store. Edge keeps it close
 * to the customer and avoids a serverless cold start blocking checkout.
 */
export const runtime = "edge";

// Cache aggressively. The pixel itself never changes per-merchant — the
// merchant's snk_ key is read from the script tag's data-snailon-id at
// runtime, so the same byte stream is served to every store. CDN-level
// caching (s-maxage) is what actually matters; the browser cache is short
// to allow rapid iteration without stale clients.
export async function GET() {
  return new Response(PIXEL_SOURCE, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      // CORS open by design — the pixel is meant to be loaded from arbitrary
      // merchant origins. The actual auth boundary is /api/ingest, which
      // checks Origin/Referer against each store's hostname allow-list.
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
