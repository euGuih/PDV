"use client";

import { useMemo, useState } from "react";
import { saveCombo, toggleComboStatus } from "./actions";

type Combo = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  description: string | null;
  category_id: string | null;
  categories?: { name: string }[] | null;
};

type Product = {
  id: string;
  name: string;
  price: number;
};

type Category = {
  id: string;
  name: string;
};

type ComboItem = {
  combo_id: string;
  product_id: string;
  quantity: number;
};

type CombosManagerProps = {
  combos: Combo[];
  products: Product[];
  categories: Category[];
  comboItems: ComboItem[];
};

export default function CombosManager({
  combos,
  products,
  categories,
  comboItems,
}: CombosManagerProps) {
  const [editing, setEditing] = useState<Combo | null>(null);

  const comboItemsByCombo = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const item of comboItems) {
      const entry = map.get(item.combo_id) ?? {};
      entry[item.product_id] = item.quantity;
      map.set(item.combo_id, entry);
    }
    return map;
  }, [comboItems]);

  const selectedComboItems = editing
    ? comboItemsByCombo.get(editing.id) ?? {}
    : {};

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Combos cadastrados</h2>
        <div className="space-y-3">
          {combos.length === 0 && (
            <p className="text-sm text-neutral-500">Nenhum combo cadastrado.</p>
          )}
          {combos.map((combo) => (
            <div
              key={combo.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"
            >
              <div>
                <p className="font-medium">{combo.name}</p>
                <p className="text-xs text-neutral-500">
                  {combo.categories?.[0]?.name ?? "Sem categoria"} · R${" "}
                  {Number(combo.price).toFixed(2)}
                </p>
                <p className="text-xs text-neutral-500">
                  Status: {combo.active ? "Ativo" : "Inativo"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => setEditing(combo)}
                >
                  Editar
                </button>
                <form action={toggleComboStatus}>
                  <input type="hidden" name="comboId" value={combo.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={(!combo.active).toString()}
                  />
                  <button className="rounded border px-3 py-1 text-sm">
                    {combo.active ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded border p-4 space-y-4">
        <h3 className="text-base font-semibold">
          {editing ? "Editar combo" : "Novo combo"}
        </h3>
        <form className="space-y-3" action={saveCombo} onSubmit={() => setEditing(null)}>
          <input type="hidden" name="comboId" value={editing?.id ?? ""} />
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
              defaultValue={editing ? Number(editing.price).toFixed(2) : ""}
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

          <div className="rounded border p-3">
            <p className="text-sm font-semibold mb-2">Itens do combo</p>
            <div className="space-y-2">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm">
                    {product.name} · R$ {Number(product.price).toFixed(2)}
                  </span>
                  <input
                    className="w-20 rounded border px-2 py-1 text-sm"
                    name={`productQty_${product.id}`}
                    defaultValue={selectedComboItems[product.id] ?? 0}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Informe 0 para remover o item do combo.
            </p>
          </div>

          <button className="w-full rounded bg-black px-4 py-2 text-white">
            {editing ? "Salvar alterações" : "Cadastrar combo"}
          </button>
        </form>
      </div>
    </div>
  );
}

