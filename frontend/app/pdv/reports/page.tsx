import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PaymentRow = {
  amount: number;
  method: string;
  orders?: { cash_register_id: string };
};

type OrderItemRow = {
  id: string;
  item_name: string | null;
  item_type: "PRODUCT" | "COMBO";
  quantity: number;
  price: number;
};

type StockRow = {
  id: string;
  name: string;
  stock_qty: number;
  min_stock: number;
};

type CashMovementRow = {
  id: string;
  amount: number;
  type: "SUPPLY" | "WITHDRAW";
  created_at: string;
};

type ShiftRow = {
  id: string;
  opened_at: string;
  closed_at: string | null;
  status: "OPEN" | "CLOSED";
};

type ReportsPageProps = {
  searchParams: { from?: string; to?: string };
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const supabase = await createClient();
  const fromDate = searchParams.from ? new Date(searchParams.from) : null;
  const toDate = searchParams.to ? new Date(searchParams.to) : null;
  const fromIso = fromDate ? fromDate.toISOString() : null;
  const toIso = toDate ? new Date(toDate.setHours(23, 59, 59, 999)).toISOString() : null;

  let paymentsQuery = supabase
    .from("payments")
    .select("amount, method, orders!inner(cash_register_id), created_at");
  if (fromIso) paymentsQuery = paymentsQuery.gte("created_at", fromIso);
  if (toIso) paymentsQuery = paymentsQuery.lte("created_at", toIso);
  const { data: payments } = await paymentsQuery;

  const { data: paymentMethods } = await supabase
    .from("payment_methods")
    .select("code, name")
    .eq("active", true)
    .order("name");

  const totalSold =
    payments?.reduce((acc, item) => acc + Number(item.amount), 0) ?? 0;

  const totalsByMethod =
    payments?.reduce<Record<string, number>>((acc, item) => {
      acc[item.method] = (acc[item.method] ?? 0) + Number(item.amount);
      return acc;
    }, {}) ?? {};

  let paidOrdersQuery = supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "PAID");
  if (fromIso) paidOrdersQuery = paidOrdersQuery.gte("created_at", fromIso);
  if (toIso) paidOrdersQuery = paidOrdersQuery.lte("created_at", toIso);
  const { count: paidOrdersCount } = await paidOrdersQuery;

  let orderItemsQuery = supabase
    .from("order_items")
    .select("id, item_name, item_type, quantity, price, created_at");
  if (fromIso) orderItemsQuery = orderItemsQuery.gte("created_at", fromIso);
  if (toIso) orderItemsQuery = orderItemsQuery.lte("created_at", toIso);
  const { data: orderItems } = await orderItemsQuery;

  const productsReport = (orderItems as OrderItemRow[] | null)?.reduce(
    (acc, item) => {
      const key = `${item.item_type}-${item.item_name ?? "Item"}`;
      const entry = acc[key] ?? {
        name: item.item_name ?? "Item",
        quantity: 0,
        revenue: 0,
      };
      entry.quantity += Number(item.quantity);
      entry.revenue += Number(item.quantity) * Number(item.price);
      acc[key] = entry;
      return acc;
    },
    {} as Record<string, { name: string; quantity: number; revenue: number }>
  );

  let cashRegistersQuery = supabase
    .from("cash_registers")
    .select("id, opened_at, closed_at, opening_amount, closing_amount, status")
    .order("opened_at", { ascending: false })
    .limit(10);
  if (fromIso) cashRegistersQuery = cashRegistersQuery.gte("opened_at", fromIso);
  if (toIso) cashRegistersQuery = cashRegistersQuery.lte("opened_at", toIso);
  const { data: cashRegisters } = await cashRegistersQuery;

  let cashMovementsQuery = supabase
    .from("cash_movements")
    .select("id, amount, type, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (fromIso) cashMovementsQuery = cashMovementsQuery.gte("created_at", fromIso);
  if (toIso) cashMovementsQuery = cashMovementsQuery.lte("created_at", toIso);
  const { data: cashMovements } = await cashMovementsQuery;

  const totalSupply =
    (cashMovements as CashMovementRow[] | null)?.reduce(
      (acc, item) => acc + (item.type === "SUPPLY" ? Number(item.amount) : 0),
      0
    ) ?? 0;
  const totalWithdraw =
    (cashMovements as CashMovementRow[] | null)?.reduce(
      (acc, item) => acc + (item.type === "WITHDRAW" ? Number(item.amount) : 0),
      0
    ) ?? 0;

  let shiftsQuery = supabase
    .from("shifts")
    .select("id, opened_at, closed_at, status")
    .order("opened_at", { ascending: false })
    .limit(10);
  if (fromIso) shiftsQuery = shiftsQuery.gte("opened_at", fromIso);
  if (toIso) shiftsQuery = shiftsQuery.lte("opened_at", toIso);
  const { data: shifts } = await shiftsQuery;

  const openShiftsCount =
    (shifts as ShiftRow[] | null)?.filter((shift) => shift.status === "OPEN")
      .length ?? 0;

  const paymentsByRegister = (payments as PaymentRow[] | null)?.reduce(
    (acc, item) => {
      const registerId = item.orders?.cash_register_id;
      if (!registerId) return acc;
      acc[registerId] = (acc[registerId] ?? 0) + Number(item.amount);
      return acc;
    },
    {} as Record<string, number>
  );

  const { data: lowStock } = await supabase
    .from("products")
    .select("id, name, stock_qty, min_stock")
    .eq("track_stock", true)
    .order("stock_qty");

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm text-neutral-600">
          Visão geral das vendas e pagamentos.
        </p>
      </div>

      <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" method="get">
        <input
          className="rounded border px-3 py-2"
          type="date"
          name="from"
          defaultValue={searchParams.from ?? ""}
        />
        <input
          className="rounded border px-3 py-2"
          type="date"
          name="to"
          defaultValue={searchParams.to ?? ""}
        />
        <button className="rounded border px-4 py-2">Aplicar filtro</button>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border p-4">
          <p className="text-sm text-neutral-500">Total vendido</p>
          <p className="text-xl font-semibold">R$ {totalSold.toFixed(2)}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-neutral-500">Pedidos pagos</p>
          <p className="text-xl font-semibold">{paidOrdersCount ?? 0}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-neutral-500">Turnos abertos</p>
          <p className="text-xl font-semibold">{openShiftsCount}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded border p-4">
          <h2 className="text-base font-semibold mb-3">
            Total por método de pagamento
          </h2>
          <div className="space-y-2 text-sm">
            {(paymentMethods ?? []).map((method) => (
              <div key={method.code} className="flex justify-between">
                <span>{method.name}</span>
                <span>
                  R$ {(totalsByMethod[method.code] ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border p-4">
          <h2 className="text-base font-semibold mb-3">Vendas por produto</h2>
          <div className="space-y-2 text-sm">
            {!productsReport || Object.keys(productsReport).length === 0 ? (
              <p className="text-neutral-500">Sem vendas registradas.</p>
            ) : (
              Object.values(productsReport).map((entry) => (
                <div
                  key={entry.name}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p>{entry.name}</p>
                    <p className="text-xs text-neutral-500">
                      {entry.quantity} un.
                    </p>
                  </div>
                  <span>R$ {entry.revenue.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded border p-4">
        <h2 className="text-base font-semibold mb-3">Alertas de estoque</h2>
        <div className="space-y-2 text-sm">
          {(lowStock as StockRow[] | null)?.length ? (
            (lowStock as StockRow[])
              .filter((item) => Number(item.stock_qty) <= Number(item.min_stock))
              .slice(0, 8)
              .map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.name}</span>
                  <span>
                    {item.stock_qty} / {item.min_stock}
                  </span>
                </div>
              ))
          ) : (
            <p className="text-neutral-500">Nenhum alerta.</p>
          )}
        </div>
      </div>

      <div className="rounded border p-4">
        <h2 className="text-base font-semibold mb-3">Relatório por caixa</h2>
        <div className="space-y-2 text-sm">
          {cashRegisters?.length ? (
            cashRegisters.map((register) => (
              <div
                key={register.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 last:border-b-0"
              >
                <div>
                  <p>
                    {new Date(register.opened_at).toLocaleString()} ·{" "}
                    {register.status === "OPEN" ? "Aberto" : "Fechado"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Abertura: R$ {Number(register.opening_amount).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p>
                    Total vendas: R${" "}
                    {(paymentsByRegister?.[register.id] ?? 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Fechamento: R${" "}
                    {register.closing_amount
                      ? Number(register.closing_amount).toFixed(2)
                      : "--"}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-neutral-500">Nenhum caixa registrado.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded border p-4">
          <h2 className="text-base font-semibold mb-3">Movimentos de caixa</h2>
          <div className="space-y-2 text-sm">
            <p>
              Reforcos: <span className="font-semibold">R$ {totalSupply.toFixed(2)}</span>
            </p>
            <p>
              Sangrias:{" "}
              <span className="font-semibold">R$ {totalWithdraw.toFixed(2)}</span>
            </p>
            {cashMovements?.length ? (
              cashMovements.slice(0, 8).map((movement) => (
                <div key={movement.id} className="flex justify-between">
                  <span>
                    {movement.type === "SUPPLY" ? "Reforco" : "Sangria"} ·{" "}
                    {new Date(movement.created_at).toLocaleDateString()}
                  </span>
                  <span>R$ {Number(movement.amount).toFixed(2)}</span>
                </div>
              ))
            ) : (
              <p className="text-neutral-500">Nenhum movimento registrado.</p>
            )}
          </div>
        </div>

        <div className="rounded border p-4">
          <h2 className="text-base font-semibold mb-3">Ultimos turnos</h2>
          <div className="space-y-2 text-sm">
            {shifts?.length ? (
              shifts.map((shift) => (
                <div key={shift.id} className="flex justify-between">
                  <span>
                    {new Date(shift.opened_at).toLocaleDateString()} ·{" "}
                    {shift.status === "OPEN" ? "Aberto" : "Fechado"}
                  </span>
                  <span>
                    {shift.closed_at
                      ? new Date(shift.closed_at).toLocaleTimeString()
                      : "--"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-neutral-500">Nenhum turno registrado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

