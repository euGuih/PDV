import { createClient } from "@/lib/supabase/server";
import {
  closeTableSession,
  createTable,
  openTableSession,
  toggleTableStatus,
} from "./actions";

export const dynamic = "force-dynamic";

type TableRow = {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
};

type TableSessionRow = {
  id: string;
  table_id: string;
  opened_at: string;
  status: "OPEN" | "CLOSED";
  tables?: { name: string } | null;
};

export default async function TablesPage() {
  const supabase = await createClient();
  const { data: tables } = await supabase
    .from("tables")
    .select("id, name, active, sort_order")
    .order("sort_order")
    .order("name");

  const { data: sessions } = await supabase
    .from("table_sessions")
    .select("id, table_id, opened_at, status, tables(name)")
    .eq("status", "OPEN")
    .order("opened_at");

  const activeSessionsByTable = new Map(
    (sessions as TableSessionRow[] | null)?.map((session) => [
      session.table_id,
      session,
    ]) ?? []
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Mesas</h1>
        <p className="text-sm text-neutral-600">
          Gerencie mesas e sessoes abertas.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {(tables as TableRow[] | null)?.length ? (
            (tables as TableRow[]).map((table) => {
              const session = activeSessionsByTable.get(table.id);
              return (
                <div
                  key={table.id}
                  className="rounded border p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium">{table.name}</p>
                    <p className="text-xs text-neutral-500">
                      Status: {table.active ? "Ativa" : "Inativa"}
                    </p>
                    {session && (
                      <p className="text-xs text-neutral-500">
                        Sessao aberta em{" "}
                        {new Date(session.opened_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!session ? (
                      <form action={openTableSession}>
                        <input type="hidden" name="tableId" value={table.id} />
                        <button className="rounded border px-3 py-1 text-sm">
                          Abrir mesa
                        </button>
                      </form>
                    ) : (
                      <form action={closeTableSession}>
                        <input
                          type="hidden"
                          name="sessionId"
                          value={session.id}
                        />
                        <button className="rounded border px-3 py-1 text-sm">
                          Fechar mesa
                        </button>
                      </form>
                    )}
                    <form action={toggleTableStatus}>
                      <input type="hidden" name="tableId" value={table.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={(!table.active).toString()}
                      />
                      <button className="rounded border px-3 py-1 text-sm">
                        {table.active ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-neutral-500">Nenhuma mesa cadastrada.</p>
          )}
        </div>

        <div className="space-y-4 rounded border p-4">
          <h2 className="text-base font-semibold">Nova mesa</h2>
          <form className="space-y-3" action={createTable}>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome</label>
              <input
                className="w-full rounded border px-3 py-2"
                name="name"
                placeholder="Mesa 1"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Ordem</label>
              <input
                className="w-full rounded border px-3 py-2"
                name="sortOrder"
                placeholder="0"
                defaultValue="0"
              />
            </div>
            <button className="w-full rounded bg-black px-4 py-2 text-white">
              Criar mesa
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

