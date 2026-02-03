-- Hardening para produção (RLS, políticas e constraints)

drop table if exists public.users;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_price_non_negative'
  ) then
    alter table public.products
      add constraint products_price_non_negative check (price >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'orders_total_non_negative'
  ) then
    alter table public.orders
      add constraint orders_total_non_negative check (total >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'cash_registers_opening_non_negative'
  ) then
    alter table public.cash_registers
      add constraint cash_registers_opening_non_negative check (opening_amount >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'cash_registers_closing_non_negative'
  ) then
    alter table public.cash_registers
      add constraint cash_registers_closing_non_negative check (closing_amount >= 0);
  end if;
end $$;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.combos enable row level security;
alter table public.combo_items enable row level security;
alter table public.cash_registers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;

drop policy if exists "authenticated access" on public.categories;
create policy "authenticated access" on public.categories
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.products;
create policy "authenticated access" on public.products
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.combos;
create policy "authenticated access" on public.combos
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.combo_items;
create policy "authenticated access" on public.combo_items
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.cash_registers;
create policy "authenticated access" on public.cash_registers
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.orders;
create policy "authenticated access" on public.orders
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.order_items;
create policy "authenticated access" on public.order_items
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated access" on public.payments;
create policy "authenticated access" on public.payments
  for all to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

