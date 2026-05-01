// Snailon pricing — single source of truth.

export const PRICING = {
  // Per-confirmed-order charge, deducted from merchant wallet.
  pricePerConfirmedOrderMad: Number(process.env.PRICE_PER_CONFIRMED_MAD ?? 5),
  // Free credits for new merchants on signup (in MAD).
  signupBonusMad: Number(process.env.SIGNUP_BONUS_MAD ?? 25),
  // Pre-launch founding-store: +50% on every top-up forever.
  foundingBonusPct: Number(process.env.FOUNDING_BONUS_PCT ?? 50),
};

export type Tier = {
  id: string;
  label: string;
  amountMad: number;
  bonusMad: number;
  isFounding: boolean;
  // What we display to the user
  totalCreditMad: number;
  bonusPct: number;
  // Marketing copy
  tagline?: string;
  highlight?: boolean;
};

const standard = (amount: number): Tier => ({
  id: `std_${amount}`,
  label: `${amount} MAD`,
  amountMad: amount,
  bonusMad: 0,
  isFounding: false,
  totalCreditMad: amount,
  bonusPct: 0,
});

const founding = (amount: number): Tier => {
  const pct = PRICING.foundingBonusPct;
  const bonus = Math.round(amount * (pct / 100));
  return {
    id: `founding_${amount}`,
    label: "Founding Store",
    amountMad: amount,
    bonusMad: bonus,
    isFounding: true,
    totalCreditMad: amount + bonus,
    bonusPct: pct,
    tagline: `+${pct}% bonus on this top-up — and on every future top-up, forever`,
    highlight: true,
  };
};

export const TIERS: Tier[] = [
  standard(200),
  standard(500),
  standard(1000),
  founding(1000),
];

export function findTier(id: string): Tier | undefined {
  return TIERS.find((t) => t.id === id);
}
