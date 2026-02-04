"use client";

import { useMemo, useState } from "react";
import { finalizePayment } from "./actions";

type PaymentMethod = {
  id: string;
  code: string;
  name: string;
};

type PaymentItem = {
  method: string;
  amount: number;
  received?: number | null;
  change?: number | null;
};

type PaymentFormProps = {
  orderId: string;
  total: number;
  subtotal: number;
  discount: number;
  serviceFee: number;
  items: Array<{
    id: string;
    item_name: string | null;
    item_type: string;
    quantity: number;
    price: number;
    notes: string | null;
    order_item_modifiers?: Array<{
      quantity: number;
      price: number;
      modifiers?: { name: string } | { name: string }[] | null;
    }> | null;
  }>;
  paymentMethods: PaymentMethod[];
};

export default function PaymentForm({
  orderId,
  total,
  subtotal,
  discount,
  serviceFee,
  items,
  paymentMethods,
}: PaymentFormProps) {
  const defaultMethod =
    paymentMethods.find((entry) => entry.code === "CASH")?.code ??
    paymentMethods[0]?.code ??
    "CASH";
  const [method, setMethod] = useState<string>(defaultMethod);
  const [amount, setAmount] = useState("");
  const [received, setReceived] = useState("");
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  const totalApplied = useMemo(
    () => payments.reduce((acc, payment) => acc + payment.amount, 0),
    [payments]
  );

  const totalChange = useMemo(
    () => payments.reduce((acc, payment) => acc + (payment.change ?? 0), 0),
    [payments]
  );

  const remaining = useMemo(() => total - totalApplied, [total, totalApplied]);

  const addPayment = () => {
    const value = Number(amount.replace(",", "."));
    const receivedValue = Number(received.replace(",", "."));
    if (method === "CASH") {
      const receivedAmount = Number.isFinite(receivedValue) ? receivedValue : 0;
      if (receivedAmount <= 0) return;
      const applied = Math.min(remaining, receivedAmount);
      if (applied <= 0) return;
      const change = Math.max(receivedAmount - applied, 0);
      setPayments((current) => [
        ...current,
        { method, amount: applied, received: receivedAmount, change },
      ]);
      setAmount("");
      setReceived("");
      return;
    }

    if (!Number.isFinite(value) || value <= 0) return;
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
      <div className="rounded border bg-neutral-50 p-4 text-sm space-y-1">
        <p className="flex items-center justify-between">
          <span>Subtotal</span>
          <span>R$ {subtotal.toFixed(2)}</span>
        </p>
        <p className="flex items-center justify-between text-neutral-600">
          <span>Desconto</span>
          <span>- R$ {discount.toFixed(2)}</span>
        </p>
        <p className="flex items-center justify-between text-neutral-600">
          <span>Taxa de servico</span>
          <span>R$ {serviceFee.toFixed(2)}</span>
        </p>
        <p className="flex items-center justify-between text-base font-semibold">
          <span>Total do pedido</span>
          <span>R$ {total.toFixed(2)}</span>
        </p>
        <p className="flex items-center justify-between text-neutral-600">
          <span>Total aplicado</span>
          <span>R$ {totalApplied.toFixed(2)}</span>
        </p>
        <p className="flex items-center justify-between text-neutral-600">
          <span>Restante</span>
          <span>R$ {Math.max(remaining, 0).toFixed(2)}</span>
        </p>
        {totalChange > 0 && (
          <p className="flex items-center justify-between text-neutral-600">
            <span>Troco</span>
            <span>R$ {totalChange.toFixed(2)}</span>
          </p>
        )}
      </div>

      <div className="rounded border p-4 text-sm space-y-2">
        <h2 className="font-semibold">Resumo do pedido</h2>
        {items.length === 0 ? (
          <p className="text-neutral-500">Itens não encontrados.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="space-y-1 border-b pb-2 last:border-b-0">
              <div className="flex items-center justify-between">
                <span>
                  {item.item_name ?? "Item"} · {item.quantity}x
                </span>
                <span>R$ {(Number(item.price) * Number(item.quantity)).toFixed(2)}</span>
              </div>
              {item.notes && (
                <p className="text-xs text-neutral-500">{item.notes}</p>
              )}
              {item.order_item_modifiers?.length ? (
                <p className="text-xs text-neutral-500">
                  {item.order_item_modifiers
                    .map(
                      (modifier) => {
                        if (!modifier.modifiers) return "Adicional";
                        if (Array.isArray(modifier.modifiers)) {
                          return modifier.modifiers
                            .map((entry) => entry.name)
                            .filter(Boolean)
                            .join(", ");
                        }
                        return modifier.modifiers.name ?? "Adicional";
                      }
                    )
                    .join(", ")}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
        <select
          className="rounded border px-3 py-2"
          value={method}
          onChange={(event) => setMethod(event.target.value)}
        >
          {paymentMethods.map((entry) => (
            <option key={entry.id} value={entry.code}>
              {entry.name}
            </option>
          ))}
        </select>
        {method === "CASH" ? (
          <input
            className="rounded border px-3 py-2"
            placeholder="Valor recebido"
            value={received}
            onChange={(event) => setReceived(event.target.value)}
          />
        ) : (
          <input
            className="rounded border px-3 py-2"
            placeholder="0,00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        )}
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
            <div>
              <p className="font-medium">
                {paymentMethods.find((entry) => entry.code === payment.method)?.name ??
                  payment.method}
              </p>
              {payment.received ? (
                <p className="text-xs text-neutral-500">
                  Recebido: R$ {payment.received.toFixed(2)} · Troco: R${" "}
                  {(payment.change ?? 0).toFixed(2)}
                </p>
              ) : null}
            </div>
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
          disabled={payments.length === 0 || totalApplied !== total}
        >
          Finalizar venda
        </button>
      </form>
    </div>
  );
}

