// Snailon integration contracts.
//
// Every store adapter in lib/integrations/store/* implements `StoreAdapter`.
// Every carrier adapter in lib/integrations/carrier/* implements `CarrierAdapter`.
// Adding a new platform = drop one file + register it in registry.ts. Done.

// ----- Store types -----

export type StorePlatform = "shopify" | "woocommerce" | "youcan" | "custom";

// Whatever the platform needs us to store to call its API.
// Shape varies by platform; adapters cast at the edges.
export type StoreCredentials = Record<string, any>;

// What the connect form collects from the merchant for a given platform.
// Drives the UI of the connect modal.
export type CredentialField = {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder?: string;
  hint?: string;
  required?: boolean;
};

// One row in the platform picker.
export type PlatformDescriptor = {
  id: StorePlatform;
  label: string;
  // Short pitch shown on the card
  tagline: string;
  // Logo as a single-letter monogram (we use typography, not images)
  monogram: string;
  // What credentials the connect modal asks for
  fields: CredentialField[];
  // Is the adapter live, or still a stub?
  status: "live" | "preview" | "soon";
  // Free-text help for the merchant (pasted into the modal)
  setupHint?: string;
};

// What testConnection returns
export type ConnectionTest =
  | { ok: true; storeName: string; externalStoreId?: string; meta?: any }
  | { ok: false; error: string };

// Normalized order — every adapter produces this shape from a webhook.
// This is the only thing the rest of Snailon should depend on.
export type NormalizedOrder = {
  externalOrderId: string;
  customerName?: string | null;
  customerPhone: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerCity?: string | null;
  productName: string;
  productPriceMad: number;
  quantity: number;
  rawPayload: any;
  // For "abandoned cart" events, this is true; we treat them differently
  // (less aggressive AI tone, different intent labels).
  isAbandoned?: boolean;
};

export type NormalizedProduct = {
  externalProductId: string;
  name: string;
  priceMad: number;
  description?: string | null;
  variants?: any;
};

export interface StoreAdapter {
  readonly platform: StorePlatform;
  readonly descriptor: PlatformDescriptor;

  // Verify the merchant's credentials work; return store name for display.
  testConnection(creds: StoreCredentials): Promise<ConnectionTest>;

  // Pull the catalog. Caller persists into the products table.
  syncCatalog(creds: StoreCredentials): Promise<NormalizedProduct[]>;

  // Verify an inbound webhook from this platform.
  // `creds` is the full row's credentials; the adapter knows which field
  // (e.g. webhook_secret, oauth client secret) to use.
  verifyWebhook(rawBody: string, headers: Headers, creds: StoreCredentials): boolean;

  // Parse an inbound order webhook into a normalized order.
  // Return null if the event isn't an order (we ignore other events).
  parseOrderWebhook(rawBody: string, headers: Headers): NormalizedOrder | null;

  // (Optional) Register webhooks with the platform after connect.
  // For platforms that support API-driven webhook subscription (YouCan, Shopify).
  registerWebhooks?(creds: StoreCredentials, callbackUrl: string): Promise<void>;
}

// ----- Carrier types -----

export type CarrierPlatform = "forcelog" | "amana" | "tawssil" | "custom";

export type CarrierCredentials = Record<string, any>;

export type CarrierDescriptor = {
  id: CarrierPlatform;
  label: string;
  tagline: string;
  monogram: string;
  fields: CredentialField[];
  status: "live" | "preview" | "soon";
  setupHint?: string;
};

export type PickupRequest = {
  // Confirmed order from our DB
  orderId: string;
  customerName?: string | null;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  productName: string;
  amountMad: number;
  // For COD reconciliation
  isCashOnDelivery: boolean;
};

export type PickupResult =
  | { ok: true; trackingNumber: string; carrierOrderId: string; estimatedDeliveryAt?: string }
  | { ok: false; error: string };

export interface CarrierAdapter {
  readonly platform: CarrierPlatform;
  readonly descriptor: CarrierDescriptor;
  testConnection(creds: CarrierCredentials): Promise<ConnectionTest>;
  schedulePickup(creds: CarrierCredentials, req: PickupRequest): Promise<PickupResult>;
  // Optional status fetch
  getTrackingStatus?(creds: CarrierCredentials, trackingNumber: string): Promise<{ status: string; lastEvent?: string } | null>;
}
