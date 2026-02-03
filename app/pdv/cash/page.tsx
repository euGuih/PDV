import { createClient } from "@/lib/supabase/server";
import { openCashRegister } from "./actions";
import CloseCashForm from "./close-cash-form";

export default async function CashPage() {
  const supabase = createClient();
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

  const totalPayments =
    payments?.reduce((acc, item) => acc + Number(item.amount), 0) ?? 0;
  const totalCashPayments =
    payments?.reduce(
      (acc, item) => acc + (item.method === "CASH" ? Number(item.amount) : 0),
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

      <div className="rounded border bg-neutral-50 p-4 text-sm">
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
      </div>

      <CloseCashForm
        openingAmount={Number(openRegister.opening_amount)}
        totalCashPayments={totalCashPayments}
      />
    </div>
  );
}


