"use client";

import { useMemo, useState } from "react";
import { createOrder } from "./actions";

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

type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

type OrderBuilderProps = {
  categories: Category[];
  products: Product[];
  tableSessions: TableSession[];
};

export default function OrderBuilder({
  categories,
  products,
  tableSessions,
}: OrderBuilderProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | "ALL">("ALL");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [orderType, setOrderType] = useState<"COUNTER" | "TABLE">("COUNTER");
  const [tableSessionId, setTableSessionId] = useState<string>("");

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "ALL") return products;
    return products.filter((product) => product.category_id === selectedCategory);
  }, [products, selectedCategory]);

  const total = useMemo(
    () => items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items]
  );

  const addProduct = (product: Product) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1,
        },
      ];
    });
  };

  const increment = (productId: string) => {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decrement = (productId: string) => {
    setItems((current) =>
      current
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  };

  const payload = JSON.stringify({
    items: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
    orderType,
    tableSessionId: orderType === "TABLE" ? tableSessionId : null,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr_320px]">
      <div className="space-y-2">
        <button
          className={`w-full rounded px-3 py-2 text-left ${
            selectedCategory === "ALL"
              ? "bg-black text-white"
              : "border text-neutral-700"
          }`}
          onClick={() => setSelectedCategory("ALL")}
        >
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            className={`w-full rounded px-3 py-2 text-left ${
              selectedCategory === category.id
                ? "bg-black text-white"
                : "border text-neutral-700"
            }`}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filteredProducts.map((product) => (
          <button
            key={product.id}
            className="rounded border bg-white p-4 text-left shadow-sm"
            onClick={() => addProduct(product)}
          >
            <p className="text-sm text-neutral-500">R$ {product.price.toFixed(2)}</p>
            <p className="text-base font-semibold">{product.name}</p>
          </button>
        ))}
      </div>

      <div className="space-y-4 rounded border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pedido atual</h2>
          <button className="text-sm text-red-600" onClick={() => setItems([])}>
            Cancelar
          </button>
        </div>

        <div className="space-y-2 rounded border p-3 text-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`rounded px-3 py-1 ${
                orderType === "COUNTER"
                  ? "bg-black text-white"
                  : "border text-neutral-700"
              }`}
              onClick={() => setOrderType("COUNTER")}
            >
              Balcao
            </button>
            <button
              type="button"
              className={`rounded px-3 py-1 ${
                orderType === "TABLE"
                  ? "bg-black text-white"
                  : "border text-neutral-700"
              }`}
              onClick={() => setOrderType("TABLE")}
            >
              Mesa
            </button>
          </div>
          {orderType === "TABLE" && (
            <div className="space-y-1">
              <label className="text-xs font-medium">Mesa ativa</label>
              <select
                className="w-full rounded border px-2 py-1"
                value={tableSessionId}
                onChange={(event) => setTableSessionId(event.target.value)}
              >
                <option value="">Selecione a mesa</option>
                {tableSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.tables?.[0]?.name ?? "Mesa"} ·{" "}
                    {new Date(session.opened_at).toLocaleTimeString()}
                  </option>
                ))}
              </select>
              {tableSessions.length === 0 && (
                <p className="text-xs text-neutral-500">
                  Nenhuma mesa aberta. Abra em Mesas.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-neutral-500">Nenhum item adicionado.</p>
          )}
          {items.map((item) => (
            <div key={item.productId} className="space-y-1 border-b pb-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{item.name}</p>
                <button
                  className="text-xs text-red-600"
                  onClick={() => removeItem(item.productId)}
                >
                  Remover
                </button>
              </div>
              <p className="text-xs text-neutral-500">
                R$ {item.price.toFixed(2)} x {item.quantity}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="h-8 w-8 rounded border"
                  onClick={() => decrement(item.productId)}
                >
                  -
                </button>
                <span className="min-w-[24px] text-center">{item.quantity}</span>
                <button
                  className="h-8 w-8 rounded border"
                  onClick={() => increment(item.productId)}
                >
                  +
                </button>
                <span className="ml-auto text-sm font-semibold">
                  R$ {(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded border bg-neutral-50 p-3 text-sm">
          <p className="flex items-center justify-between">
            <span>Total</span>
            <span className="text-base font-semibold">R$ {total.toFixed(2)}</span>
          </p>
        </div>

        <form action={createOrder} className="space-y-2">
          <input type="hidden" name="orderPayload" value={payload} />
          <button
            className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            disabled={
              items.length === 0 || (orderType === "TABLE" && !tableSessionId)
            }
          >
            Ir para Pagamento
          </button>
        </form>
      </div>
    </div>
  );
}

