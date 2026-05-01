// ForceLog adapter — soon status.
//
// ForceLog (Casablanca, founded 2021 by Anas Bouziane) does not publish
// a public API. To go live we need either:
//   (a) Direct API access from their team (preferred — partner agreement)
//   (b) A Playwright session that automates their merchant workspace
//
// This file defines the contract every carrier integration will implement.
// When ForceLog gives us API endpoints, replace the body of `schedulePickup`
// and `testConnection`. The rest of Snailon (order pipeline, dashboard,
// merchant connect flow) doesn't need to change.

import type {
  CarrierAdapter,
  CarrierCredentials,
  ConnectionTest,
  PickupRequest,
  PickupResult,
  CarrierDescriptor,
} from "../types";

const descriptor: CarrierDescriptor = {
  id: "forcelog",
  label: "ForceLog",
  tagline: "Casablanca · 240 destinations · 24h delivery to major cities · 18 MAD/order.",
  monogram: "F",
  fields: [
    {
      key: "client_id",
      label: "ForceLog client ID",
      type: "text",
      placeholder: "FL-12345",
      hint: "From your ForceLog workspace settings",
      required: true,
    },
    {
      key: "api_key",
      label: "API key",
      type: "password",
      hint: "Request from contact@forcelog.ma — partner program required",
      required: true,
    },
  ],
  status: "soon",
  setupHint:
    "ForceLog API access is partner-only and currently in pilot. We're working with their team to enable automatic pickup scheduling. Until then, confirmed orders show in your dashboard with one-click 'Send to ForceLog' that opens their workspace pre-filled.",
};

export const ForceLogAdapter: CarrierAdapter = {
  platform: "forcelog",
  descriptor,

  async testConnection(creds): Promise<ConnectionTest> {
    const apiKey = String(creds.api_key ?? "");
    const clientId = String(creds.client_id ?? "");
    if (!apiKey || !clientId) return { ok: false, error: "Missing client ID or API key" };

    // TODO: replace with real ForceLog endpoint once API is shared.
    // For now we accept any non-empty creds in trust mode so the merchant
    // can save their ForceLog identifier for the manual fallback flow.
    return {
      ok: true,
      storeName: `ForceLog · ${clientId}`,
      meta: { mode: "trust", note: "Pickups will be queued until ForceLog API is live." },
    };
  },

  async schedulePickup(_creds, req: PickupRequest): Promise<PickupResult> {
    // TODO: POST to ForceLog pickup endpoint with:
    //   recipient name, phone, address, city
    //   COD amount = req.amountMad
    //   merchant client_id (from creds)
    //
    // Response should include their internal tracking number; return it.
    //
    // For now: queue the pickup request as a manual TODO that surfaces
    // in the dashboard. The order moves to status=confirmed and the merchant
    // gets a one-click "Send to ForceLog" link.
    return {
      ok: false,
      error: `ForceLog API not yet enabled. Order ${req.orderId} queued for manual handoff.`,
    };
  },
};
