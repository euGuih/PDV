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

type OrderItemModifier = {
  modifierId: string;
  name: string;
  price: number;
  quantity: number;
};

type OrderItem = {
  clientReference: string;
  itemType: "PRODUCT" | "COMBO";
  itemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  notes: string;
  modifiers: OrderItemModifier[];
};

type OrderBuilderProps = {
  categories: Category[];
  products: Product[];
  combos: Combo[];
  tableSessions: TableSession[];
  modifierGroups: ModifierGroup[];
  modifiers: Modifier[];
  productModifierGroups: ProductModifierGroup[];
};

const createClientReference = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function OrderBuilder({
  categories,
  products,
  combos,
  tableSessions,
  modifierGroups,
  modifiers,
  productModifierGroups,
}: OrderBuilderProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | "ALL">("ALL");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [orderType, setOrderType] = useState<"COUNTER" | "TABLE">("COUNTER");
  const [tableSessionId, setTableSessionId] = useState<string>("");
  const [editor, setEditor] = useState<OrderItem | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [orderNotes, setOrderNotes] = useState("");
  const [discountType, setDiscountType] = useState<"NONE" | "PERCENT" | "FIXED">(
    "NONE"
  );
  const [discountValue, setDiscountValue] = useState<string>("");
  const [serviceFeeType, setServiceFeeType] = useState<
    "NONE" | "PERCENT" | "FIXED"
  >("NONE");
  const [serviceFeeValue, setServiceFeeValue] = useState<string>("");

  const catalogItems = useMemo(() => {
    const productsList = products.map((product) => ({
      type: "PRODUCT" as const,
      id: product.id,
      name: product.name,
      price: Number(product.price),
      categoryId: product.category_id,
    }));
    const combosList = combos.map((combo) => ({
      type: "COMBO" as const,
      id: combo.id,
      name: combo.name,
      price: Number(combo.price),
      categoryId: combo.category_id,
    }));
    return [...productsList, ...combosList];
  }, [products, combos]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === "ALL") return catalogItems;
    if (selectedCategory === "COMBOS") {
      return catalogItems.filter((item) => item.type === "COMBO");
    }
    return catalogItems.filter((item) => item.categoryId === selectedCategory);
  }, [catalogItems, selectedCategory]);

  const modifierGroupsByProduct = useMemo(() => {
    const map = new Map<string, Array<{ group: ModifierGroup; sort: number }>>();
    for (const relation of productModifierGroups) {
      const group = modifierGroups.find(
        (entry) => entry.id === relation.modifier_group_id
      );
      if (!group) continue;
      const list = map.get(relation.product_id) ?? [];
      list.push({ group, sort: relation.sort_order });
      map.set(relation.product_id, list);
    }
    const output = new Map<string, ModifierGroup[]>();
    for (const [productId, list] of map.entries()) {
      output.set(
        productId,
        list.sort((a, b) => a.sort - b.sort).map((entry) => entry.group)
      );
    }
    return output;
  }, [productModifierGroups, modifierGroups]);

  const modifiersByGroup = useMemo(() => {
    const map = new Map<string, Modifier[]>();
    for (const modifier of modifiers) {
      const list = map.get(modifier.group_id) ?? [];
      list.push(modifier);
      map.set(modifier.group_id, list);
    }
    return map;
  }, [modifiers]);

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => {
      const modifiersTotal = item.modifiers.reduce(
        (sum, modifier) => sum + modifier.price * modifier.quantity,
        0
      );
      const unitPrice = item.basePrice + modifiersTotal;
      return acc + unitPrice * item.quantity;
    }, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    const value = Number(discountValue.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return 0;
    if (discountType === "PERCENT") {
      return Math.min(subtotal, subtotal * (value / 100));
    }
    if (discountType === "FIXED") {
      return Math.min(subtotal, value);
    }
    return 0;
  }, [discountType, discountValue, subtotal]);

  const serviceFeeAmount = useMemo(() => {
    const value = Number(serviceFeeValue.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return 0;
    const base = Math.max(subtotal - discountAmount, 0);
    if (serviceFeeType === "PERCENT") {
      return base * (value / 100);
    }
    if (serviceFeeType === "FIXED") {
      return value;
    }
    return 0;
  }, [serviceFeeType, serviceFeeValue, subtotal, discountAmount]);

  const total = Math.max(subtotal - discountAmount + serviceFeeAmount, 0);

  const openItemEditor = (item: {
    type: "PRODUCT" | "COMBO";
    id: string;
    name: string;
    price: number;
  }) => {
    setEditorError(null);
    setEditor({
      clientReference: createClientReference(),
      itemType: item.type,
      itemId: item.id,
      name: item.name,
      basePrice: item.price,
      quantity: 1,
      notes: "",
      modifiers: [],
    });
  };

  const updateModifier = (
    modifier: Modifier,
    checked: boolean,
    group: ModifierGroup
  ) => {
    if (!editor) return;
    setEditorError(null);
    setEditor((current) => {
      if (!current) return current;
      const currentModifiers = current.modifiers ?? [];
      const groupModifiers = currentModifiers.filter(
        (entry) =>
          modifiers.find((item) => item.id === entry.modifierId)?.group_id ===
          group.id
      );

      if (checked && group.max_select > 0 && groupModifiers.length >= group.max_select) {
        return current;
      }

      const exists = currentModifiers.find(
        (entry) => entry.modifierId === modifier.id
      );
      let nextModifiers = currentModifiers;
      if (checked && !exists) {
        nextModifiers = [
          ...currentModifiers,
          {
            modifierId: modifier.id,
            name: modifier.name,
            price: Number(modifier.price),
            quantity: 1,
          },
        ];
      }
      if (!checked && exists) {
        nextModifiers = currentModifiers.filter(
          (entry) => entry.modifierId !== modifier.id
        );
      }
      return { ...current, modifiers: nextModifiers };
    });
  };

  const saveItem = () => {
    if (!editor) return;
    if (editor.itemType === "PRODUCT") {
      const groups = modifierGroupsByProduct.get(editor.itemId) ?? [];
      for (const group of groups) {
        const selectedCount = editor.modifiers.filter((modifier) => {
          const entry = modifiers.find((item) => item.id === modifier.modifierId);
          return entry?.group_id === group.id;
        }).length;
        const minRequired = group.required ? Math.max(1, group.min_select) : group.min_select;
        if (minRequired > 0 && selectedCount < minRequired) {
          setEditorError(`Selecione pelo menos ${minRequired} em "${group.name}".`);
          return;
        }
      }
    }
    setItems((current) => [...current, editor]);
    setEditor(null);
  };

  const removeItem = (clientReference: string) => {
    setItems((current) =>
      current.filter((item) => item.clientReference !== clientReference)
    );
  };

  const increment = (clientReference: string) => {
    setItems((current) =>
      current.map((item) =>
        item.clientReference === clientReference
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decrement = (clientReference: string) => {
    setItems((current) =>
      current
        .map((item) =>
          item.clientReference === clientReference
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const payload = JSON.stringify({
    items: items.map((item) => ({
      itemType: item.itemType,
      itemId: item.itemId,
      clientReference: item.clientReference,
      quantity: item.quantity,
      notes: item.notes,
      modifiers: item.modifiers.map((modifier) => ({
        modifierId: modifier.modifierId,
        quantity: modifier.quantity,
      })),
    })),
    orderType,
    tableSessionId: orderType === "TABLE" ? tableSessionId : null,
    discountType,
    discountValue: Number(discountValue.replace(",", ".")) || 0,
    serviceFeeType,
    serviceFeeValue: Number(serviceFeeValue.replace(",", ".")) || 0,
    orderNotes,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr_360px]">
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
        <button
          className={`w-full rounded px-3 py-2 text-left ${
            selectedCategory === "COMBOS"
              ? "bg-black text-white"
              : "border text-neutral-700"
          }`}
          onClick={() => setSelectedCategory("COMBOS")}
        >
          Combos
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
        {filteredItems.map((item) => (
          <button
            key={`${item.type}-${item.id}`}
            className="rounded border bg-white p-4 text-left shadow-sm"
            onClick={() =>
              openItemEditor({
                type: item.type,
                id: item.id,
                name: item.name,
                price: item.price,
              })
            }
          >
            <p className="text-sm text-neutral-500">R$ {item.price.toFixed(2)}</p>
            <p className="text-base font-semibold">{item.name}</p>
            <p className="text-xs text-neutral-400">
              {item.type === "COMBO" ? "Combo" : "Produto"}
            </p>
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
          {items.map((item) => {
            const modifiersTotal = item.modifiers.reduce(
              (sum, modifier) => sum + modifier.price * modifier.quantity,
              0
            );
            const unitPrice = item.basePrice + modifiersTotal;
            return (
              <div key={item.clientReference} className="space-y-1 border-b pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.notes && (
                      <p className="text-xs text-neutral-500">{item.notes}</p>
                    )}
                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-neutral-500">
                        {item.modifiers.map((modifier) => modifier.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <button
                    className="text-xs text-red-600"
                    onClick={() => removeItem(item.clientReference)}
                  >
                    Remover
                  </button>
                </div>
                <p className="text-xs text-neutral-500">
                  R$ {unitPrice.toFixed(2)} x {item.quantity}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    className="h-8 w-8 rounded border"
                    onClick={() => decrement(item.clientReference)}
                  >
                    -
                  </button>
                  <span className="min-w-[24px] text-center">{item.quantity}</span>
                  <button
                    className="h-8 w-8 rounded border"
                    onClick={() => increment(item.clientReference)}
                  >
                    +
                  </button>
                  <span className="ml-auto text-sm font-semibold">
                    R$ {(unitPrice * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3 rounded border p-3 text-sm">
          <div className="space-y-1">
            <label className="text-xs font-medium">Observacao do pedido</label>
            <textarea
              className="w-full rounded border px-2 py-1"
              value={orderNotes}
              onChange={(event) => setOrderNotes(event.target.value)}
              placeholder="Ex: cliente vai retirar"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-[100px_1fr]">
            <select
              className="rounded border px-2 py-1"
              value={discountType}
              onChange={(event) =>
                setDiscountType(event.target.value as "NONE" | "PERCENT" | "FIXED")
              }
            >
              <option value="NONE">Sem desconto</option>
              <option value="PERCENT">% desconto</option>
              <option value="FIXED">Desconto R$</option>
            </select>
            <input
              className="rounded border px-2 py-1"
              placeholder="0,00"
              value={discountValue}
              onChange={(event) => setDiscountValue(event.target.value)}
              disabled={discountType === "NONE"}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-[100px_1fr]">
            <select
              className="rounded border px-2 py-1"
              value={serviceFeeType}
              onChange={(event) =>
                setServiceFeeType(
                  event.target.value as "NONE" | "PERCENT" | "FIXED"
                )
              }
            >
              <option value="NONE">Sem taxa</option>
              <option value="PERCENT">% taxa</option>
              <option value="FIXED">Taxa R$</option>
            </select>
            <input
              className="rounded border px-2 py-1"
              placeholder="0,00"
              value={serviceFeeValue}
              onChange={(event) => setServiceFeeValue(event.target.value)}
              disabled={serviceFeeType === "NONE"}
            />
          </div>
        </div>

        <div className="rounded border bg-neutral-50 p-3 text-sm space-y-1">
          <p className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </p>
          <p className="flex items-center justify-between text-neutral-600">
            <span>Desconto</span>
            <span>- R$ {discountAmount.toFixed(2)}</span>
          </p>
          <p className="flex items-center justify-between text-neutral-600">
            <span>Taxa de servico</span>
            <span>R$ {serviceFeeAmount.toFixed(2)}</span>
          </p>
          <p className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
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

      {editor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg space-y-4 rounded bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{editor.name}</h3>
                <p className="text-sm text-neutral-500">
                  R$ {editor.basePrice.toFixed(2)}
                </p>
              </div>
              <button
                className="text-sm text-neutral-600"
                onClick={() => setEditor(null)}
              >
                Fechar
              </button>
            </div>
            {editorError && (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {editorError}
              </p>
            )}

            {editor.itemType === "PRODUCT" && (
              <div className="space-y-3">
                {(modifierGroupsByProduct.get(editor.itemId) ?? []).map((group) => {
                  const groupModifiers = modifiersByGroup.get(group.id) ?? [];
                  const selectedCount = editor.modifiers.filter((modifier) => {
                    const entry = modifiers.find((item) => item.id === modifier.modifierId);
                    return entry?.group_id === group.id;
                  }).length;
                  return (
                    <div key={group.id} className="rounded border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{group.name}</p>
                        <p className="text-xs text-neutral-500">
                          {group.required ? "Obrigatorio" : "Opcional"} · {selectedCount}
                          {group.max_select ? `/${group.max_select}` : ""}
                        </p>
                      </div>
                      <div className="mt-2 space-y-2 text-sm">
                        {groupModifiers.map((modifier) => {
                          const checked = editor.modifiers.some(
                            (entry) => entry.modifierId === modifier.id
                          );
                          return (
                            <label
                              key={modifier.id}
                              className="flex items-center justify-between gap-2"
                            >
                              <span>
                                {modifier.name} · R$ {Number(modifier.price).toFixed(2)}
                              </span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) =>
                                  updateModifier(modifier, event.target.checked, group)
                                }
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Observacao</label>
              <textarea
                className="w-full rounded border px-3 py-2"
                value={editor.notes}
                onChange={(event) =>
                  setEditor((current) =>
                    current ? { ...current, notes: event.target.value } : current
                  )
                }
                placeholder="Ex: sem cebola"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  className="h-8 w-8 rounded border"
                  onClick={() =>
                    setEditor((current) =>
                      current
                        ? { ...current, quantity: Math.max(1, current.quantity - 1) }
                        : current
                    )
                  }
                >
                  -
                </button>
                <span className="min-w-[24px] text-center">{editor.quantity}</span>
                <button
                  className="h-8 w-8 rounded border"
                  onClick={() =>
                    setEditor((current) =>
                      current ? { ...current, quantity: current.quantity + 1 } : current
                    )
                  }
                >
                  +
                </button>
              </div>
              <button
                className="rounded bg-black px-4 py-2 text-white"
                onClick={saveItem}
              >
                Adicionar ao pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

