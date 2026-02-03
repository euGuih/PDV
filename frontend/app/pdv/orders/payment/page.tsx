import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PaymentForm from "./payment-form";

type PaymentPageProps = {
  searchParams: { orderId?: string };
};

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const orderId = searchParams.orderId;
  if (!orderId) {
    redirect("/pdv/orders");
  }

  const supabase = createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, total, status")
    .eq("id", orderId)
    .single();

  if (!order || order.status !== "OPEN") {
    redirect("/pdv");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Pagamento</h1>
        <p className="text-sm text-neutral-600">
          Informe os pagamentos para finalizar a venda.
        </p>
      </div>
      <PaymentForm orderId={order.id} total={Number(order.total)} />
    </div>
  );
}

