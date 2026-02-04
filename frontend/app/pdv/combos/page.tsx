import { createClient } from "@/lib/supabase/server";
import CombosManager from "./combos-manager";

export const dynamic = "force-dynamic";

type ComboRow = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  description: string | null;
  category_id: string | null;
  categories?: { name: string }[] | null;
};

type ProductRow = {
  id: string;
  name: string;
  price: number;
};

type CategoryRow = {
  id: string;
  name: string;
};

type ComboItemRow = {
  combo_id: string;
  product_id: string;
  quantity: number;
};

export default async function CombosPage() {
  const supabase = await createClient();

  const [combosResult, productsResult, categoriesResult, comboItemsResult] =
    await Promise.all([
      supabase
        .from("combos")
        .select("id, name, price, active, description, category_id, categories(name)")
        .order("name"),
      supabase
        .from("products")
        .select("id, name, price")
        .eq("active", true)
        .order("name"),
      supabase
        .from("categories")
        .select("id, name")
        .eq("active", true)
        .order("name"),
      supabase
        .from("combo_items")
        .select("combo_id, product_id, quantity"),
    ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Combos</h1>
        <p className="text-sm text-neutral-600">
          Cadastre combos e seus itens obrigatórios.
        </p>
      </div>

      <CombosManager
        combos={(combosResult.data ?? []) as ComboRow[]}
        products={(productsResult.data ?? []) as ProductRow[]}
        categories={(categoriesResult.data ?? []) as CategoryRow[]}
        comboItems={(comboItemsResult.data ?? []) as ComboItemRow[]}
      />
    </div>
  );
}

