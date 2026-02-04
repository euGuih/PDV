import { createClient } from "@/lib/supabase/server";
import { createCashMovement, openCashRegister } from "./actions";
import CloseCashForm from "./close-cash-form";

export const dynamic = "force-dynamic";

export default async function CashPage() {
  const supabase = await createClient();
  const { data: openRegister } = await supabase
    .from("cash_registers")
    .select("id, opening_amount, opened_at")
    .eq("status", "OPEN")
    .maybeSingle();

  if (!openRegister) {
    return (
      <div className="mx-auto max-w-xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Abrir caixa</h1>
          <p className="text-sm text-neutral-600">
            Informe o valor inicial em dinheiro.
          </p>
        </div>
        <form className="space-y-4" action={openCashRegister}>
          <div className="space-y-1">
            <label className="text-sm font-medium">Valor inicial</label>
            <input
              className="w-full rounded border px-3 py-2"
              name="openingAmount"
              placeholder="0,00"
            />
          </div>
          <div className="flex gap-3">
            <button className="rounded bg-black px-4 py-2 text-white">
              Confirmar abertura
            </button>
            <a
              className="rounded border px-4 py-2 text-center"
              href="/pdv"
            >
              Cancelar
            </a>
          </div>
        </form>
      </div>
    );
  }

  const { data: payments } = await supabase
    .from("payments")
    .select("amount, method, orders!inner(cash_register_id)")
    .eq("orders.cash_register_id", openRegister.id);

  const paymentsByMethod =
    payments?.reduce<Record<string, number>>((acc, item) => {
      acc[item.method] = (acc[item.method] ?? 0) + Number(item.amount);
      return acc;
    }, {}) ?? {};

  const { data: movements } = await supabase
    .from("cash_movements")
    .select("id, type, amount, reason, created_at")
    .eq("cash_register_id", openRegister.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const totalPayments =
    payments?.reduce((acc, item) => acc + Number(item.amount), 0) ?? 0;
  const totalCashPayments =
    payments?.reduce(
      (acc, item) => acc + (item.method === "CASH" ? Number(item.amount) : 0),
      0
    ) ?? 0;
  const totalSupply =
    movements?.reduce(
      (acc, item) => acc + (item.type === "SUPPLY" ? Number(item.amount) : 0),
      0
    ) ?? 0;
  const totalWithdraw =
    movements?.reduce(
      (acc, item) => acc + (item.type === "WITHDRAW" ? Number(item.amount) : 0),
      0
    ) ?? 0;

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Fechar caixa</h1>
        <p className="text-sm text-neutral-600">
          Caixa aberto desde {new Date(openRegister.opened_at).toLocaleString()}.
        </p>
      </div>

      <div className="rounded border bg-neutral-50 p-4 text-sm space-y-1">
        <p>
          Valor de abertura:{" "}
          <span className="font-semibold">
            R$ {Number(openRegister.opening_amount).toFixed(2)}
          </span>
        </p>
        <p>
          Total vendido:{" "}
          <span className="font-semibold">R$ {totalPayments.toFixed(2)}</span>
        </p>
        <p>
          Total em dinheiro:{" "}
          <span className="font-semibold">
            R$ {totalCashPayments.toFixed(2)}
          </span>
        </p>
        <div className="pt-2 text-xs text-neutral-500">
          <p className="font-medium text-neutral-600">Resumo por metodo</p>
          {Object.entries(paymentsByMethod).map(([method, amount]) => (
            <p key={method}>
              {method}: R$ {Number(amount).toFixed(2)}
            </p>
          ))}
        </div>
        <p>
          Reforcos:{" "}
          <span className="font-semibold">R$ {totalSupply.toFixed(2)}</span>
        </p>
        <p>
          Sangrias:{" "}
          <span className="font-semibold">R$ {totalWithdraw.toFixed(2)}</span>
        </p>
      </div>

      <div className="rounded border p-4">
        <h2 className="text-base font-semibold mb-3">Movimentacao de caixa</h2>
        <form className="grid gap-3 md:grid-cols-3" action={createCashMovement}>
          <select className="rounded border px-3 py-2" name="type" required>
            <option value="SUPPLY">Reforco</option>
            <option value="WITHDRAW">Sangria</option>
          </select>
          <input
            className="rounded border px-3 py-2"
            name="amount"
            placeholder="0,00"
            required
          />
          <input
            className="rounded border px-3 py-2 md:col-span-3"
            name="reason"
            placeholder="Motivo"
            required
          />
          <button className="rounded bg-black px-4 py-2 text-white md:col-span-3">
            Registrar movimento
          </button>
        </form>
        <div className="mt-4 space-y-2 text-sm">
          {movements?.length ? (
            movements.map((movement) => (
              <div
                key={movement.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 last:border-b-0"
              >
                <div>
                  <p>
                    {movement.type === "SUPPLY" ? "Reforco" : "Sangria"} ·{" "}
                    {new Date(movement.created_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-neutral-500">{movement.reason}</p>
                </div>
                <p className="font-medium">R$ {Number(movement.amount).toFixed(2)}</p>
              </div>
            ))
          ) : (
            <p className="text-neutral-500">Sem movimentos registrados.</p>
          )}
        </div>
      </div>

      <CloseCashForm
        openingAmount={Number(openRegister.opening_amount)}
        totalCashPayments={totalCashPayments + totalSupply - totalWithdraw}
      />
    </div>
  );
}

