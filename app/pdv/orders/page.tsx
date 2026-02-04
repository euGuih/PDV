import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrderBuilder from "./order-builder";

export default async function OrdersPage() {
  const hasSupabaseEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasSupabaseEnv) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Novo pedido</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Configuração do Supabase ausente. Verifique as variáveis de ambiente.
        </p>
      </div>
    );
  }

  const fallback = (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Novo pedido</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Não foi possível carregar os dados do pedido. Tente novamente.
      </p>
    </div>
  );

  try {
    const supabase = createClient();
    const { data: openRegister, error: openRegisterError } = await supabase
      .from("cash_registers")
      .select("id")
      .eq("status", "OPEN")
      .maybeSingle();

    if (openRegisterError) {
      throw openRegisterError;
    }

    if (!openRegister) {
      redirect("/pdv");
    }

    const [
      { data: categories, error: categoriesError },
      { data: products, error: productsError },
    ] = await Promise.all([
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
    ]);

    if (categoriesError || productsError) {
      throw categoriesError ?? productsError;
    }

    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Novo pedido</h1>
          <p className="text-sm text-neutral-600">
            Toque nos produtos para adicionar ao pedido.
          </p>
        </div>
        <OrderBuilder
          categories={categories ?? []}
          products={products ?? []}
        />
      </div>
    );
  } catch (error) {
    console.error("Falha ao carregar /pdv/orders:", error);
    return fallback;
  }
}


