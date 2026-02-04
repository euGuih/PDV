"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PaymentPayload = {
  orderId: string;
  payments: Array<{
    method: string;
    amount: number;
    received?: number | null;
    change?: number | null;
  }>;
};

const toCents = (value: number) => Math.round(value * 100);

const fromCents = (cents: number) =>
  Number((cents / 100).toFixed(2));

const parsePayload = (rawPayload: string): PaymentPayload => {
  try {
    const parsed = JSON.parse(rawPayload) as PaymentPayload;
    if (!parsed?.orderId || !parsed?.payments?.length) {
      throw new Error("Pagamento inválido.");
    }
    return parsed;
  } catch {
    throw new Error("Pagamento inválido.");
  }
};

export async function finalizePayment(formData: FormData) {
  const rawPayload = formData.get("paymentPayload");
  if (!rawPayload || typeof rawPayload !== "string") {
    throw new Error("Pagamento inválido.");
  }

  const payload = parsePayload(rawPayload);

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, total, status")
    .eq("id", payload.orderId)
    .single();

  if (!order || order.status !== "OPEN") {
    throw new Error("Pedido inválido.");
  }

  const { data: orderItems } = await supabase
    .from("order_items")
    .select(
      "product_id, combo_id, item_type, quantity, price, products(name, track_stock, stock_qty)"
    )
    .eq("order_id", payload.orderId);

  const itemsToCheck =
    (orderItems as
      | Array<{
          product_id: string | null;
          combo_id: string | null;
          item_type: "PRODUCT" | "COMBO";
          quantity: number;
          price: number;
          products?: { name: string; track_stock: boolean; stock_qty: number } | null;
        }>
      | null) ?? [];

  const { count: existingPaymentsCount, error: existingPaymentsError } =
    await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("order_id", payload.orderId);

  if (existingPaymentsError) {
    throw new Error("Não foi possível validar pagamentos.");
  }

  if (existingPaymentsCount && existingPaymentsCount > 0) {
    throw new Error("Pedido já possui pagamentos.");
  }

  const { data: paymentMethods, error: paymentMethodsError } = await supabase
    .from("payment_methods")
    .select("id, code, fee_percent, fee_fixed")
    .eq("active", true);

  if (paymentMethodsError) {
    throw new Error("Não foi possível validar métodos de pagamento.");
  }

  const allowedMethods = new Map(
    paymentMethods?.map((row) => [row.code, row]) ?? []
  );

  const normalizedPayments = payload.payments.map((payment) => {
    const method = String(payment.method).toUpperCase();
    if (!allowedMethods.has(method)) {
      throw new Error("Método de pagamento inválido.");
    }
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount)) {
      throw new Error("Valor de pagamento inválido.");
    }
    const amountCents = toCents(amount);
    if (amountCents <= 0) {
      throw new Error("Valor de pagamento inválido.");
    }
    const received = payment.received ? Number(payment.received) : null;
    const change = payment.change ? Number(payment.change) : 0;
    if (received !== null && Number.isNaN(received)) {
      throw new Error("Valor recebido inválido.");
    }
    if (change && Number.isNaN(change)) {
      throw new Error("Troco inválido.");
    }
    if (received !== null && received < amount) {
      throw new Error("Valor recebido menor que o pagamento.");
    }
    return {
      method,
      amount: fromCents(amountCents),
      amountCents,
      received,
      change,
    };
  });

  const methodIdByCode = new Map(
    paymentMethods?.map((row) => [row.code, row.id]) ?? []
  );

  const totalPaidCents = normalizedPayments.reduce(
    (acc, payment) => acc + payment.amountCents,
    0
  );
  const totalCents = toCents(Number(order.total));

  if (totalPaidCents !== totalCents) {
    throw new Error("Total pago deve ser igual ao total do pedido.");
  }

  const { error: paymentsError } = await supabase.from("payments").insert(
    normalizedPayments.map((payment) => {
      const methodConfig = allowedMethods.get(payment.method);
      const feePercent = Number(methodConfig?.fee_percent ?? 0);
      const feeFixed = Number(methodConfig?.fee_fixed ?? 0);
      const feeAmount = payment.amount * (feePercent / 100) + feeFixed;
      return {
        order_id: payload.orderId,
        method: payment.method,
        payment_method_id: methodIdByCode.get(payment.method) ?? null,
        amount: payment.amount,
        received_amount: payment.received ?? null,
        change_amount: payment.change ?? 0,
        fee_amount: Number(feeAmount.toFixed(2)),
      };
    })
  );

  if (paymentsError) {
    throw new Error("Não foi possível registrar pagamentos.");
  }

  const { data: updatedOrder, error: orderError } = await supabase
    .from("orders")
    .update({ status: "PAID" })
    .eq("id", payload.orderId)
    .eq("status", "OPEN")
    .select("id");

  if (orderError || !updatedOrder || updatedOrder.length === 0) {
    await supabase.from("payments").delete().eq("order_id", payload.orderId);
    throw new Error("Não foi possível finalizar o pedido.");
  }

  const comboIds = itemsToCheck
    .filter((item) => item.item_type === "COMBO" && item.combo_id)
    .map((item) => item.combo_id as string);

  const { data: comboItems } =
    comboIds.length > 0
      ? await supabase
          .from("combo_items")
          .select("combo_id, product_id, quantity")
          .in("combo_id", comboIds)
      : {
          data: [] as Array<{
            combo_id: string;
            product_id: string;
            quantity: number;
          }>,
        };

  const comboProductsCount = new Map<string, number>();
  for (const item of itemsToCheck) {
    if (item.item_type !== "COMBO" || !item.combo_id) continue;
    const components =
      (comboItems as
        | Array<{ combo_id: string; product_id: string; quantity: number }>
        | null)?.filter((comboItem) => comboItem.combo_id === item.combo_id) ?? [];
    for (const component of components) {
      const current = comboProductsCount.get(component.product_id) ?? 0;
      comboProductsCount.set(
        component.product_id,
        current + Number(component.quantity) * Number(item.quantity)
      );
    }
  }

  for (const item of itemsToCheck) {
    if (item.item_type !== "PRODUCT") continue;
    if (!item.product_id) continue;
    if (!item.products?.track_stock) continue;
    const quantity = Number(item.quantity);
    const { data: updatedProduct } = await supabase
      .from("products")
      .update({ stock_qty: Number(item.products.stock_qty) - quantity })
      .eq("id", item.product_id)
      .eq("track_stock", true)
      .gte("stock_qty", quantity)
      .select("id");

    if (!updatedProduct || updatedProduct.length === 0) {
      await supabase.from("payments").delete().eq("order_id", payload.orderId);
      await supabase
        .from("orders")
        .update({ status: "OPEN" })
        .eq("id", payload.orderId);
      throw new Error("Não foi possível atualizar o estoque.");
    }

    await supabase.from("stock_movements").insert({
      product_id: item.product_id,
      order_id: payload.orderId,
      type: "OUT",
      quantity,
      reason: "Venda",
      created_by: userData.user.id,
    });
  }

  for (const [productId, quantity] of comboProductsCount.entries()) {
    const { data: product } = await supabase
      .from("products")
      .select("id, track_stock, stock_qty")
      .eq("id", productId)
      .single();

    if (!product?.track_stock) continue;
    const { data: updatedProduct } = await supabase
      .from("products")
      .update({ stock_qty: Number(product.stock_qty) - Number(quantity) })
      .eq("id", productId)
      .eq("track_stock", true)
      .gte("stock_qty", Number(quantity))
      .select("id");

    if (!updatedProduct || updatedProduct.length === 0) {
      await supabase.from("payments").delete().eq("order_id", payload.orderId);
      await supabase
        .from("orders")
        .update({ status: "OPEN" })
        .eq("id", payload.orderId);
      throw new Error("Não foi possível atualizar o estoque.");
    }

    await supabase.from("stock_movements").insert({
      product_id: productId,
      order_id: payload.orderId,
      type: "OUT",
      quantity,
      reason: "Venda combo",
      created_by: userData.user.id,
    });
  }

  await supabase.from("order_events").insert({
    order_id: payload.orderId,
    event_type: "PAID",
    payload: {
      payments: normalizedPayments.map((payment) => ({
        method: payment.method,
        amount: payment.amount,
        received: payment.received ?? null,
        change: payment.change ?? 0,
      })),
    },
    created_by: userData.user.id,
  });

  console.log("IMPRESSAO_PEDIDO", {
    orderId: payload.orderId,
    total: Number(order.total).toFixed(2),
    items: itemsToCheck.map((item) => ({
      productId: item.product_id,
      name: item.products?.name ?? "Produto",
      quantity: item.quantity,
      price: item.price,
    })),
    payments: normalizedPayments,
  });

  redirect("/pdv");
}

