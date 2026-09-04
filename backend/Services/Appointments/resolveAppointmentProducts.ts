/**
 * Resolve a lista de produtos vendidos junto de um agendamento (ex: pomada, shampoo).
 * Mesma lógica de "nunca confiar no preço vindo do cliente" já usada pro serviço: busca
 * o preço atual do produto no banco (escopado por userId) e monta o snapshot que vai pra
 * `appointment_products`. Usado tanto por CreateAppointment quanto por UpdateAppointment.
 */

import { eq, and, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { productsTable } from "../../db/schema/products.js";

export interface ResolvedAppointmentProduct {
  productId: number;
  name: string;
  unitPrice: string;
  quantity: number;
  trackStock: boolean;
}

export const resolveAppointmentProducts = async (
  userId: number,
  input: { productId: number; quantity: number }[] | undefined
): Promise<{ resolved: ResolvedAppointmentProduct[]; total: number } | { error: string }> => {
  if (!input || input.length === 0) {
    return { resolved: [], total: 0 };
  }

  const productIds = input.map((p) => Number(p.productId));
  const products = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      price: productsTable.price,
      trackStock: productsTable.trackStock,
      stockQuantity: productsTable.stockQuantity,
    })
    .from(productsTable)
    .where(and(inArray(productsTable.id, productIds), eq(productsTable.userId, userId)));

  const resolved: ResolvedAppointmentProduct[] = [];
  let total = 0;

  for (const item of input) {
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: "Quantidade de produto inválida" };
    }
    const product = products.find((p) => p.id === Number(item.productId));
    if (!product) {
      return { error: "Produto não encontrado" };
    }
    // Checagem "otimista" aqui pra dar um erro cedo e amigável; a garantia real
    // contra concorrência é o decremento atômico em decrementStock (dentro da transação).
    if (product.trackStock && product.stockQuantity < quantity) {
      return { error: `Estoque insuficiente para "${product.name}" (disponível: ${product.stockQuantity})` };
    }
    resolved.push({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      quantity,
      trackStock: product.trackStock,
    });
    total += Number(product.price) * quantity;
  }

  return { resolved, total };
};
