"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PaymentPayload = {
  orderId: string;
  payments: Array<{
    method: "CASH" | "PIX" | "CARD";
    amount: number;
  }>;
};

export async function finalizePayment(formData: FormData) {
  const rawPayload = formData.get("paymentPayload");
  if (!rawPayload || typeof rawPayload !== "string") {
    throw new Error("Pagamento inválido.");
  }

  const payload = JSON.parse(rawPayload) as PaymentPayload;
  if (!payload.payments?.length) {
    throw new Error("Nenhum pagamento informado.");
  }

  const supabase = createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, total, status")
    .eq("id", payload.orderId)
    .single();

  if (!order || order.status !== "OPEN") {
    throw new Error("Pedido inválido.");
  }

  const { data: existingPayments } = await supabase
    .from("payments")
    .select("id")
    .eq("order_id", payload.orderId);

  if (existingPayments && existingPayments.length > 0) {
    throw new Error("Pedido já possui pagamentos.");
  }

  const totalPaid = payload.payments.reduce(
    (acc, payment) => acc + payment.amount,
    0
  );

  const roundedPaid = Number(totalPaid.toFixed(2));
  const roundedTotal = Number(Number(order.total).toFixed(2));

  if (roundedPaid !== roundedTotal) {
    throw new Error("Total pago deve ser igual ao total do pedido.");
  }

  const { error: paymentsError } = await supabase.from("payments").insert(
    payload.payments.map((payment) => ({
      order_id: payload.orderId,
      method: payment.method,
      amount: payment.amount,
    }))
  );

  if (paymentsError) {
    throw new Error("Não foi possível registrar pagamentos.");
  }

  const { error: orderError } = await supabase
    .from("orders")
    .update({ status: "PAID" })
    .eq("id", payload.orderId);

  if (orderError) {
    throw new Error("Não foi possível finalizar o pedido.");
  }

  redirect("/pdv");
}

