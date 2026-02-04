"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type OrderPayload = {
  items: Array<{
    itemType: "PRODUCT" | "COMBO";
    itemId: string;
    clientReference: string;
    quantity: number;
    notes?: string | null;
    modifiers?: Array<{
      modifierId: string;
      quantity: number;
    }>;
  }>;
  orderType: "COUNTER" | "TABLE";
  tableSessionId?: string | null;
  discountType?: "NONE" | "PERCENT" | "FIXED";
  discountValue?: number;
  serviceFeeType?: "NONE" | "PERCENT" | "FIXED";
  serviceFeeValue?: number;
  orderNotes?: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  price: number;
};

type ComboRow = {
  id: string;
  name: string;
  price: number;
};

type ModifierRow = {
  id: string;
  name: string;
  price: number;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clampNonNegative = (value: number) => (value < 0 ? 0 : value);

export async function createOrder(formData: FormData) {
  const rawPayload = formData.get("orderPayload");
  if (!rawPayload || typeof rawPayload !== "string") {
    throw new Error("Pedido inválido.");
  }

  let payload: OrderPayload;
  try {
    payload = JSON.parse(rawPayload) as OrderPayload;
  } catch {
    throw new Error("Pedido inválido.");
  }

  if (!payload.items?.length) {
    throw new Error("Pedido vazio.");
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;

  if (userError || !userId) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: openRegister } = await supabase
    .from("cash_registers")
    .select("id")
    .eq("status", "OPEN")
    .maybeSingle();

  if (!openRegister) {
    throw new Error("Caixa fechado.");
  }

  const { data: activeShift } = await supabase
    .from("shifts")
    .select("id")
    .eq("status", "OPEN")
    .eq("opened_by", userId)
    .maybeSingle();

  let shiftId = activeShift?.id ?? null;
  if (!shiftId) {
    const { data: newShift, error: shiftError } = await supabase
      .from("shifts")
      .insert({
        opened_by: userId,
        cash_register_id: openRegister.id,
        note_open: "Abertura automática no pedido.",
      })
      .select("id")
      .single();

    if (shiftError || !newShift) {
      throw new Error("Não foi possível abrir um turno.");
    }
    shiftId = newShift.id;
  }

  const productIds = payload.items
    .filter((item) => item.itemType === "PRODUCT")
    .map((item) => item.itemId);
  const comboIds = payload.items
    .filter((item) => item.itemType === "COMBO")
    .map((item) => item.itemId);
  const modifierIds = payload.items.flatMap(
    (item) => item.modifiers?.map((modifier) => modifier.modifierId) ?? []
  );

  const [productsResult, combosResult, modifiersResult, tableSessionResult] =
    await Promise.all([
      productIds.length
        ? supabase
            .from("products")
            .select("id, name, price")
            .in("id", productIds)
        : Promise.resolve({ data: [] as ProductRow[] }),
      comboIds.length
        ? supabase
            .from("combos")
            .select("id, name, price")
            .in("id", comboIds)
        : Promise.resolve({ data: [] as ComboRow[] }),
      modifierIds.length
        ? supabase
            .from("modifiers")
            .select("id, name, price, active")
            .in("id", modifierIds)
            .eq("active", true)
        : Promise.resolve({ data: [] as ModifierRow[] }),
      payload.orderType === "TABLE" && payload.tableSessionId
        ? supabase
            .from("table_sessions")
            .select("id, table_id")
            .eq("id", payload.tableSessionId)
            .eq("status", "OPEN")
            .maybeSingle()
        : Promise.resolve({ data: null as { id: string; table_id: string } | null }),
    ]);

  if (payload.orderType === "TABLE" && !tableSessionResult.data) {
    throw new Error("Mesa inválida.");
  }

  const productsMap = new Map(
    (productsResult.data as ProductRow[] | null)?.map((item) => [item.id, item]) ??
      []
  );
  const combosMap = new Map(
    (combosResult.data as ComboRow[] | null)?.map((item) => [item.id, item]) ?? []
  );
  const modifiersMap = new Map(
    (modifiersResult.data as ModifierRow[] | null)?.map((item) => [item.id, item]) ??
      []
  );

  const normalizedItems = payload.items.map((item) => {
    const quantity = Math.max(1, Math.floor(toNumber(item.quantity)));
    const clientReference = item.clientReference?.trim();
    if (!clientReference) {
      throw new Error("Item inválido.");
    }
    if (item.itemType === "PRODUCT") {
      const product = productsMap.get(item.itemId);
      if (!product) {
        throw new Error("Produto inválido.");
      }
      return {
        itemType: "PRODUCT" as const,
        itemId: product.id,
        itemName: product.name,
        clientReference,
        basePrice: Number(product.price),
        quantity,
        notes: item.notes?.trim() || null,
        modifiers: item.modifiers ?? [],
      };
    }

    const combo = combosMap.get(item.itemId);
    if (!combo) {
      throw new Error("Combo inválido.");
    }
    return {
      itemType: "COMBO" as const,
      itemId: combo.id,
      itemName: combo.name,
      clientReference,
      basePrice: Number(combo.price),
      quantity,
      notes: item.notes?.trim() || null,
      modifiers: item.modifiers ?? [],
    };
  });

  const itemsWithTotals = normalizedItems.map((item) => {
    const modifierEntries = item.modifiers.map((modifier) => {
      const modifierRow = modifiersMap.get(modifier.modifierId);
      if (!modifierRow) {
        throw new Error("Adicional inválido.");
      }
      const quantity = Math.max(1, Math.floor(toNumber(modifier.quantity)));
      return {
        id: modifierRow.id,
        name: modifierRow.name,
        price: Number(modifierRow.price),
        quantity,
      };
    });
    const modifiersTotal = modifierEntries.reduce(
      (acc, entry) => acc + entry.price * entry.quantity,
      0
    );
    const unitPrice = clampNonNegative(item.basePrice + modifiersTotal);
    return {
      ...item,
      unitPrice,
      modifiersTotal,
      modifierEntries,
    };
  });

  const subtotal = itemsWithTotals.reduce(
    (acc, item) => acc + item.unitPrice * item.quantity,
    0
  );

  const discountType = payload.discountType ?? "NONE";
  const discountValue = clampNonNegative(toNumber(payload.discountValue));
  const discountAmount =
    discountType === "PERCENT"
      ? Math.min(subtotal, subtotal * (discountValue / 100))
      : discountType === "FIXED"
      ? Math.min(subtotal, discountValue)
      : 0;

  const serviceFeeType = payload.serviceFeeType ?? "NONE";
  const serviceFeeValue = clampNonNegative(toNumber(payload.serviceFeeValue));
  const serviceBase = Math.max(subtotal - discountAmount, 0);
  const serviceFeeAmount =
    serviceFeeType === "PERCENT"
      ? serviceBase * (serviceFeeValue / 100)
      : serviceFeeType === "FIXED"
      ? serviceFeeValue
      : 0;

  const total = clampNonNegative(serviceBase + serviceFeeAmount);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      cash_register_id: openRegister.id,
      shift_id: shiftId,
      operator_id: userId,
      order_type: payload.orderType ?? "COUNTER",
      table_session_id:
        payload.orderType === "TABLE" ? payload.tableSessionId ?? null : null,
      table_id:
        payload.orderType === "TABLE"
          ? tableSessionResult.data?.table_id ?? null
          : null,
      notes: payload.orderNotes?.trim() || null,
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(discountAmount.toFixed(2)),
      discount_type: discountType,
      discount_value: Number(discountValue.toFixed(2)),
      service_fee: Number(serviceFeeAmount.toFixed(2)),
      service_fee_type: serviceFeeType,
      service_fee_value: Number(serviceFeeValue.toFixed(2)),
      total,
      status: "OPEN",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error("Não foi possível criar o pedido.");
  }

  const items = itemsWithTotals.map((item) => ({
    order_id: order.id,
    product_id: item.itemType === "PRODUCT" ? item.itemId : null,
    combo_id: item.itemType === "COMBO" ? item.itemId : null,
    item_type: item.itemType,
    item_name: item.itemName,
    client_reference: item.clientReference,
    quantity: item.quantity,
    price: Number(item.unitPrice.toFixed(2)),
    notes: item.notes,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(items)
    .select("id");

  if (itemsError) {
    throw new Error("Não foi possível salvar os itens.");
  }

  const { data: savedItems } = await supabase
    .from("order_items")
    .select("id, client_reference")
    .eq("order_id", order.id);

  const modifierRows = itemsWithTotals.flatMap((item) => {
    const itemRow = savedItems?.find(
      (row) => row.client_reference === item.clientReference
    );
    if (!itemRow) return [];
    return item.modifierEntries.map((modifier) => ({
      order_item_id: itemRow.id,
      modifier_id: modifier.id,
      quantity: modifier.quantity,
      price: Number(modifier.price.toFixed(2)),
    }));
  });

  if (modifierRows.length > 0) {
    const { error: modifiersError } = await supabase
      .from("order_item_modifiers")
      .insert(modifierRows);
    if (modifiersError) {
      throw new Error("Não foi possível salvar os adicionais.");
    }
  }

  await supabase.from("order_events").insert({
    order_id: order.id,
    event_type: "CREATED",
    payload: {
      subtotal,
      discount: discountAmount,
      service_fee: serviceFeeAmount,
      total,
    },
    created_by: userId,
  });

  redirect(`/pdv/orders/payment?orderId=${order.id}`);
}

export async function cancelOrder(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!orderId) {
    throw new Error("Pedido inválido.");
  }
  if (!reason) {
    throw new Error("Motivo obrigatório.");
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();

  if (!order || order.status !== "OPEN") {
    throw new Error("Pedido não pode ser cancelado.");
  }

  const { count: paymentsCount } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);

  if (paymentsCount && paymentsCount > 0) {
    throw new Error("Pedido já possui pagamentos.");
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "CANCELED" })
    .eq("id", orderId)
    .eq("status", "OPEN");

  if (error) {
    throw new Error("Não foi possível cancelar o pedido.");
  }

  await supabase.from("order_events").insert({
    order_id: orderId,
    event_type: "CANCELED",
    payload: { reason },
    created_by: userData.user.id,
  });

  revalidatePath("/pdv/orders/history");
}

