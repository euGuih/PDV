-- Operacao real do PDV: turnos, mesas, movimentos e auditoria

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_type') then
    create type order_type as enum ('COUNTER', 'TABLE');
  end if;
  if not exists (select 1 from pg_type where typname = 'cash_movement_type') then
    create type cash_movement_type as enum ('SUPPLY', 'WITHDRAW');
  end if;
  if not exists (select 1 from pg_type where typname = 'shift_status') then
    create type shift_status as enum ('OPEN', 'CLOSED');
  end if;
  if not exists (select 1 from pg_type where typname = 'table_session_status') then
    create type table_session_status as enum ('OPEN', 'CLOSED');
  end if;
  if not exists (select 1 from pg_type where typname = 'stock_movement_type') then
    create type stock_movement_type as enum ('IN', 'OUT', 'ADJUST');
  end if;
end $$;

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true,
  fee_percent numeric(5,2) not null default 0,
  fee_fixed numeric(10,2) not null default 0,
  created_at timestamp with time zone not null default now()
);

insert into public.payment_methods (code, name, active)
values
  ('CASH', 'Dinheiro', true),
  ('PIX', 'PIX', true),
  ('CARD', 'Cartao', true)
on conflict (code) do nothing;

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  opened_at timestamp with time zone not null default now(),
  closed_at timestamp with time zone,
  status shift_status not null default 'OPEN',
  opened_by uuid references auth.users(id),
  closed_by uuid references auth.users(id),
  cash_register_id uuid references public.cash_registers(id),
  note_open text,
  note_close text
);

create unique index if not exists shifts_opened_by_open_idx
  on public.shifts (opened_by)
  where status = 'OPEN';

create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  sort_order integer not null default 0
);

create unique index if not exists tables_name_idx on public.tables (name);

create table if not exists public.table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables(id),
  opened_at timestamp with time zone not null default now(),
  closed_at timestamp with time zone,
  status table_session_status not null default 'OPEN',
  opened_by uuid references auth.users(id),
  closed_by uuid references auth.users(id)
);

create unique index if not exists table_sessions_open_idx
  on public.table_sessions (table_id)
  where status = 'OPEN';

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  cash_register_id uuid not null references public.cash_registers(id),
  shift_id uuid references public.shifts(id),
  type cash_movement_type not null,
  amount numeric(10,2) not null check (amount > 0),
  reason text not null,
  created_at timestamp with time zone not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  created_at timestamp with time zone not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  order_id uuid references public.orders(id) on delete set null,
  type stock_movement_type not null,
  quantity integer not null check (quantity > 0),
  reason text not null,
  created_at timestamp with time zone not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.orders
  add column if not exists order_type order_type not null default 'COUNTER',
  add column if not exists table_id uuid references public.tables(id),
  add column if not exists table_session_id uuid references public.table_sessions(id),
  add column if not exists shift_id uuid references public.shifts(id),
  add column if not exists operator_id uuid references auth.users(id),
  add column if not exists notes text,
  add column if not exists discount numeric(10,2) not null default 0,
  add column if not exists service_fee numeric(10,2) not null default 0;

alter table public.payments
  add column if not exists payment_method_id uuid references public.payment_methods(id),
  add column if not exists fee_amount numeric(10,2) not null default 0,
  add column if not exists reference text;

alter table public.products
  add column if not exists track_stock boolean not null default false,
  add column if not exists stock_qty integer not null default 0,
  add column if not exists min_stock integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_discount_non_negative'
  ) then
    alter table public.orders
      add constraint orders_discount_non_negative check (discount >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'orders_service_fee_non_negative'
  ) then
    alter table public.orders
      add constraint orders_service_fee_non_negative check (service_fee >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'payments_fee_non_negative'
  ) then
    alter table public.payments
      add constraint payments_fee_non_negative check (fee_amount >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'products_stock_non_negative'
  ) then
    alter table public.products
      add constraint products_stock_non_negative check (stock_qty >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'products_min_stock_non_negative'
  ) then
    alter table public.products
      add constraint products_min_stock_non_negative check (min_stock >= 0);
  end if;
end $$;

create index if not exists orders_status_created_idx
  on public.orders (status, created_at desc);
create index if not exists orders_shift_idx on public.orders (shift_id);
create index if not exists orders_table_idx on public.orders (table_id);
create index if not exists cash_movements_register_idx
  on public.cash_movements (cash_register_id, created_at desc);
create index if not exists order_events_order_idx
  on public.order_events (order_id, created_at desc);
create index if not exists payments_method_idx on public.payments (payment_method_id);
create index if not exists stock_movements_product_idx
  on public.stock_movements (product_id, created_at desc);

alter table public.payment_methods enable row level security;
alter table public.shifts enable row level security;
alter table public.tables enable row level security;
alter table public.table_sessions enable row level security;
alter table public.cash_movements enable row level security;
alter table public.order_events enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists "authenticated access" on public.payment_methods;
create policy "authenticated access" on public.payment_methods
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.shifts;
create policy "authenticated access" on public.shifts
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.tables;
create policy "authenticated access" on public.tables
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.table_sessions;
create policy "authenticated access" on public.table_sessions
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.cash_movements;
create policy "authenticated access" on public.cash_movements
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.order_events;
create policy "authenticated access" on public.order_events
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.stock_movements;
create policy "authenticated access" on public.stock_movements
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

