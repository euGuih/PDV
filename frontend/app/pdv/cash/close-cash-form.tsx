"use client";

import { useMemo, useState } from "react";
import { closeCashRegister } from "./actions";

type CloseCashFormProps = {
  openingAmount: number;
  totalCashPayments: number;
};

export default function CloseCashForm({
  openingAmount,
  totalCashPayments,
}: CloseCashFormProps) {
  const [counted, setCounted] = useState<string>("");

  const theoreticalCash = useMemo(
    () => openingAmount + totalCashPayments,
    [openingAmount, totalCashPayments]
  );

  const difference = useMemo(() => {
    const value = Number(counted.replace(",", "."));
    if (Number.isNaN(value)) return null;
    return value - theoreticalCash;
  }, [counted, theoreticalCash]);

  return (
    <form className="space-y-4" action={closeCashRegister}>
      <div className="space-y-1">
        <label className="text-sm font-medium">Valor contado (dinheiro)</label>
        <input
          className="w-full rounded border px-3 py-2"
          name="countedAmount"
          value={counted}
          onChange={(event) => setCounted(event.target.value)}
          placeholder="0,00"
        />
      </div>

      <div className="rounded border bg-neutral-50 p-3 text-sm">
        <p>
          Total teórico em caixa:{" "}
          <span className="font-semibold">R$ {theoreticalCash.toFixed(2)}</span>
        </p>
        <p>
          Diferença:{" "}
          <span className="font-semibold">
            {difference === null ? "--" : `R$ ${difference.toFixed(2)}`}
          </span>
        </p>
      </div>

      <button className="w-full rounded bg-black px-4 py-2 text-white">
        Confirmar fechamento
      </button>
    </form>
  );
}

