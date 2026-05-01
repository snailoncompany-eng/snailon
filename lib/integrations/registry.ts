// Single source of truth for which integrations Snailon supports.
// Adding a new platform = drop a file in store/ or carrier/ + register it here.

import type { StoreAdapter, CarrierAdapter, StorePlatform, CarrierPlatform } from "./types";
import { YouCanAdapter } from "./store/youcan";
import { ShopifyAdapter } from "./store/shopify";
import { WooCommerceAdapter } from "./store/woocommerce";
import { ForceLogAdapter } from "./carrier/forcelog";

export const STORE_ADAPTERS: Record<StorePlatform, StoreAdapter | undefined> = {
  youcan: YouCanAdapter,
  shopify: ShopifyAdapter,
  woocommerce: WooCommerceAdapter,
  custom: undefined,
};

export const CARRIER_ADAPTERS: Record<CarrierPlatform, CarrierAdapter | undefined> = {
  forcelog: ForceLogAdapter,
  amana: undefined,
  tawssil: undefined,
  custom: undefined,
};

export function getStoreAdapter(platform: string): StoreAdapter | null {
  return STORE_ADAPTERS[platform as StorePlatform] ?? null;
}

export function getCarrierAdapter(platform: string): CarrierAdapter | null {
  return CARRIER_ADAPTERS[platform as CarrierPlatform] ?? null;
}

// Public list (descriptors only — never expose credentials shape inside)
export function listStorePlatforms() {
  return Object.values(STORE_ADAPTERS)
    .filter((a): a is StoreAdapter => !!a)
    .map((a) => a.descriptor);
}

export function listCarrierPlatforms() {
  return Object.values(CARRIER_ADAPTERS)
    .filter((a): a is CarrierAdapter => !!a)
    .map((a) => a.descriptor);
}
