"use client";

type OrdersErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function OrdersError({ error, reset }: OrdersErrorProps) {
  console.error("Erro na rota /pdv/orders:", error);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Algo deu errado</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Não foi possível carregar o pedido agora. Tente novamente.
      </p>
      <button
        className="mt-4 rounded bg-black px-4 py-2 text-white"
        onClick={reset}
      >
        Recarregar
      </button>
    </div>
  );
}

