// Snailon pricing — single source of truth.
// Per-confirmed-order charge, deducted from merchant wallet.

export const PRICING = {
  // ~$0.50 USD ~= 5 MAD. Confirmed-only billing (no charge on noise/ask).
  pricePerConfirmedOrderMad: Number(process.env.PRICE_PER_CONFIRMED_MAD ?? 5),
  // Free credits for new merchants on signup (in MAD).
  signupBonusMad: Number(process.env.SIGNUP_BONUS_MAD ?? 25),
  // Top-up tiers (frontend will create Whop checkouts for these).
  topupTiers: [
    { mad: 100, label: "100 MAD", orders: 20 },
    { mad: 500, label: "500 MAD", orders: 100 },
    { mad: 1000, label: "1 000 MAD", orders: 200 },
    { mad: 5000, label: "5 000 MAD", orders: 1000 },
  ],
};
