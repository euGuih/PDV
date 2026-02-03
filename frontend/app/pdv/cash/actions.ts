"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const parseAmount = (value: FormDataEntryValue | null) => {
  if (!value) return null;
  const normalized = String(value).trim().replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  return Number(amount.toFixed(2));
};

const parseMovementType = (value: FormDataEntryValue | null) => {
  const type = String(value ?? "").toUpperCase();
  if (type === "SUPPLY" || type === "WITHDRAW") return type;
  return null;
};

export async function openCashRegister(formData: FormData) {
  const openingAmount = parseAmount(formData.get("openingAmount"));
  if (openingAmount === null || openingAmount < 0) {
    throw new Error("Valor inicial inválido.");
  }

  const supabase = await createClient();
  const { data: openRegister } = await supabase
    .from("cash_registers")
    .select("id")
    .eq("status", "OPEN")
    .maybeSingle();

  if (openRegister) {
    throw new Error("Já existe um caixa aberto.");
  }

  const { error } = await supabase.from("cash_registers").insert({
    opening_amount: openingAmount,
    status: "OPEN",
  });

  if (error) {
    throw new Error("Não foi possível abrir o caixa.");
  }

  revalidatePath("/pdv");
  revalidatePath("/pdv/cash");
  redirect("/pdv");
}

export async function closeCashRegister(formData: FormData) {
  const countedAmount = parseAmount(formData.get("countedAmount"));
  if (countedAmount === null || countedAmount < 0) {
    throw new Error("Valor contado inválido.");
  }

  const supabase = await createClient();
  const { data: openRegister } = await supabase
    .from("cash_registers")
    .select("id")
    .eq("status", "OPEN")
    .maybeSingle();

  if (!openRegister) {
    throw new Error("Nenhum caixa aberto.");
  }

  const { error } = await supabase
    .from("cash_registers")
    .update({
      closing_amount: countedAmount,
      closed_at: new Date().toISOString(),
      status: "CLOSED",
    })
    .eq("id", openRegister.id);

  if (error) {
    throw new Error("Não foi possível fechar o caixa.");
  }

  revalidatePath("/pdv");
  revalidatePath("/pdv/cash");
  redirect("/pdv");
}

export async function createCashMovement(formData: FormData) {
  const type = parseMovementType(formData.get("type"));
  const amount = parseAmount(formData.get("amount"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!type) {
    throw new Error("Tipo de movimento inválido.");
  }
  if (amount === null || amount <= 0) {
    throw new Error("Valor do movimento inválido.");
  }
  if (!reason) {
    throw new Error("Motivo obrigatório.");
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: openRegister } = await supabase
    .from("cash_registers")
    .select("id")
    .eq("status", "OPEN")
    .maybeSingle();

  if (!openRegister) {
    throw new Error("Nenhum caixa aberto.");
  }

  const { data: openShift } = await supabase
    .from("shifts")
    .select("id")
    .eq("status", "OPEN")
    .eq("opened_by", userData.user.id)
    .maybeSingle();

  const { error } = await supabase.from("cash_movements").insert({
    cash_register_id: openRegister.id,
    shift_id: openShift?.id ?? null,
    type,
    amount,
    reason,
    created_by: userData.user.id,
  });

  if (error) {
    throw new Error("Não foi possível registrar o movimento.");
  }

  revalidatePath("/pdv/cash");
  revalidatePath("/pdv/reports");
}

