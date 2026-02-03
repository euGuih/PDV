import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrdersClient from "./orders-client";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Configuração pendente</h1>
        <p className="text-sm text-neutral-600">
          Defina as variáveis NEXT_PUBLIC_SUPABASE_URL e
          NEXT_PUBLIC_SUPABASE_ANON_KEY para continuar.
        </p>
      </div>
    );
  }

  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error("Falha ao inicializar Supabase no PDV:", error);
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Erro ao carregar</h1>
        <p className="text-sm text-neutral-600">
          Não foi possível conectar ao Supabase. Verifique as configurações e
          tente novamente.
        </p>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Erro ao carregar</h1>
        <p className="text-sm text-neutral-600">
          Não foi possível iniciar a conexão com o Supabase. Tente novamente.
        </p>
      </div>
    );
  }

  const { data: openRegister, error: openRegisterError } = await supabase
    .from("cash_registers")
    .select("id")
    .eq("status", "OPEN")
    .maybeSingle();

  if (openRegisterError) {
    console.error("Erro ao consultar caixa aberto:", openRegisterError);
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Erro ao carregar</h1>
        <p className="text-sm text-neutral-600">
          Não foi possível validar o caixa. Tente novamente.
        </p>
      </div>
    );
  }

  if (!openRegister) {
    redirect("/pdv");
  }

  const [categoriesResult, productsResult, tableSessionsResult] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name")
        .eq("active", true)
        .order("name"),
      supabase
        .from("products")
        .select("id, name, price, category_id")
        .eq("active", true)
        .order("name"),
      supabase
        .from("table_sessions")
        .select("id, table_id, opened_at, status, tables(name)")
        .eq("status", "OPEN")
        .order("opened_at"),
    ]);

  const errors = [
    categoriesResult.error,
    productsResult.error,
    tableSessionsResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error("Erro ao carregar dados do pedido:", errors);
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Erro ao carregar</h1>
        <p className="text-sm text-neutral-600">
          Não foi possível carregar os dados do pedido. Tente novamente.
        </p>
      </div>
    );
  }

  return (
    <OrdersClient
      categories={categoriesResult.data ?? []}
      products={productsResult.data ?? []}
      tableSessions={tableSessionsResult.data ?? []}
    />
  );
}

