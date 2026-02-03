import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PdvPage() {
  const supabase = createClient();
  const { data: openRegister } = await supabase
    .from("cash_registers")
    .select("id, opened_at")
    .eq("status", "OPEN")
    .maybeSingle();

  const cashOpen = Boolean(openRegister);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="rounded border bg-white p-6 shadow-sm">
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
          href="/pdv/reports"
        >
          Relatórios
        </Link>
      </div>
    </div>
  );
}

