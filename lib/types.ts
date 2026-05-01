// Minimal hand-written types matching the Supabase schema.

export type OrderStatus =
  | "pending"
  | "confirming"
  | "confirmed"
  | "unconfirmed"
  | "cancelled"
  | "failed";

export type WalletTxType =
  | "topup"
  | "confirmation_charge"
  | "refund"
  | "adjustment"
  | "signup_bonus";

export type Merchant = {
  id: string;
  user_id: string | null;
  email: string;
  phone: string | null;
  business_name: string | null;
  balance_mad: number;
  whop_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  merchant_id: string;
  external_order_id: string | null;
  customer_name: string | null;
  customer_phone: string;
  customer_address: string | null;
  customer_city: string | null;
  product_name: string;
  product_price_mad: number;
  quantity: number;
  raw_payload: any;
  status: OrderStatus;
  ai_summary: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  last_message_at: string | null;
};

export type ConfirmationMessage = {
  id: string;
  order_id: string;
  direction: "inbound" | "outbound";
  channel: string;
  content: string;
  ai_meta: any;
  created_at: string;
};

export type WalletTx = {
  id: string;
  merchant_id: string;
  amount_mad: number;
  type: WalletTxType;
  reference: string | null;
  balance_after_mad: number;
  metadata: any;
  created_at: string;
};
