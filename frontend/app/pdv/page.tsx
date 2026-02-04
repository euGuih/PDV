import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PdvPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;
  const { data: openRegister } = await supabase
    .from("cash_registers")
    .select("id, opened_at")
    .eq("status", "OPEN")
    .maybeSingle();

  const { data: openShift } = await supabase
    .from("shifts")
    .select("id, opened_at")
    .eq("status", "OPEN")
    .eq("opened_by", userId ?? "")
    .maybeSingle();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data: todayPayments } = await supabase
    .from("payments")
    .select("amount, created_at")
    .gte("created_at", startOfDay.toISOString());

  const totalToday =
    todayPayments?.reduce((acc, payment) => acc + Number(payment.amount), 0) ?? 0;

  const cashOpen = Boolean(openRegister);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="rounded border bg-white p-6 shadow-sm space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">PDV</h1>
          <p className="text-sm text-neutral-600">
            Status do caixa:{" "}
            <span className={cashOpen ? "text-green-600" : "text-red-600"}>
              {cashOpen ? "ABERTO" : "FECHADO"}
            </span>
          </p>
          {cashOpen && (
            <p className="text-xs text-neutral-500">
              Aberto em {new Date(openRegister?.opened_at ?? "").toLocaleString()}
            </p>
          )}
          {openShift && (
            <p className="text-xs text-neutral-500">
              Turno atual iniciado em{" "}
              {new Date(openShift.opened_at).toLocaleString()}
            </p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded border p-3 text-sm">
            <p className="text-neutral-500">Vendas hoje</p>
            <p className="text-lg font-semibold">R$ {totalToday.toFixed(2)}</p>
          </div>
          <div className="rounded border p-3 text-sm">
            <p className="text-neutral-500">Turno</p>
            <p className="text-lg font-semibold">
              {openShift ? "Aberto" : "Fechado"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {!cashOpen && (
          <Link
            className="rounded border bg-black px-4 py-6 text-center text-white"
            href="/pdv/cash"
          >
            Abrir Caixa
          </Link>
        )}
        {cashOpen && (
          <Link
            className="rounded border bg-black px-4 py-6 text-center text-white"
            href="/pdv/orders"
          >
            Novo Pedido
          </Link>
        )}
        {cashOpen && (
          <Link
            className="rounded border px-4 py-6 text-center"
            href="/pdv/cash"
          >
            Fechar Caixa
          </Link>
        )}
        <Link
          className="rounded border px-4 py-6 text-center"
          href="/pdv/products"
        >
          Produtos
        </Link>
        <Link
          className="rounded border px-4 py-6 text-center"
          href="/pdv/combos"
        >
          Combos
        </Link>
        <Link
          className="rounded border px-4 py-6 text-center"
          href="/pdv/modifiers"
        >
          Adicionais
        </Link>
        <Link
          className="rounded border px-4 py-6 text-center"
          href="/pdv/tables"
        >
          Mesas
        </Link>
        <Link
          className="rounded border px-4 py-6 text-center"
          href="/pdv/shifts"
        >
          Turnos
        </Link>
        <Link
          className="rounded border px-4 py-6 text-center"
          href="/pdv/orders/history"
        >
          Historico de pedidos
        </Link>
        <Link
          className="rounded border px-4 py-6 text-center"
          href="/pdv/reports"
        >
          Relatórios
        </Link>
      </div>
    </div>
  );
}

