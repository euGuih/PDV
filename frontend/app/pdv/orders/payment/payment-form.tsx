"use client";

import { useMemo, useState } from "react";
import { finalizePayment } from "./actions";

type PaymentMethod = "CASH" | "PIX" | "CARD";

type PaymentItem = {
  method: PaymentMethod;
  amount: number;
};

type PaymentFormProps = {
  orderId: string;
  total: number;
};

export default function PaymentForm({ orderId, total }: PaymentFormProps) {
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState("");
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  const totalPaid = useMemo(
    () => payments.reduce((acc, payment) => acc + payment.amount, 0),
    [payments]
  );

  const remaining = useMemo(() => total - totalPaid, [total, totalPaid]);

  const addPayment = () => {
    const value = Number(amount.replace(",", "."));
    if (Number.isNaN(value) || value <= 0) return;
    setPayments((current) => [...current, { method, amount: value }]);
    setAmount("");
  };

  const removePayment = (index: number) => {
    setPayments((current) => current.filter((_, idx) => idx !== index));
  };

  const payload = JSON.stringify({
    orderId,
    payments,
  });

  return (
    <div className="space-y-6">
      <div className="rounded border bg-neutral-50 p-4 text-sm">
        <p className="flex items-center justify-between">
          <span>Total do pedido</span>
          <span className="text-base font-semibold">R$ {total.toFixed(2)}</span>
        </p>
        <p className="flex items-center justify-between text-neutral-600">
          <span>Total pago</span>
          <span>R$ {totalPaid.toFixed(2)}</span>
        </p>
        <p className="flex items-center justify-between text-neutral-600">
          <span>Restante</span>
          <span>R$ {Math.max(remaining, 0).toFixed(2)}</span>
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
        <select
          className="rounded border px-3 py-2"
          value={method}
          onChange={(event) => setMethod(event.target.value as PaymentMethod)}
        >
          <option value="CASH">Dinheiro</option>
          <option value="PIX">PIX</option>
          <option value="CARD">Cartão</option>
        </select>
        <input
          className="rounded border px-3 py-2"
          placeholder="0,00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <button className="rounded border px-4 py-2" onClick={addPayment}>
          Adicionar pagamento
        </button>
      </div>

      <div className="space-y-2">
        {payments.length === 0 && (
          <p className="text-sm text-neutral-500">Nenhum pagamento adicionado.</p>
        )}
        {payments.map((payment, index) => (
          <div
            key={`${payment.method}-${index}`}
            className="flex items-center justify-between rounded border px-3 py-2 text-sm"
          >
            <span>
              {payment.method === "CASH"
                ? "Dinheiro"
                : payment.method === "PIX"
                ? "PIX"
                : "Cartão"}
            </span>
            <span>R$ {payment.amount.toFixed(2)}</span>
            <button
              className="text-xs text-red-600"
              onClick={() => removePayment(index)}
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <form action={finalizePayment}>
        <input type="hidden" name="paymentPayload" value={payload} />
        <button
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          disabled={payments.length === 0 || totalPaid !== total}
        >
          Finalizar venda
        </button>
      </form>
    </div>
  );
}

