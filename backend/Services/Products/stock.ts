/**
 * Controle de estoque de produtos.
 *
 * Produtos com trackStock=false têm estoque ilimitado (stockQuantity é ignorado).
 * Para os com trackStock=true, o decremento na venda é uma UPDATE condicional
 * atômica (`stockQuantity - qty` só aplica se sobrar >= 0) — evita vender mais
 * do que existe mesmo com duas requisições concorrentes.
 */
import { sql, eq, and, gte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { productsTable } from "../../db/schema/products.js";
import { appointmentProductsTable } from "../../db/schema/appointmentProducts.js";

export class InsufficientStockError extends Error {}

export interface StockConsumable {
  productId: number;
  name: string;
  quantity: number;
  trackStock: boolean;
}

/** `db` ou o `tx` recebido dentro de um `db.transaction(async (tx) => ...)`. */
type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Chame dentro da mesma transação que insere o agendamento/appointment_products. */
export const decrementStock = async (tx: DbOrTx, userId: number, items: StockConsumable[]) => {
  for (const item of items) {
    if (!item.trackStock) continue;
    const [dec] = await tx
      .update(productsTable)
      .set({ stockQuantity: sql`${productsTable.stockQuantity} - ${item.quantity}` })
      .where(
        and(
          eq(productsTable.id, item.productId),
          eq(productsTable.userId, userId),
          gte(productsTable.stockQuantity, item.quantity)
        )
      )
      .returning({ id: productsTable.id });
    if (!dec) {
      throw new InsufficientStockError(`Estoque insuficiente para "${item.name}"`);
    }
  }
};

/** Devolve ao estoque os itens já consumidos (mesma transação de quem chama, se houver). */
export const restoreStock = async (
  tx: DbOrTx,
  items: { productId: number | null; quantity: number }[]
) => {
  for (const item of items) {
    if (!item.productId) continue;
    await tx
      .update(productsTable)
      .set({ stockQuantity: sql`${productsTable.stockQuantity} + ${item.quantity}` })
      .where(and(eq(productsTable.id, item.productId), eq(productsTable.trackStock, true)));
  }
};

/** Devolve ao estoque todos os produtos vendidos num agendamento (ex: ao cancelar). */
export const restoreStockForAppointment = async (appointmentId: number) => {
  const items = await db
    .select({ productId: appointmentProductsTable.productId, quantity: appointmentProductsTable.quantity })
    .from(appointmentProductsTable)
    .where(eq(appointmentProductsTable.appointmentId, appointmentId));

  if (items.length === 0) return;

  await db.transaction(async (tx) => {
    await restoreStock(tx, items);
  });
};
