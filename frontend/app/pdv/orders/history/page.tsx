import { createClient } from "@/lib/supabase/server";
import { cancelOrder } from "../actions";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  created_at: string;
  status: "OPEN" | "PAID" | "CANCELED";
  total: number;
  order_type: "COUNTER" | "TABLE";
  tables?: { name: string }[] | null;
};

type PaymentRow = {
  order_id: string;
  amount: number;
};

export default async function OrdersHistoryPage() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, created_at, status, total, order_type, tables(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  const ordersList = (orders ?? []) as OrderRow[];
  const orderIds = ordersList.map((order) => order.id);

  const { data: payments } = await supabase
    .from("payments")
    .select("order_id, amount")
    .in("order_id", orderIds);

  const paidByOrder = (payments as PaymentRow[] | null)?.reduce(
    (acc, payment) => {
      acc[payment.order_id] =
        (acc[payment.order_id] ?? 0) + Number(payment.amount);
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Historico de pedidos</h1>
        <p className="text-sm text-neutral-600">
          Ultimos pedidos e status de pagamento.
        </p>
      </div>

      <div className="rounded border p-4">
        <div className="space-y-3 text-sm">
          {ordersList.length ? (
            ordersList.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-b-0"
              >
                <div>
                  <p className="font-medium">
                    {new Date(order.created_at).toLocaleString()} ·{" "}
                    {order.order_type === "TABLE" ? "Mesa" : "Balcao"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Status: {order.status}
                    {order.tables?.[0]?.name ? ` · ${order.tables[0].name}` : ""}
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <div>
                    <p className="font-medium">
                      R$ {Number(order.total).toFixed(2)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Pago: R$ {(paidByOrder?.[order.id] ?? 0).toFixed(2)}
                    </p>
                  </div>
                  {order.status === "OPEN" && (
                    <form className="flex flex-col gap-2" action={cancelOrder}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <input
                        className="rounded border px-2 py-1 text-xs"
                        name="reason"
                        placeholder="Motivo do cancelamento"
                        required
                      />
                      <button className="rounded border px-2 py-1 text-xs text-red-600">
                        Cancelar pedido
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-neutral-500">Nenhum pedido encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}

