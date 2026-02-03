import { createClient } from "@/lib/supabase/server";
import ProductsManager from "./products-manager";

export default async function ProductsPage() {
  const supabase = createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, active, description, category_id, categories(name)")
    .order("name");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Produtos</h1>
        <p className="text-sm text-neutral-600">
          Cadastre, edite e ative/desative produtos.
        </p>
      </div>
      <ProductsManager categories={categories ?? []} products={products ?? []} />
    </div>
  );
}

