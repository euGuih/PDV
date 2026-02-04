"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const toNumber = (value: FormDataEntryValue | null) => {
  if (!value) return 0;
  const normalized = String(value).trim().replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return 0;
  return amount;
};

export async function saveModifierGroup(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const minSelect = Math.max(0, Math.floor(toNumber(formData.get("minSelect"))));
  const maxSelect = Math.max(0, Math.floor(toNumber(formData.get("maxSelect"))));
  const required = formData.get("required") === "on";

  if (!name) {
    throw new Error("Nome inválido.");
  }

  const supabase = await createClient();

  if (groupId) {
    const { error } = await supabase
      .from("modifier_groups")
      .update({
        name,
        min_select: minSelect,
        max_select: maxSelect,
        required,
      })
      .eq("id", groupId);

    if (error) {
      throw new Error("Não foi possível atualizar o grupo.");
    }
  } else {
    const { error } = await supabase.from("modifier_groups").insert({
      name,
      min_select: minSelect,
      max_select: maxSelect,
      required,
      active: true,
    });

    if (error) {
      throw new Error("Não foi possível criar o grupo.");
    }
  }

  revalidatePath("/pdv/modifiers");
}

export async function toggleModifierGroupStatus(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "").trim();
  const active = formData.get("active") === "true";

  if (!groupId) {
    throw new Error("Grupo inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("modifier_groups")
    .update({ active })
    .eq("id", groupId);

  if (error) {
    throw new Error("Não foi possível atualizar o status.");
  }

  revalidatePath("/pdv/modifiers");
}

export async function saveModifier(formData: FormData) {
  const modifierId = String(formData.get("modifierId") ?? "").trim();
  const groupId = String(formData.get("groupId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const price = toNumber(formData.get("price"));

  if (!groupId || !name || price < 0) {
    throw new Error("Dados inválidos.");
  }

  const supabase = await createClient();

  if (modifierId) {
    const { error } = await supabase
      .from("modifiers")
      .update({ name, price })
      .eq("id", modifierId);

    if (error) {
      throw new Error("Não foi possível atualizar o adicional.");
    }
  } else {
    const { error } = await supabase.from("modifiers").insert({
      group_id: groupId,
      name,
      price,
      active: true,
    });

    if (error) {
      throw new Error("Não foi possível criar o adicional.");
    }
  }

  revalidatePath("/pdv/modifiers");
}

export async function toggleModifierStatus(formData: FormData) {
  const modifierId = String(formData.get("modifierId") ?? "").trim();
  const active = formData.get("active") === "true";

  if (!modifierId) {
    throw new Error("Adicional inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("modifiers")
    .update({ active })
    .eq("id", modifierId);

  if (error) {
    throw new Error("Não foi possível atualizar o status.");
  }

  revalidatePath("/pdv/modifiers");
}

export async function assignGroupToProducts(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "").trim();
  const productIds = formData.getAll("productIds").map((entry) => String(entry));

  if (!groupId) {
    throw new Error("Grupo inválido.");
  }

  const supabase = await createClient();

  await supabase
    .from("product_modifier_groups")
    .delete()
    .eq("modifier_group_id", groupId);

  if (productIds.length > 0) {
    const { error } = await supabase.from("product_modifier_groups").insert(
      productIds.map((productId, index) => ({
        product_id: productId,
        modifier_group_id: groupId,
        sort_order: index,
      }))
    );

    if (error) {
      throw new Error("Não foi possível salvar os vínculos.");
    }
  }

  revalidatePath("/pdv/modifiers");
}

