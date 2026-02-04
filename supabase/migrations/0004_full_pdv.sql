-- Expansao completa do PDV: formas de pagamento, combos e modificadores

do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'DEBIT' and enumtypid = 'payment_method'::regtype
  ) then
    alter type payment_method add value 'DEBIT';
  end if;
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'CREDIT' and enumtypid = 'payment_method'::regtype
  ) then
    alter type payment_method add value 'CREDIT';
  end if;
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'VOUCHER' and enumtypid = 'payment_method'::regtype
  ) then
    alter type payment_method add value 'VOUCHER';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_item_type') then
    create type order_item_type as enum ('PRODUCT', 'COMBO');
  end if;
end $$;

alter table public.cash_registers
  add column if not exists opened_by uuid references auth.users(id),
  add column if not exists closed_by uuid references auth.users(id);

alter table public.orders
  add column if not exists subtotal numeric(10,2) not null default 0,
  add column if not exists discount_type text not null default 'NONE',
  add column if not exists discount_value numeric(10,2) not null default 0,
  add column if not exists service_fee_type text not null default 'NONE',
  add column if not exists service_fee_value numeric(10,2) not null default 0;

alter table public.combos
  add column if not exists category_id uuid references public.categories(id),
  add column if not exists description text;

alter table public.order_items
  add column if not exists combo_id uuid references public.combos(id),
  add column if not exists item_type order_item_type not null default 'PRODUCT',
  add column if not exists item_name text,
  add column if not exists notes text,
  add column if not exists client_reference text,
  add column if not exists created_at timestamp with time zone not null default now();

alter table public.order_items
  alter column product_id drop not null;

alter table public.payments
  add column if not exists received_amount numeric(10,2),
  add column if not exists change_amount numeric(10,2) not null default 0;

create table if not exists public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_select integer not null default 0,
  max_select integer not null default 0,
  required boolean not null default false,
  active boolean not null default true,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.modifiers (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.modifier_groups(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.product_modifier_groups (
  product_id uuid not null references public.products(id) on delete cascade,
  modifier_group_id uuid not null references public.modifier_groups(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (product_id, modifier_group_id)
);

create table if not exists public.order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  modifier_id uuid not null references public.modifiers(id),
  quantity integer not null check (quantity > 0),
  price numeric(10,2) not null default 0
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_items_product_or_combo'
  ) then
    alter table public.order_items
      add constraint order_items_product_or_combo
      check (
        (product_id is not null and combo_id is null)
        or (product_id is null and combo_id is not null)
      );
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'orders_subtotal_non_negative'
  ) then
    alter table public.orders
      add constraint orders_subtotal_non_negative check (subtotal >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'orders_discount_value_non_negative'
  ) then
    alter table public.orders
      add constraint orders_discount_value_non_negative check (discount_value >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'orders_service_fee_value_non_negative'
  ) then
    alter table public.orders
      add constraint orders_service_fee_value_non_negative check (service_fee_value >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'modifiers_price_non_negative'
  ) then
    alter table public.modifiers
      add constraint modifiers_price_non_negative check (price >= 0);
  end if;
end $$;

create index if not exists modifiers_group_idx on public.modifiers (group_id);
create index if not exists product_modifier_groups_product_idx
  on public.product_modifier_groups (product_id, sort_order);
create index if not exists order_item_modifiers_item_idx
  on public.order_item_modifiers (order_item_id);

insert into public.payment_methods (code, name, active)
values
  ('DEBIT', 'Cartao debito', true),
  ('CREDIT', 'Cartao credito', true),
  ('VOUCHER', 'Vale/Ticket', true)
on conflict (code) do nothing;

update public.payment_methods set active = false where code = 'CARD';

alter table public.modifier_groups enable row level security;
alter table public.modifiers enable row level security;
alter table public.product_modifier_groups enable row level security;
alter table public.order_item_modifiers enable row level security;

drop policy if exists "authenticated access" on public.modifier_groups;
create policy "authenticated access" on public.modifier_groups
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.modifiers;
create policy "authenticated access" on public.modifiers
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.product_modifier_groups;
create policy "authenticated access" on public.product_modifier_groups
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.order_item_modifiers;
create policy "authenticated access" on public.order_item_modifiers
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

