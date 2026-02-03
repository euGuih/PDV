"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const parseAmount = (value: FormDataEntryValue | null) => {
  if (!value) return null;
  const normalized = String(value).replace(",", ".");
  const amount = Number(normalized);
  if (Number.isNaN(amount)) return null;
  return amount;
};

export async function openCashRegister(formData: FormData) {
  const openingAmount = parseAmount(formData.get("openingAmount"));
  if (openingAmount === null) {
    throw new Error("Valor inicial inválido.");
  }

  const supabase = createClient();
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
  if (countedAmount === null) {
    throw new Error("Valor contado inválido.");
  }

  const supabase = createClient();
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

