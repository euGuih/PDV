import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PaymentForm from "./payment-form";

export const dynamic = "force-dynamic";

type PaymentPageProps = {
  searchParams: { orderId?: string };
};

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const orderId = searchParams.orderId;
  if (!orderId) {
    redirect("/pdv/orders");
  }

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, total, status, subtotal, discount, discount_type, discount_value, service_fee, service_fee_type, service_fee_value"
    )
    .eq("id", orderId)
    .single();

  if (!order || order.status !== "OPEN") {
    redirect("/pdv");
  }

  const { data: items } = await supabase
    .from("order_items")
    .select(
      "id, item_name, item_type, quantity, price, notes, order_item_modifiers(quantity, price, modifiers(name))"
    )
    .eq("order_id", orderId);

  const { data: paymentMethods } = await supabase
    .from("payment_methods")
    .select("id, code, name")
    .eq("active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Pagamento</h1>
        <p className="text-sm text-neutral-600">
          Informe os pagamentos para finalizar a venda.
        </p>
      </div>
      <PaymentForm
        orderId={order.id}
        total={Number(order.total)}
        subtotal={Number(order.subtotal)}
        discount={Number(order.discount)}
        serviceFee={Number(order.service_fee)}
        items={items ?? []}
        paymentMethods={paymentMethods ?? []}
      />
    </div>
  );
}

