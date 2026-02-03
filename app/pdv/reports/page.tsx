import { createClient } from "@/lib/supabase/server";

type PaymentRow = {
  amount: number;
  method: "CASH" | "PIX" | "CARD";
  orders?: { cash_register_id: string };
};

type OrderItemRow = {
  product_id: string;
  quantity: number;
  price: number;
  products?: { name: string } | null;
};

export default async function ReportsPage() {
  const supabase = createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("amount, method, orders!inner(cash_register_id)");

  const totalSold =
    payments?.reduce((acc, item) => acc + Number(item.amount), 0) ?? 0;

  const totalsByMethod =
    payments?.reduce<Record<string, number>>((acc, item) => {
      acc[item.method] = (acc[item.method] ?? 0) + Number(item.amount);
      return acc;
    }, {}) ?? {};

  const { count: paidOrdersCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "PAID");

  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_id, quantity, price, products(name)");

  const productsReport = (orderItems as OrderItemRow[] | null)?.reduce(
    (acc, item) => {
      const entry = acc[item.product_id] ?? {
        name: item.products?.name ?? "Produto",
        quantity: 0,
        revenue: 0,
      };
      entry.quantity += Number(item.quantity);
      entry.revenue += Number(item.quantity) * Number(item.price);
      acc[item.product_id] = entry;
      return acc;
    },
    {} as Record<string, { name: string; quantity: number; revenue: number }>
  );

  const { data: cashRegisters } = await supabase
    .from("cash_registers")
    .select("id, opened_at, closed_at, opening_amount, closing_amount, status")
    .order("opened_at", { ascending: false })
    .limit(10);

  const paymentsByRegister = (payments as PaymentRow[] | null)?.reduce(
    (acc, item) => {
      const registerId = item.orders?.cash_register_id;
      if (!registerId) return acc;
      acc[registerId] = (acc[registerId] ?? 0) + Number(item.amount);
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm text-neutral-600">
          Visão geral das vendas e pagamentos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border p-4">
          <p className="text-sm text-neutral-500">Total vendido</p>
          <p className="text-xl font-semibold">R$ {totalSold.toFixed(2)}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-neutral-500">Pedidos pagos</p>
          <p className="text-xl font-semibold">{paidOrdersCount ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded border p-4">
          <h2 className="text-base font-semibold mb-3">
            Total por método de pagamento
          </h2>
          <div className="space-y-2 text-sm">
            {(["CASH", "PIX", "CARD"] as const).map((method) => (
              <div key={method} className="flex justify-between">
                <span>
                  {method === "CASH"
                    ? "Dinheiro"
                    : method === "PIX"
                    ? "PIX"
                    : "Cartão"}
                </span>
                <span>R$ {(totalsByMethod[method] ?? 0).toFixed(2)}</span>
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
    </div>
  );
}


