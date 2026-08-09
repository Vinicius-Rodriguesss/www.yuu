/**
 * Anexa os produtos vendidos (appointment_products) em cada agendamento de uma lista, com uma
 * única query + agrupamento em memória — evita N+1 sem precisar de join SQL, mesmo padrão
 * "sem join" já usado no resto do listAppointments/getAppointment.
 */

import { inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appointmentProductsTable } from "../../db/schema/appointmentProducts.js";

export interface AppointmentProductView {
  productId: number | null;
  name: string;
  unitPrice: string;
  quantity: number;
}

export const attachAppointmentProducts = async <T extends { id: number }>(
  appointments: T[]
): Promise<(T & { products: AppointmentProductView[] })[]> => {
  if (appointments.length === 0) return [];

  const ids = appointments.map((a) => a.id);
  const rows = await db
    .select({
      appointmentId: appointmentProductsTable.appointmentId,
      productId: appointmentProductsTable.productId,
      name: appointmentProductsTable.name,
      unitPrice: appointmentProductsTable.unitPrice,
      quantity: appointmentProductsTable.quantity,
    })
    .from(appointmentProductsTable)
    .where(inArray(appointmentProductsTable.appointmentId, ids));

  const byAppointmentId = new Map<number, AppointmentProductView[]>();
  for (const row of rows) {
    const list = byAppointmentId.get(row.appointmentId) ?? [];
    list.push({ productId: row.productId, name: row.name, unitPrice: row.unitPrice, quantity: row.quantity });
    byAppointmentId.set(row.appointmentId, list);
  }

  return appointments.map((appt) => ({ ...appt, products: byAppointmentId.get(appt.id) ?? [] }));
};
