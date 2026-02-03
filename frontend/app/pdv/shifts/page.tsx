import { createClient } from "@/lib/supabase/server";
import { closeShift, openShift } from "./actions";

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const userId = userData?.user?.id ?? null;

  const { data: openShift } = await supabase
    .from("shifts")
    .select("id, opened_at, note_open")
    .eq("status", "OPEN")
    .eq("opened_by", userId ?? "")
    .maybeSingle();

  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, opened_at, closed_at, status, note_open, note_close")
    .order("opened_at", { ascending: false })
    .limit(10);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Turnos</h1>
        <p className="text-sm text-neutral-600">
          Abra e feche turnos para organizar a operacao.
        </p>
      </div>

      {!openShift ? (
        <form className="space-y-3 rounded border p-4" action={openShift}>
          <div className="space-y-1">
            <label className="text-sm font-medium">Observacoes de abertura</label>
            <textarea
              className="w-full rounded border px-3 py-2"
              name="noteOpen"
              placeholder="Opcional"
            />
          </div>
          <button className="rounded bg-black px-4 py-2 text-white">
            Abrir turno
          </button>
        </form>
      ) : (
        <form className="space-y-3 rounded border p-4" action={closeShift}>
          <p className="text-sm">
            Turno aberto em{" "}
            <span className="font-medium">
              {new Date(openShift.opened_at).toLocaleString()}
            </span>
          </p>
          {openShift.note_open && (
            <p className="text-xs text-neutral-500">
              Nota: {openShift.note_open}
            </p>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium">Observacoes de fechamento</label>
            <textarea
              className="w-full rounded border px-3 py-2"
              name="noteClose"
              placeholder="Opcional"
            />
          </div>
          <button className="rounded bg-black px-4 py-2 text-white">
            Fechar turno
          </button>
        </form>
      )}

      <div className="rounded border p-4">
        <h2 className="text-base font-semibold">Ultimos turnos</h2>
        <div className="mt-3 space-y-2 text-sm">
          {shifts?.length ? (
            shifts.map((shift) => (
              <div
                key={shift.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 last:border-b-0"
              >
                <div>
                  <p>
                    {new Date(shift.opened_at).toLocaleString()} ·{" "}
                    {shift.status === "OPEN" ? "Aberto" : "Fechado"}
                  </p>
                  {shift.note_open && (
                    <p className="text-xs text-neutral-500">
                      Nota abertura: {shift.note_open}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-neutral-500">
                  {shift.closed_at
                    ? `Fechado em ${new Date(shift.closed_at).toLocaleString()}`
                    : "Ainda aberto"}
                  {shift.note_close && (
                    <p>Nota fechamento: {shift.note_close}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-neutral-500">Nenhum turno registrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}

