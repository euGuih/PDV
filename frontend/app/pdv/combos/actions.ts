"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const parseAmount = (value: FormDataEntryValue | null) => {
  if (!value) return null;
  const normalized = String(value).trim().replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  return Number(amount.toFixed(2));
};

export async function saveCombo(formData: FormData) {
  const comboId = String(formData.get("comboId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = parseAmount(formData.get("price"));

  if (!name || price === null || price < 0) {
    throw new Error("Dados inválidos.");
  }

  const items: Array<{ product_id: string; quantity: number }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("productQty_")) continue;
    const productId = key.replace("productQty_", "");
    const quantity = Number(String(value).replace(",", "."));
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    items.push({ product_id: productId, quantity: Math.floor(quantity) });
  }

  const supabase = await createClient();

  if (comboId) {
    const { error } = await supabase
      .from("combos")
      .update({
        name,
        price,
        category_id: categoryId || null,
        description: description || null,
      })
      .eq("id", comboId);

    if (error) {
      throw new Error("Não foi possível atualizar o combo.");
    }

    await supabase.from("combo_items").delete().eq("combo_id", comboId);
    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("combo_items").insert(
        items.map((item) => ({
          combo_id: comboId,
          product_id: item.product_id,
          quantity: item.quantity,
        }))
      );
      if (itemsError) {
        throw new Error("Não foi possível salvar itens do combo.");
      }
    }
  } else {
    const { data: combo, error } = await supabase
      .from("combos")
      .insert({
        name,
        price,
        category_id: categoryId || null,
        description: description || null,
        active: true,
      })
      .select("id")
      .single();

    if (error || !combo) {
      throw new Error("Não foi possível criar o combo.");
    }

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("combo_items").insert(
        items.map((item) => ({
          combo_id: combo.id,
          product_id: item.product_id,
          quantity: item.quantity,
        }))
      );
      if (itemsError) {
        throw new Error("Não foi possível salvar itens do combo.");
      }
    }
  }

  revalidatePath("/pdv/combos");
}

export async function toggleComboStatus(formData: FormData) {
  const comboId = String(formData.get("comboId") ?? "").trim();
  const active = formData.get("active") === "true";

  if (!comboId) {
    throw new Error("Combo inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("combos")
    .update({ active })
    .eq("id", comboId);

  if (error) {
    throw new Error("Não foi possível atualizar o status.");
  }

  revalidatePath("/pdv/combos");
}

