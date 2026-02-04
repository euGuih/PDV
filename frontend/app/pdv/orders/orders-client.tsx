"use client";

import OrderBuilder from "./order-builder";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
};

type Combo = {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
};

type ModifierGroup = {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  active: boolean;
};

type Modifier = {
  id: string;
  group_id: string;
  name: string;
  price: number;
  active: boolean;
};

type ProductModifierGroup = {
  product_id: string;
  modifier_group_id: string;
  sort_order: number;
};

type TableSession = {
  id: string;
  table_id: string;
  opened_at: string;
  status: "OPEN" | "CLOSED";
  tables?: { name: string }[] | null;
};

type OrdersClientProps = {
  categories: Category[];
  products: Product[];
  combos: Combo[];
  tableSessions: TableSession[];
  modifierGroups: ModifierGroup[];
  modifiers: Modifier[];
  productModifierGroups: ProductModifierGroup[];
};

export default function OrdersClient({
  categories,
  products,
  combos,
  tableSessions,
  modifierGroups,
  modifiers,
  productModifierGroups,
}: OrdersClientProps) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Novo pedido</h1>
        <p className="text-sm text-neutral-600">
          Toque nos produtos para adicionar ao pedido.
        </p>
      </div>
      <OrderBuilder
        categories={categories}
        products={products}
        combos={combos}
        tableSessions={tableSessions}
        modifierGroups={modifierGroups}
        modifiers={modifiers}
        productModifierGroups={productModifierGroups}
      />
    </div>
  );
}

