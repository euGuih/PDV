-- Schema inicial do PDV MVP
create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'cash_register_status') then
    create type cash_register_status as enum ('OPEN', 'CLOSED');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum ('OPEN', 'PAID', 'CANCELED');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum ('CASH', 'PIX', 'CARD');
  end if;
end $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null,
  category_id uuid references public.categories(id),
  active boolean not null default true,
  description text
);

create table if not exists public.combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null,
  active boolean not null default true
);

create table if not exists public.combo_items (
  combo_id uuid not null references public.combos(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  primary key (combo_id, product_id)
);

create table if not exists public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  opened_at timestamp with time zone not null default now(),
  closed_at timestamp with time zone,
  opening_amount numeric(10,2) not null,
  closing_amount numeric(10,2),
  status cash_register_status not null default 'OPEN'
);

create unique index if not exists cash_registers_single_open_idx
  on public.cash_registers (status)
  where status = 'OPEN';

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  cash_register_id uuid not null references public.cash_registers(id),
  total numeric(10,2) not null,
  status order_status not null default 'OPEN',
  created_at timestamp with time zone not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  price numeric(10,2) not null
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method payment_method not null,
  amount numeric(10,2) not null check (amount > 0),
  created_at timestamp with time zone not null default now()
);


