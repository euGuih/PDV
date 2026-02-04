import { createClient } from "@/lib/supabase/server";
import ModifiersManager from "./modifiers-manager";

export const dynamic = "force-dynamic";

type ModifierGroupRow = {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  active: boolean;
};

type ModifierRow = {
  id: string;
  group_id: string;
  name: string;
  price: number;
  active: boolean;
};

type ProductRow = {
  id: string;
  name: string;
};

type ProductModifierGroupRow = {
  product_id: string;
  modifier_group_id: string;
};

export default async function ModifiersPage() {
  const supabase = await createClient();

  const [groupsResult, modifiersResult, productsResult, relationsResult] =
    await Promise.all([
      supabase
        .from("modifier_groups")
        .select("id, name, min_select, max_select, required, active")
        .order("name"),
      supabase
        .from("modifiers")
        .select("id, group_id, name, price, active")
        .order("name"),
      supabase
        .from("products")
        .select("id, name")
        .eq("active", true)
        .order("name"),
      supabase
        .from("product_modifier_groups")
        .select("product_id, modifier_group_id"),
    ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Adicionais e modificadores</h1>
        <p className="text-sm text-neutral-600">
          Configure grupos, adicionais e vincule aos produtos.
        </p>
      </div>

      <ModifiersManager
        groups={(groupsResult.data ?? []) as ModifierGroupRow[]}
        modifiers={(modifiersResult.data ?? []) as ModifierRow[]}
        products={(productsResult.data ?? []) as ProductRow[]}
        relations={(relationsResult.data ?? []) as ProductModifierGroupRow[]}
      />
    </div>
  );
}

