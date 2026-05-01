# Snailon — MVP

The financial OS for cash-on-delivery commerce. Confirms COD orders in Darija via AI, tracks merchant wallets, ingests orders from any platform.

## What's built

- **Landing page** — `/` — captures waitlist signups (`waitlist` table), thank-you email via Resend.
- **Auth** — `/signup`, `/login` — Supabase Auth (email + password). Auto-creates `merchants` row + 25 MAD signup bonus.
- **Dashboard** — `/dashboard` — overview, orders, wallet, products. RLS-protected.
- **Wallet + Whop top-ups** — Tap a tier → Whop checkout → webhook credits wallet via atomic `credit_wallet` RPC.
- **Order ingestion** — `POST /api/orders/create` — public webhook, Bearer-token auth using merchant_id. Persists order, builds Darija opening message, marks `confirming`.
- **Confirmation engine** — `POST /api/confirm/:orderId` — runs DeepSeek over conversation history. On `confirm` intent → flips order, debits wallet 5 MAD, emails merchant. On `reject` → marks unconfirmed. Accepts address corrections.
- **DeepSeek (not Haiku)** — `lib/deepseek.ts` — OpenAI-compatible client, configured for `deepseek-chat` with JSON mode for the decision call.

## What's NOT built (intentional)

- WhatsApp send/receive — pluggable. The `confirm` endpoint is the same one a WhatsApp webhook would call. Add Meta Cloud API or Twilio later.
- Carrier label creation — Year-1 work. Stubbed in `pricing.ts`.
- RAG over product catalog — `products` table exists, no embeddings yet.

## Setup

```bash
# 1. Install
cd snailon
npm install

# 2. Schema is already applied to your Supabase project (see project_id below).
#    If you ever need to re-apply, the migration is at:
#    https://supabase.com/dashboard/project/akxdpwunuwpumixrpegp/sql

# 3. Environment
cp .env.example .env.local
# Fill in DEEPSEEK_API_KEY (everything else is pre-filled from your project files).

# 4. Run
npm run dev
# → http://localhost:3000
```

## Get a DeepSeek API key

1. Sign up at https://platform.deepseek.com
2. Go to API Keys → create a key
3. Paste into `.env.local` as `DEEPSEEK_API_KEY`

DeepSeek pricing (Nov 2025): ~$0.27 per 1M input tokens, ~$1.10 per 1M output tokens for `deepseek-chat`. A confirmation conversation is ~500–1000 tokens total. **One confirmation costs less than $0.001 in inference.** You charge the merchant 5 MAD (~$0.50). 500x markup.

## Deploy

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Snailon MVP"
gh repo create snailon --private --source=. --push

# 2. Deploy to Vercel
# - Connect the GitHub repo at https://vercel.com/new
# - Paste env vars from .env.local in the Vercel project settings
# - Set root domain to snailon.com
```

## Testing the confirmation flow without WhatsApp

```bash
# 1. Sign up at /signup → get your merchant_id from /dashboard
# 2. Push a fake order
curl -X POST http://localhost:3000/api/orders/create \
  -H "Authorization: Bearer <YOUR_MERCHANT_ID>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Khalid",
    "customer_phone": "+212600000000",
    "customer_address": "Rue Tarik, Maarif",
    "customer_city": "Casablanca",
    "product_name": "Montre digitale",
    "product_price_mad": 199,
    "quantity": 1
  }'
# Response includes order_id and the AI's opening Darija message.

# 3. Simulate the customer replying
curl -X POST http://localhost:3000/api/confirm/<ORDER_ID> \
  -H "Content-Type: application/json" \
  -d '{"customer_message":"wakhha"}'
# → status flips to "confirmed", wallet debited 5 MAD, merchant emailed.

# 4. Inspect the conversation
curl http://localhost:3000/api/confirm/<ORDER_ID>
```

## When you're ready to wire up WhatsApp

Two options. Both end up calling `POST /api/confirm/:orderId` from the WhatsApp inbound webhook, with the customer's reply in the body. Sending the AI's reply back to WhatsApp is a single fetch.

- **Meta Cloud API direct** — free up to 1,000 conversations/month, no opt-in friction. Requires Meta Business verification (1–24h).
- **Twilio WhatsApp Sandbox** — instant, but customers must opt in. Fine for friend-tests.

Both can hide behind `lib/whatsapp/provider.ts` (TODO).

## Database

Schema lives in your Supabase project `akxdpwunuwpumixrpegp`. Tables: `merchants`, `orders`, `confirmation_messages`, `wallet_transactions`, `products`, `waitlist`. Atomic wallet operations: `credit_wallet`, `debit_wallet` RPCs.

RLS enabled on all tables. Merchants only see their own data.

## Pricing

Configured in `lib/pricing.ts` and overridable via env vars:

- `PRICE_PER_CONFIRMED_MAD` — default 5 MAD per confirmed order
- `SIGNUP_BONUS_MAD` — default 25 MAD free credit on signup (5 free confirmations)

## What ships next

In rough priority order:

1. WhatsApp provider (Meta Cloud API)
2. Multi-message conversation flow (currently single-turn — extend to retry on no reply)
3. RAG over `products` so the AI can answer "shnu lon dyalha?" / "kayn taille L?"
4. YouCan + Shopify webhook adapters → push directly to `/api/orders/create`
5. Multi-carrier label creation (Amana / Tawssil / Cathédis)
6. The Settle layer — own the COD cash, not just create labels

— Built fast. Built in Casablanca.
