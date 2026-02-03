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
  tableSessions: TableSession[];
};

export default function OrdersClient({
  categories,
  products,
  tableSessions,
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
        tableSessions={tableSessions}
      />
    </div>
  );
}

