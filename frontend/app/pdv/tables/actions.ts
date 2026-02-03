"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const parseTableName = (value: FormDataEntryValue | null) => {
  const name = String(value ?? "").trim();
  return name.length ? name : null;
};

export async function createTable(formData: FormData) {
  const name = parseTableName(formData.get("name"));
  const sortOrder = Number(formData.get("sortOrder") ?? 0);

  if (!name) {
    throw new Error("Nome da mesa inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tables").insert({
    name,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  });

  if (error) {
    throw new Error("Não foi possível criar a mesa.");
  }

  revalidatePath("/pdv/tables");
  revalidatePath("/pdv/orders");
}

export async function toggleTableStatus(formData: FormData) {
  const tableId = String(formData.get("tableId") ?? "").trim();
  const active = formData.get("active") === "true";

  if (!tableId) {
    throw new Error("Mesa inválida.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tables")
    .update({ active })
    .eq("id", tableId);

  if (error) {
    throw new Error("Não foi possível atualizar a mesa.");
  }

  revalidatePath("/pdv/tables");
  revalidatePath("/pdv/orders");
}

export async function openTableSession(formData: FormData) {
  const tableId = String(formData.get("tableId") ?? "").trim();
  if (!tableId) {
    throw new Error("Mesa inválida.");
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: openSession } = await supabase
    .from("table_sessions")
    .select("id")
    .eq("status", "OPEN")
    .eq("table_id", tableId)
    .maybeSingle();

  if (openSession) {
    throw new Error("Mesa já está aberta.");
  }

  const { error } = await supabase.from("table_sessions").insert({
    table_id: tableId,
    opened_by: userData.user.id,
    status: "OPEN",
  });

  if (error) {
    throw new Error("Não foi possível abrir a mesa.");
  }

  revalidatePath("/pdv/tables");
  revalidatePath("/pdv/orders");
}

export async function closeTableSession(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  if (!sessionId) {
    throw new Error("Sessão inválida.");
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    throw new Error("Usuário não autenticado.");
  }

  const { error } = await supabase
    .from("table_sessions")
    .update({
      status: "CLOSED",
      closed_at: new Date().toISOString(),
      closed_by: userData.user.id,
    })
    .eq("id", sessionId)
    .eq("status", "OPEN");

  if (error) {
    throw new Error("Não foi possível fechar a mesa.");
  }

  revalidatePath("/pdv/tables");
  revalidatePath("/pdv/orders");
}

