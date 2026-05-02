-- ─────────────────────────────────────────────────────────────────────────
-- Snailon — Pixel-first store integration v2
-- ─────────────────────────────────────────────────────────────────────────
--
-- Additive migration on top of the existing snailon schema. We do NOT drop
-- or rename existing tables; we extend them so the new pixel-first flow
-- coexists with whatever else writes to merchants / store_connections /
-- orders / pixel_events.
--
-- Existing reality this migration aligns with:
--   merchants(id, user_id → auth.users.id UNIQUE, ...)
--   store_connections(id, merchant_id, platform store_platform,
--                     store_url, pixel_token UNIQUE, webhook_secret, ...)
--   orders(id, merchant_id, store_connection_id, external_order_id,
--          customer_phone, product_name, product_price_mad, status, ...)
--   pixel_events(id, store_connection_id, pixel_token, event_type, ...)
--   enum store_platform: shopify | woocommerce | youcan | custom
--
-- What this migration adds:
--   • store_connections.connection_status (pending|testing|live|disconnected)
--   • store_connections.primary_domain, first_order_at, last_order_at
--   • Auto-defaults for pixel_token (snk_xxx) and webhook_secret (hex)
--   • store_domains: hostname allow-list per store_connection
--   • orders.shipping_address, items, total_amount, currency, customer_email,
--     source, needs_phone, ingested_at — pixel sends richer data than the
--     existing flat schema captured. Old NOT NULL constraints on phone /
--     product_name relaxed (pixel sometimes sees orders without these).
--   • Idempotency UNIQUE on (store_connection_id, external_order_id)
--   • pixel_events.outcome + .origin so it can serve as the ingest_log
--   • store_by_public_key() helper used by the ingest path
--   • RLS INSERT/UPDATE/DELETE policies on store_connections (only SELECT
--     existed) so the dashboard wizard can create/edit stores
-- ─────────────────────────────────────────────────────────────────────────


-- 1. Extend store_connections with the wizard's status + domain columns.
alter table public.store_connections
  add column if not exists connection_status text not null default 'pending',
  add column if not exists primary_domain text,
  add column if not exists first_order_at timestamptz,
  add column if not exists last_order_at  timestamptz;

alter table public.store_connections
  drop constraint if exists store_connections_status_check;
alter table public.store_connections
  add  constraint store_connections_status_check
       check (connection_status in ('pending','testing','live','disconnected'));


-- 2. Auto-generate a public key (snk_xxx) and a webhook secret on insert,
--    so the dashboard never has to invent these. Existing UNIQUE on
--    pixel_token still applies.
alter table public.store_connections
  alter column pixel_token   set default ('snk_' || encode(gen_random_bytes(12), 'hex'));

alter table public.store_connections
  alter column webhook_secret set default encode(gen_random_bytes(32), 'hex');

-- Backfill any nulls so we can make pixel_token NOT NULL.
update public.store_connections
   set pixel_token = 'snk_' || encode(gen_random_bytes(12), 'hex')
 where pixel_token is null;

update public.store_connections
   set webhook_secret = encode(gen_random_bytes(32), 'hex')
 where webhook_secret is null;

alter table public.store_connections
  alter column pixel_token set not null;


-- 3. New table: store_domains — the hostname allow-list. The pixel posts
--    are gated on Origin/Referer matching one of these per store. Without
--    this we'd accept any payload claiming a snk_xxx public key.
create table if not exists public.store_domains (
  id                  uuid primary key default gen_random_uuid(),
  store_connection_id uuid not null references public.store_connections(id) on delete cascade,
  hostname            text not null,
  verified_at         timestamptz,
  created_at          timestamptz not null default now(),
  constraint store_domains_hostname_lc check (hostname = lower(hostname)),
  unique (store_connection_id, hostname)
);

create index if not exists idx_store_domains_store    on public.store_domains(store_connection_id);
create index if not exists idx_store_domains_hostname on public.store_domains(hostname);

alter table public.store_domains enable row level security;

drop policy if exists store_domains_owner_select on public.store_domains;
create policy store_domains_owner_select on public.store_domains
  for select to authenticated
  using (
    exists (
      select 1 from public.store_connections sc
      join public.merchants m on m.id = sc.merchant_id
      where sc.id = store_domains.store_connection_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists store_domains_owner_insert on public.store_domains;
create policy store_domains_owner_insert on public.store_domains
  for insert to authenticated
  with check (
    exists (
      select 1 from public.store_connections sc
      join public.merchants m on m.id = sc.merchant_id
      where sc.id = store_domains.store_connection_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists store_domains_owner_delete on public.store_domains;
create policy store_domains_owner_delete on public.store_domains
  for delete to authenticated
  using (
    exists (
      select 1 from public.store_connections sc
      join public.merchants m on m.id = sc.merchant_id
      where sc.id = store_domains.store_connection_id
        and m.user_id = auth.uid()
    )
  );


-- 4. Extend orders with the rich fields the pixel produces. The legacy
--    flat columns (product_name, product_price_mad, customer_phone, etc.)
--    stay; we ALSO record the full structured payload so the AI confirmer
--    has everything it needs.
alter table public.orders
  add column if not exists shipping_address jsonb,
  add column if not exists items            jsonb,
  add column if not exists total_amount     numeric,
  add column if not exists currency         text default 'MAD',
  add column if not exists customer_email   text,
  add column if not exists source           text,
  add column if not exists needs_phone      boolean default false,
  add column if not exists ingested_at      timestamptz default now();

-- The pixel sometimes sees orders before the customer has filled in phone
-- (e.g., order page loads before form submit on some themes). We mark
-- needs_phone=true and let the agent ask. Same for product_name on
-- non-line-item-aware platforms.
alter table public.orders
  alter column customer_phone drop not null,
  alter column product_name   drop not null;

-- Idempotency: re-firing webhooks or duplicate beacons should NOT create
-- duplicate orders. (store_connection_id, external_order_id) is the key.
-- Partial index because some pixel events lack external_order_id at
-- detection time and we'd rather accept those than reject the dedup attempt.
create unique index if not exists orders_idem_unique
  on public.orders (store_connection_id, external_order_id)
  where external_order_id is not null;

-- ALSO add it as a real constraint (not just an index) so PostgREST's
-- ON CONFLICT clause can target it. NULLS in (store_connection_id,
-- external_order_id) are treated as distinct by PG default, so this
-- doesn't reject pixel events that arrive without an external_id.
alter table public.orders
  drop constraint if exists orders_store_external_unique;
alter table public.orders
  add  constraint orders_store_external_unique
       unique (store_connection_id, external_order_id);

create index if not exists idx_orders_ingested_at
  on public.orders (store_connection_id, ingested_at desc);


-- 5. Extend pixel_events to double as the ingest_log — every accepted /
--    rejected ingest attempt is recorded here so LiveStatus can tell the
--    merchant *why* a test order didn't land.
alter table public.pixel_events
  add column if not exists outcome text,
  add column if not exists origin  text;

alter table public.pixel_events
  drop constraint if exists pixel_events_outcome_check;
alter table public.pixel_events
  add  constraint pixel_events_outcome_check
       check (outcome is null or outcome in
              ('accepted','duplicate','origin_rejected','signature_rejected','rate_limited','malformed'));

create index if not exists idx_pixel_events_outcome
  on public.pixel_events (pixel_token, outcome, created_at desc)
  where outcome is not null;


-- 6. Helper function: resolve a snk_xxx public key to its store_connection.
--    SECURITY DEFINER so the ingest path can call it without a session,
--    but it returns only the bare-minimum columns we need for the auth
--    check (no credentials jsonb, no merchant PII).
create or replace function public.store_by_public_key(p_key text)
returns table (
  id                  uuid,
  merchant_id         uuid,
  platform            public.store_platform,
  primary_domain      text,
  webhook_secret      text,
  connection_status   text
)
language sql
stable
security definer
set search_path = public
as $$
  select sc.id,
         sc.merchant_id,
         sc.platform,
         sc.primary_domain,
         sc.webhook_secret,
         sc.connection_status
    from public.store_connections sc
   where sc.pixel_token = p_key;
$$;

revoke all  on function public.store_by_public_key(text) from public;
grant  execute on function public.store_by_public_key(text) to authenticated, service_role, anon;


-- 7. Round out store_connections RLS — the existing schema only had a
--    SELECT policy, but the wizard needs INSERT/UPDATE/DELETE for the
--    merchant who owns the store. Service-role still bypasses everything.
drop policy if exists store_conn_owner_insert on public.store_connections;
create policy store_conn_owner_insert on public.store_connections
  for insert to authenticated
  with check (
    exists (select 1 from public.merchants m
             where m.id = store_connections.merchant_id
               and m.user_id = auth.uid())
  );

drop policy if exists store_conn_owner_update on public.store_connections;
create policy store_conn_owner_update on public.store_connections
  for update to authenticated
  using (
    exists (select 1 from public.merchants m
             where m.id = store_connections.merchant_id
               and m.user_id = auth.uid())
  );

drop policy if exists store_conn_owner_delete on public.store_connections;
create policy store_conn_owner_delete on public.store_connections
  for delete to authenticated
  using (
    exists (select 1 from public.merchants m
             where m.id = store_connections.merchant_id
               and m.user_id = auth.uid())
  );


-- 8. Owner-scoped INSERT policy on orders too — the dashboard's "create
--    test order" button needs this. Pixel ingest goes through service_role.
drop policy if exists orders_owner_insert on public.orders;
create policy orders_owner_insert on public.orders
  for insert to authenticated
  with check (
    exists (select 1 from public.merchants m
             where m.id = orders.merchant_id
               and m.user_id = auth.uid())
  );


-- 9. Touch updated_at on store_connections when status flips to 'live'.
create or replace function public.snailon_touch_store_conn_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists snailon_store_conn_updated_at on public.store_connections;
create trigger snailon_store_conn_updated_at
  before update on public.store_connections
  for each row execute function public.snailon_touch_store_conn_updated_at();
