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

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Nome inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ name });
  if (error) {
    throw new Error("Não foi possível criar a categoria.");
  }
  revalidatePath("/pdv/products");
}

export async function saveProduct(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = parseAmount(formData.get("price"));
  const trackStock = formData.get("trackStock") === "on";
  const stockQty = Number(formData.get("stockQty") ?? 0);
  const minStock = Number(formData.get("minStock") ?? 0);

  if (!name || price === null || price < 0) {
    throw new Error("Dados inválidos.");
  }
  if (!Number.isFinite(stockQty) || stockQty < 0) {
    throw new Error("Estoque inválido.");
  }
  if (!Number.isFinite(minStock) || minStock < 0) {
    throw new Error("Estoque mínimo inválido.");
  }

  const supabase = await createClient();

  if (productId) {
    const { error } = await supabase
      .from("products")
      .update({
        name,
        price,
        category_id: categoryId || null,
        description: description || null,
        track_stock: trackStock,
        stock_qty: Math.floor(stockQty),
        min_stock: Math.floor(minStock),
      })
      .eq("id", productId);

    if (error) {
      throw new Error("Não foi possível atualizar o produto.");
    }
  } else {
    const { error } = await supabase.from("products").insert({
      name,
      price,
      category_id: categoryId || null,
      description: description || null,
      active: true,
      track_stock: trackStock,
      stock_qty: Math.floor(stockQty),
      min_stock: Math.floor(minStock),
    });

    if (error) {
      throw new Error("Não foi possível criar o produto.");
    }
  }

  revalidatePath("/pdv/products");
}

export async function toggleProductStatus(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim();
  const active = formData.get("active") === "true";

  if (!productId) {
    throw new Error("Produto inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ active })
    .eq("id", productId);

  if (error) {
    throw new Error("Não foi possível atualizar o status.");
  }

  revalidatePath("/pdv/products");
}

