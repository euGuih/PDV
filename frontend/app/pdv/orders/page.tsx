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

  const [
    categoriesResult,
    productsResult,
    combosResult,
    tableSessionsResult,
    modifierGroupsResult,
    modifiersResult,
    productModifierGroupsResult,
  ] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name")
        .eq("active", true)
        .order("name"),
      supabase
        .from("products")
        .select("id, name, price, category_id, active")
        .eq("active", true)
        .order("name"),
      supabase
        .from("combos")
        .select("id, name, price, category_id, active")
        .eq("active", true)
        .order("name"),
      supabase
        .from("table_sessions")
        .select("id, table_id, opened_at, status, tables(name)")
        .eq("status", "OPEN")
        .order("opened_at"),
      supabase
        .from("modifier_groups")
        .select("id, name, min_select, max_select, required, active")
        .eq("active", true)
        .order("name"),
      supabase
        .from("modifiers")
        .select("id, group_id, name, price, active")
        .eq("active", true)
        .order("name"),
      supabase
        .from("product_modifier_groups")
        .select("product_id, modifier_group_id, sort_order")
        .order("sort_order"),
    ]);

  const errors = [
    categoriesResult.error,
    productsResult.error,
    combosResult.error,
    tableSessionsResult.error,
    modifierGroupsResult.error,
    modifiersResult.error,
    productModifierGroupsResult.error,
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
      combos={combosResult.data ?? []}
      tableSessions={tableSessionsResult.data ?? []}
      modifierGroups={modifierGroupsResult.data ?? []}
      modifiers={modifiersResult.data ?? []}
      productModifierGroups={productModifierGroupsResult.data ?? []}
    />
  );
}

