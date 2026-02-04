"use client";

import { useMemo, useState } from "react";
import {
  assignGroupToProducts,
  saveModifier,
  saveModifierGroup,
  toggleModifierGroupStatus,
  toggleModifierStatus,
} from "./actions";

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

type Product = {
  id: string;
  name: string;
};

type Relation = {
  product_id: string;
  modifier_group_id: string;
};

type ModifiersManagerProps = {
  groups: ModifierGroup[];
  modifiers: Modifier[];
  products: Product[];
  relations: Relation[];
};

export default function ModifiersManager({
  groups,
  modifiers,
  products,
  relations,
}: ModifiersManagerProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    groups[0]?.id ?? ""
  );
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null);

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? null;

  const groupModifiers = useMemo(
    () => modifiers.filter((modifier) => modifier.group_id === selectedGroupId),
    [modifiers, selectedGroupId]
  );

  const assignedProducts = useMemo(() => {
    const set = new Set(
      relations
        .filter((rel) => rel.modifier_group_id === selectedGroupId)
        .map((rel) => rel.product_id)
    );
    return set;
  }, [relations, selectedGroupId]);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Grupos</h2>
        <div className="space-y-2">
          {groups.map((group) => (
            <button
              key={group.id}
              className={`w-full rounded border px-3 py-2 text-left ${
                selectedGroupId === group.id
                  ? "bg-black text-white"
                  : "text-neutral-700"
              }`}
              onClick={() => {
                setSelectedGroupId(group.id);
                setEditingGroup(null);
                setEditingModifier(null);
              }}
            >
              <p className="font-medium">{group.name}</p>
              <p className="text-xs text-neutral-400">
                {group.required ? "Obrigatório" : "Opcional"} · min{" "}
                {group.min_select} / max {group.max_select}
              </p>
            </button>
          ))}
        </div>

        <div className="rounded border p-3 space-y-3">
          <h3 className="text-sm font-semibold">
            {editingGroup ? "Editar grupo" : "Novo grupo"}
          </h3>
          <form
            className="space-y-2"
            action={saveModifierGroup}
            onSubmit={() => setEditingGroup(null)}
          >
            <input type="hidden" name="groupId" value={editingGroup?.id ?? ""} />
            <div className="space-y-1">
              <label className="text-xs font-medium">Nome</label>
              <input
                className="w-full rounded border px-2 py-1 text-sm"
                name="name"
                defaultValue={editingGroup?.name ?? ""}
                required
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Min</label>
                <input
                  className="w-full rounded border px-2 py-1 text-sm"
                  name="minSelect"
                  defaultValue={editingGroup?.min_select ?? 0}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Max</label>
                <input
                  className="w-full rounded border px-2 py-1 text-sm"
                  name="maxSelect"
                  defaultValue={editingGroup?.max_select ?? 0}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                name="required"
                defaultChecked={editingGroup?.required ?? false}
              />
              Obrigatório
            </label>
            <button className="w-full rounded bg-black px-3 py-2 text-xs text-white">
              {editingGroup ? "Salvar grupo" : "Criar grupo"}
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              Adicionais {selectedGroup ? `· ${selectedGroup.name}` : ""}
            </h2>
            {selectedGroup && (
              <form action={toggleModifierGroupStatus}>
                <input type="hidden" name="groupId" value={selectedGroup.id} />
                <input
                  type="hidden"
                  name="active"
                  value={(!selectedGroup.active).toString()}
                />
                <button className="rounded border px-3 py-1 text-xs">
                  {selectedGroup.active ? "Desativar grupo" : "Ativar grupo"}
                </button>
              </form>
            )}
          </div>
          <div className="space-y-2">
            {groupModifiers.length === 0 && (
              <p className="text-sm text-neutral-500">Nenhum adicional.</p>
            )}
            {groupModifiers.map((modifier) => (
              <div
                key={modifier.id}
                className="flex items-center justify-between rounded border p-2 text-sm"
              >
                <div>
                  <p className="font-medium">{modifier.name}</p>
                  <p className="text-xs text-neutral-500">
                    R$ {Number(modifier.price).toFixed(2)} ·{" "}
                    {modifier.active ? "Ativo" : "Inativo"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => setEditingModifier(modifier)}
                  >
                    Editar
                  </button>
                  <form action={toggleModifierStatus}>
                    <input type="hidden" name="modifierId" value={modifier.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={(!modifier.active).toString()}
                    />
                    <button className="rounded border px-2 py-1 text-xs">
                      {modifier.active ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded border p-3">
            <h3 className="text-sm font-semibold">
              {editingModifier ? "Editar adicional" : "Novo adicional"}
            </h3>
            <form
              className="mt-2 space-y-2"
              action={saveModifier}
              onSubmit={() => setEditingModifier(null)}
            >
              <input
                type="hidden"
                name="modifierId"
                value={editingModifier?.id ?? ""}
              />
              <input
                type="hidden"
                name="groupId"
                value={selectedGroup?.id ?? ""}
              />
              <div className="space-y-1">
                <label className="text-xs font-medium">Nome</label>
                <input
                  className="w-full rounded border px-2 py-1 text-sm"
                  name="name"
                  defaultValue={editingModifier?.name ?? ""}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Preço</label>
                <input
                  className="w-full rounded border px-2 py-1 text-sm"
                  name="price"
                  defaultValue={
                    editingModifier ? Number(editingModifier.price).toFixed(2) : ""
                  }
                  placeholder="0,00"
                />
              </div>
              <button className="w-full rounded bg-black px-3 py-2 text-xs text-white">
                {editingModifier ? "Salvar adicional" : "Criar adicional"}
              </button>
            </form>
          </div>
        </div>

        <div className="rounded border p-4 space-y-3">
          <h2 className="text-base font-semibold">Vincular produtos</h2>
          {selectedGroup ? (
            <form className="space-y-2" action={assignGroupToProducts}>
              <input type="hidden" name="groupId" value={selectedGroup.id} />
              <div className="grid gap-2 md:grid-cols-2">
                {products.map((product) => (
                  <label key={product.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="productIds"
                      value={product.id}
                      defaultChecked={assignedProducts.has(product.id)}
                    />
                    {product.name}
                  </label>
                ))}
              </div>
              <button className="w-full rounded border px-3 py-2 text-sm">
                Salvar vínculos
              </button>
            </form>
          ) : (
            <p className="text-sm text-neutral-500">
              Selecione um grupo para vincular produtos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

