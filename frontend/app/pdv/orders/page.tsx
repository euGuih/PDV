import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OrderBuilder from "./order-builder";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: openRegister } = await supabase
    .from("cash_registers")
    .select("id")
    .eq("status", "OPEN")
    .maybeSingle();

  if (!openRegister) {
    redirect("/pdv");
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("active", true)
    .order("name");

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, category_id")
    .eq("active", true)
    .order("name");

  const { data: tableSessions } = await supabase
    .from("table_sessions")
    .select("id, table_id, opened_at, status, tables(name)")
    .eq("status", "OPEN")
    .order("opened_at");

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
        tableSessions={tableSessions ?? []}
      />
    </div>
  );
}

