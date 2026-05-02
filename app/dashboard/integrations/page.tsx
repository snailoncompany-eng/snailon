import { redirect } from "next/navigation";

/**
 * The old "paste your API keys" integrations page is gone.
 *
 * The pixel-first v2 flow at /dashboard/connect replaces it: merchants
 * pick a platform, paste one snippet (or install the WP plugin), and
 * a test order flips connection_status to 'live' within ~30 seconds.
 *
 * This redirect keeps any old bookmarks, deep-links from the WP auth
 * callback, or hardcoded URLs in older email templates working.
 */
export default function Page() {
  redirect("/dashboard/connect");
}
