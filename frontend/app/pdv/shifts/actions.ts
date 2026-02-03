"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function openShift(formData: FormData) {
  const noteOpen = String(formData.get("noteOpen") ?? "").trim();
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: existingShift } = await supabase
    .from("shifts")
    .select("id")
    .eq("status", "OPEN")
    .eq("opened_by", userData.user.id)
    .maybeSingle();

  if (existingShift) {
    throw new Error("Já existe um turno aberto.");
  }

  const { data: openRegister } = await supabase
    .from("cash_registers")
    .select("id")
    .eq("status", "OPEN")
    .maybeSingle();

  const { error } = await supabase.from("shifts").insert({
    opened_by: userData.user.id,
    cash_register_id: openRegister?.id ?? null,
    note_open: noteOpen || null,
    status: "OPEN",
  });

  if (error) {
    throw new Error("Não foi possível abrir o turno.");
  }

  revalidatePath("/pdv/shifts");
  revalidatePath("/pdv");
}

export async function closeShift(formData: FormData) {
  const noteClose = String(formData.get("noteClose") ?? "").trim();
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: openShift } = await supabase
    .from("shifts")
    .select("id")
    .eq("status", "OPEN")
    .eq("opened_by", userData.user.id)
    .maybeSingle();

  if (!openShift) {
    throw new Error("Nenhum turno aberto.");
  }

  const { error } = await supabase
    .from("shifts")
    .update({
      status: "CLOSED",
      closed_at: new Date().toISOString(),
      closed_by: userData.user.id,
      note_close: noteClose || null,
    })
    .eq("id", openShift.id)
    .eq("status", "OPEN");

  if (error) {
    throw new Error("Não foi possível fechar o turno.");
  }

  revalidatePath("/pdv/shifts");
  revalidatePath("/pdv");
}

