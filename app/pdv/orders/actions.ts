"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type OrderPayload = {
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
};

export async function createOrder(formData: FormData) {
  const rawPayload = formData.get("orderPayload");
  if (!rawPayload || typeof rawPayload !== "string") {
    throw new Error("Pedido inválido.");
  }

  const payload = JSON.parse(rawPayload) as OrderPayload;
  if (!payload.items?.length) {
    throw new Error("Pedido vazio.");
  }

  const supabase = createClient();
  const { data: openRegister } = await supabase
    .from("cash_registers")
    .select("id")
    .eq("status", "OPEN")
    .maybeSingle();

  if (!openRegister) {
    throw new Error("Caixa fechado.");
  }

  const total = payload.items.reduce(
    (acc, item) => acc + item.quantity * item.price,
    0
  );

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      cash_register_id: openRegister.id,
      total,
      status: "OPEN",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error("Não foi possível criar o pedido.");
  }

  const items = payload.items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    quantity: item.quantity,
    price: item.price,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(items);

  if (itemsError) {
    throw new Error("Não foi possível salvar os itens.");
  }

  redirect(`/pdv/orders/payment?orderId=${order.id}`);
}


