"use client";

import { useState } from "react";
import { createCategory, saveProduct, toggleProductStatus } from "./actions";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  description: string | null;
  category_id: string | null;
  categories?: { name: string }[] | null;
  track_stock?: boolean;
  stock_qty?: number;
  min_stock?: number;
};

type ProductsManagerProps = {
  categories: Category[];
  products: Product[];
};

export default function ProductsManager({
  categories,
  products,
}: ProductsManagerProps) {
  const [editing, setEditing] = useState<Product | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Produtos</h2>
        <div className="space-y-3">
          {products.length === 0 && (
            <p className="text-sm text-neutral-500">Nenhum produto cadastrado.</p>
          )}
          {products.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between rounded border p-3"
            >
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-xs text-neutral-500">
                  {product.categories?.[0]?.name ?? "Sem categoria"} · R${" "}
                  {Number(product.price).toFixed(2)}
                </p>
                <p className="text-xs text-neutral-500">
                  Status: {product.active ? "Ativo" : "Inativo"}
                </p>
                <p className="text-xs text-neutral-500">
                  Estoque:{" "}
                  {product.track_stock
                    ? `${product.stock_qty ?? 0} (min ${product.min_stock ?? 0})`
                    : "Nao controlado"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => setEditing(product)}
                >
                  Editar
                </button>
                <form action={toggleProductStatus}>
                  <input type="hidden" name="productId" value={product.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={(!product.active).toString()}
                  />
                  <button className="rounded border px-3 py-1 text-sm">
                    {product.active ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded border p-4">
          <h3 className="text-base font-semibold">
            {editing ? "Editar produto" : "Novo produto"}
          </h3>
          <form
            className="mt-3 space-y-3"
            action={saveProduct}
            onSubmit={() => setEditing(null)}
          >
            <input type="hidden" name="productId" value={editing?.id ?? ""} />
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome</label>
              <input
                className="w-full rounded border px-3 py-2"
                name="name"
                defaultValue={editing?.name ?? ""}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Categoria</label>
              <select
                className="w-full rounded border px-3 py-2"
                name="categoryId"
                defaultValue={editing?.category_id ?? ""}
              >
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Preço</label>
              <input
                className="w-full rounded border px-3 py-2"
                name="price"
                defaultValue={
                  editing ? Number(editing.price).toFixed(2) : ""
                }
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Descrição</label>
              <textarea
                className="w-full rounded border px-3 py-2"
                name="description"
                defaultValue={editing?.description ?? ""}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Controle de estoque</label>
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="trackStock"
                  defaultChecked={editing?.track_stock ?? false}
                />
                <span>Controlar estoque</span>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Estoque atual</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  name="stockQty"
                  defaultValue={editing?.stock_qty ?? 0}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Estoque mínimo</label>
                <input
                  className="w-full rounded border px-3 py-2"
                  name="minStock"
                  defaultValue={editing?.min_stock ?? 0}
                  placeholder="0"
                />
              </div>
            </div>
            <button className="w-full rounded bg-black px-4 py-2 text-white">
              {editing ? "Salvar alterações" : "Cadastrar produto"}
            </button>
          </form>
        </div>

        <div className="rounded border p-4">
          <h3 className="text-base font-semibold">Nova categoria</h3>
          <form className="mt-3 space-y-3" action={createCategory}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome</label>
              <input
                className="w-full rounded border px-3 py-2"
                name="name"
                placeholder="Ex: Hambúrgueres"
                required
              />
            </div>
            <button className="w-full rounded border px-4 py-2">
              Criar categoria
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

