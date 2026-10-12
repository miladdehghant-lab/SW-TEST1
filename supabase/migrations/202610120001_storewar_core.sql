-- STORE WAR pilot database foundation
-- Apply this migration in a dedicated Supabase project (never production data yet).
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  phone text unique,
  role text not null default 'seller' check (role in ('admin','rep','supervisor','support','seller')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','inactive')),
  agency_id uuid,
  supervisor_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  city text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_agency_id_fkey foreign key (agency_id) references public.agencies(id);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  external_code text,
  name text not null,
  city text not null,
  address text,
  phone text,
  agency_id uuid references public.agencies(id),
  owner_id uuid references public.profiles(id),
  potential text not null default 'medium' check (potential in ('low','medium','high')),
  status text not null default 'provisional' check (status in ('provisional','pending_sales_match','active','inactive','lost')),
  latitude double precision,
  longitude double precision,
  gps_accuracy_m double precision,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists stores_agency_external_code_uq
  on public.stores(agency_id, external_code) where external_code is not null;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku_code text not null unique,
  product_name text not null,
  brand text,
  category text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  agency_id uuid references public.agencies(id),
  period_key text not null,
  covered_through date,
  status text not null default 'validating' check (status in ('validating','needs_correction','pending_approval','approved','rejected')),
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  invalid_rows integer not null default 0,
  uploaded_by uuid not null references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.sales_import_batches(id) on delete cascade,
  source_row integer not null,
  invoice_number text,
  invoice_date date,
  customer_code text,
  customer_name text,
  seller_source_name text,
  seller_profile_id uuid references public.profiles(id),
  sku_code text,
  product_name text,
  brand text,
  quantity numeric(14,3),
  sales_value_rial numeric(18,2),
  row_status text not null default 'needs_review' check (row_status in ('valid','needs_review','invalid','duplicate','approved','rejected')),
  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  normalized_fingerprint text,
  created_at timestamptz not null default now(),
  unique(batch_id, source_row)
);
create index if not exists sales_import_rows_fingerprint_idx on public.sales_import_rows(normalized_fingerprint);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  source_row_id uuid not null unique references public.sales_import_rows(id),
  agency_id uuid references public.agencies(id),
  invoice_number text not null,
  invoice_date date not null,
  customer_code text not null,
  store_id uuid references public.stores(id),
  seller_id uuid references public.profiles(id),
  sku_code text not null,
  quantity numeric(14,3) not null,
  sales_value_rial numeric(18,2),
  is_return boolean not null default false,
  approved_batch_id uuid not null references public.sales_import_batches(id),
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists sales_period_seller_idx on public.sales(seller_id, invoice_date);
create index if not exists sales_store_date_idx on public.sales(store_id, invoice_date);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  submitted_by uuid not null references public.profiles(id),
  activity_type text not null check (activity_type in ('initial','repeat','visit','merch','recovery')),
  note text,
  latitude double precision,
  longitude double precision,
  gps_accuracy_m double precision,
  gps_captured_at timestamptz,
  status text not null default 'submitted' check (status in ('submitted','returned','rejected','verified')),
  review_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_evidence (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  storage_path text not null,
  evidence_kind text not null check (evidence_kind in ('photo','before','after','document')),
  created_at timestamptz not null default now()
);

create table if not exists public.targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  agency_id uuid references public.agencies(id),
  period_key text not null,
  brand text,
  quantity numeric(14,3) not null default 0,
  store_target integer not null default 0,
  status text not null default 'pending' check (status in ('pending','pending_rep','approved','rejected')),
  created_by uuid not null references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  review_note text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists public.scoring_rule_versions (
  id uuid primary key default gen_random_uuid(),
  version_name text not null unique,
  weights jsonb not null,
  rules jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create unique index if not exists scoring_one_active_version_idx
  on public.scoring_rule_versions(is_active) where is_active;

create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  store_id uuid references public.stores(id),
  source_type text not null check (source_type in ('activity','sale','target_bonus','manual','adjustment')),
  source_id uuid not null,
  rule_version_id uuid references public.scoring_rule_versions(id),
  period_key text not null,
  points numeric(12,3) not null,
  status text not null default 'pending' check (status in ('pending','verified','reversed')),
  description text,
  created_at timestamptz not null default now(),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz
);
create unique index if not exists score_events_source_once_idx
  on public.score_events(source_type, source_id, user_id) where status <> 'reversed';

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Authorization helpers use the authenticated profile, never client-supplied role claims.
create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and status = 'approved'
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false)
$$;

alter table public.agencies enable row level security;
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.sales_import_batches enable row level security;
alter table public.sales_import_rows enable row level security;
alter table public.sales enable row level security;
alter table public.activities enable row level security;
alter table public.activity_evidence enable row level security;
alter table public.targets enable row level security;
alter table public.scoring_rule_versions enable row level security;
alter table public.score_events enable row level security;
alter table public.audit_logs enable row level security;

-- Initial pilot policy: admins can configure/test the system; approved users can read
-- only basic shared catalog data. Scoped role policies are added before real-user pilot.
create policy "approved users read agencies" on public.agencies for select to authenticated
  using (public.current_app_role() is not null);
create policy "admins manage agencies" on public.agencies for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "users read own profile or admins read all" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "admins manage profiles" on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "admins manage stores" on public.stores for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins manage products" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins manage import batches" on public.sales_import_batches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins manage import rows" on public.sales_import_rows for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins manage approved sales" on public.sales for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins manage activities" on public.activities for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins manage activity evidence" on public.activity_evidence for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins manage targets" on public.targets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "authenticated read active scoring rules" on public.scoring_rule_versions for select to authenticated
  using (is_active = true or public.is_admin());
create policy "admins manage scoring rules" on public.scoring_rule_versions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins manage score events" on public.score_events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admins read audit logs" on public.audit_logs for select to authenticated
  using (public.is_admin());
create policy "admins insert audit logs" on public.audit_logs for insert to authenticated
  with check (public.is_admin());

-- No public/anon policies. Do not put a service-role key in frontend code.
