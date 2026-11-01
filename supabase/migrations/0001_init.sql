-- SHS Collective — initial schema
-- Target: PostgreSQL 15+ (Supabase compatible) and PGlite (local development).
-- All money is stored as integer paise (INR minor units).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_touch before update on categories
for each row execute function set_updated_at();

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 160),
  description text not null default '',
  category_id uuid references categories(id) on delete set null,
  condition text not null check (condition in ('new', 'pre_owned')),
  price_paise integer not null check (price_paise > 0),
  compare_at_price_paise integer check (
    compare_at_price_paise is null or compare_at_price_paise > price_paise
  ),
  sku text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  featured boolean not null default false,
  seo_title text,
  seo_description text,
  measurements text,
  is_demo boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_status_idx on products (status);
create index products_category_idx on products (category_id);
create index products_featured_idx on products (featured) where status = 'published';
create index products_published_at_idx on products (published_at desc nulls last);
create index products_title_search_idx on products using gin (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);

create trigger products_touch before update on products
for each row execute function set_updated_at();

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size text check (size is null or length(btrim(size)) between 1 and 24),
  color text check (color is null or length(btrim(color)) between 1 and 40),
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9a-fA-F]{6}$'),
  sku text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One variant per exact size/colour combination, treating NULL as "not applicable".
create unique index product_variants_combo_idx
  on product_variants (product_id, coalesce(size, ''), coalesce(color, ''));
create index product_variants_product_idx on product_variants (product_id);

create trigger product_variants_touch before update on product_variants
for each row execute function set_updated_at();

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_key text not null check (length(storage_key) > 0),
  alt_text text not null default '',
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on product_images (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- Orders (snapshots are immutable once written)
-- ---------------------------------------------------------------------------

create table orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^SHS-[A-Z0-9-]{6,20}$'),
  status text not null default 'pending_confirmation' check (
    status in (
      'pending_confirmation',
      'confirmed',
      'processing',
      'shipped',
      'ready_for_pickup',
      'completed',
      'cancelled'
    )
  ),
  fulfilment_method text not null check (fulfilment_method in ('shipping', 'pickup')),
  customer_name text not null check (length(btrim(customer_name)) between 2 and 120),
  phone text not null check (phone ~ '^\+?[1-9][0-9]{7,15}$'),
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pincode text check (pincode is null or pincode ~ '^[1-9][0-9]{5}$'),
  landmark text,
  notes text check (notes is null or length(notes) <= 1000),
  subtotal_paise integer not null check (subtotal_paise >= 0),
  shipping_paise integer not null default 0 check (shipping_paise >= 0),
  total_paise integer not null check (total_paise >= 0),
  currency text not null default 'INR' check (currency = 'INR'),
  shipping_pending boolean not null default false,
  stock_policy text not null check (stock_policy in ('enquiry', 'reserve')),
  reservation_expires_at timestamptz,
  stock_deducted boolean not null default false,
  idempotency_key text not null unique check (length(idempotency_key) between 16 and 100),
  request_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_address_required check (
    fulfilment_method <> 'shipping'
    or (
      address_line1 is not null
      and city is not null
      and state is not null
      and pincode is not null
    )
  )
);

create index orders_status_idx on orders (status, created_at desc);
create index orders_created_idx on orders (created_at desc);
create index orders_phone_idx on orders (phone);
create index orders_reservation_idx on orders (reservation_expires_at)
  where stock_policy = 'reserve' and stock_deducted;

create trigger orders_touch before update on orders
for each row execute function set_updated_at();

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  product_title text not null,
  product_slug text not null,
  variant_label text not null default '',
  condition text not null check (condition in ('new', 'pre_owned')),
  image_key text,
  unit_price_paise integer not null check (unit_price_paise > 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total_paise integer not null check (line_total_paise = unit_price_paise * quantity),
  created_at timestamptz not null default now()
);

create index order_items_order_idx on order_items (order_id);

create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references product_variants(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  delta integer not null check (delta <> 0),
  reason text not null check (
    reason in (
      'order_reserved',
      'order_confirmed',
      'order_cancelled',
      'order_released',
      'manual_adjustment',
      'restock'
    )
  ),
  note text check (note is null or length(note) <= 500),
  created_by uuid,
  created_at timestamptz not null default now()
);

create index inventory_movements_variant_idx on inventory_movements (variant_id, created_at desc);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index order_status_history_order_idx on order_status_history (order_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Business configuration (single row)
-- ---------------------------------------------------------------------------

create table business_settings (
  id smallint primary key default 1 check (id = 1),
  whatsapp_number text not null default '+919711366699',
  instagram_url text not null default 'https://www.instagram.com/shscollective3/',
  support_email text not null default '',
  domain text not null default '',
  shipping_flat_paise integer check (shipping_flat_paise is null or shipping_flat_paise >= 0),
  free_shipping_threshold_paise integer check (
    free_shipping_threshold_paise is null or free_shipping_threshold_paise > 0
  ),
  pickup_enabled boolean not null default true,
  pickup_instructions text not null default '',
  stock_policy text not null default 'enquiry' check (stock_policy in ('enquiry', 'reserve')),
  reservation_minutes integer not null default 30 check (reservation_minutes between 5 and 1440),
  shipping_policy text not null default '',
  returns_policy text not null default '',
  privacy_policy text not null default '',
  terms_policy text not null default '',
  policies_approved boolean not null default false,
  about_text text not null default '',
  faq_json jsonb not null default '[]'::jsonb,
  hero_image_key text,
  hero_eyebrow text not null default 'Curated thrift · New & pre-owned',
  hero_headline text not null default 'Built on Style',
  hero_subhead text not null default
    'A tightly curated edit of clothing — chosen for cut, condition and character. One piece at a time.',
  launch_approved boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger business_settings_touch before update on business_settings
for each row execute function set_updated_at();

insert into business_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Administration
-- ---------------------------------------------------------------------------

create table admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null default '',
  password_hash text not null,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index admin_users_email_idx on admin_users (lower(email));

create trigger admin_users_touch before update on admin_users
for each row execute function set_updated_at();

create table admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admin_users(id) on delete cascade,
  token_hash text not null unique,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index admin_sessions_admin_idx on admin_sessions (admin_id);
create index admin_sessions_expiry_idx on admin_sessions (expires_at);

alter table inventory_movements
  add constraint inventory_movements_created_by_fk
  foreign key (created_by) references admin_users(id) on delete set null;

alter table order_status_history
  add constraint order_status_history_created_by_fk
  foreign key (created_by) references admin_users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Abuse controls
-- ---------------------------------------------------------------------------

create table rate_limit_buckets (
  bucket text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security (defence in depth for Supabase)
--
-- The application only ever talks to PostgreSQL from the server using a
-- privileged connection. Browser clients receive no database credentials.
-- RLS is enabled with no permissive policies so that an accidental future use
-- of the anon/authenticated keys cannot read or mutate private data.
-- ---------------------------------------------------------------------------

alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table inventory_movements enable row level security;
alter table order_status_history enable row level security;
alter table business_settings enable row level security;
alter table admin_users enable row level security;
alter table admin_sessions enable row level security;
alter table rate_limit_buckets enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon';
    execute 'revoke all on all sequences in schema public from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on all tables in schema public from authenticated';
    execute 'revoke all on all sequences in schema public from authenticated';
  end if;
end;
$$;
