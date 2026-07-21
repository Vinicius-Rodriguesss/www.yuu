/**
 * Estimativa de tempo de deslocamento entre o profissional e o cliente.
 *
 * Provedores (em ordem):
 * 1. Google Distance Matrix — usado quando GOOGLE_MAPS_API_KEY está definida no .env
 * 2. Fallback gratuito: Nominatim (geocodificação) + OSRM (rota de carro)
 *
 * Retorna minutos (arredondado pra cima) ou null se não conseguir calcular.
 */

import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { addressesTable } from "../../db/schema/addresses.js";
import { customerAddressesTable } from "../../db/schema/customerAddresses.js";

interface AddressLike {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}

export const addressToString = (a: AddressLike) =>
  `${a.street}, ${a.number}, ${a.neighborhood}, ${a.city} - ${a.state}, ${a.cep}, Brasil`;

const geocode = async (query: string): Promise<{ lat: string; lon: string } | null> => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`,
    { headers: { "User-Agent": "yuu-agenda/1.0" } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { lat: string; lon: string }[];
  return data[0] ?? null;
};

export const estimateTravelMinutes = async (
  origin: string,
  destination: string
): Promise<number | null> => {
  try {
    const key = process.env.GOOGLE_MAPS_API_KEY;

    if (key) {
      const url =
        `https://maps.googleapis.com/maps/api/distancematrix/json` +
        `?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}` +
        `&mode=driving&key=${key}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        const el = data?.rows?.[0]?.elements?.[0];
        if (el?.status === "OK" && el.duration?.value) {
          return Math.ceil(el.duration.value / 60);
        }
      }
      console.warn("Distance Matrix sem resultado, tentando fallback OSRM");
    }

    // Fallback gratuito: Nominatim + OSRM
    const [o, d] = await Promise.all([geocode(origin), geocode(destination)]);
    if (!o || !d) return null;

    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${o.lon},${o.lat};${d.lon},${d.lat}?overview=false`
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const seconds = data?.routes?.[0]?.duration;
    return seconds ? Math.ceil(seconds / 60) : null;
  } catch (error) {
    console.error("ERRO ESTIMATIVA DESLOCAMENTO:", error);
    return null;
  }
};

/**
 * Resolve o deslocamento de um atendimento a domicílio:
 * endereço do profissional → endereço do cliente (o informado, o principal, ou o mais recente).
 * Retorna { minutes, addressId } — minutes null quando não foi possível calcular.
 */
export const resolveHomeServiceTravel = async (
  userId: number,
  customerId: number,
  customerAddressId?: number
): Promise<{ minutes: number | null; addressId: number | null }> => {
  const [professionalAddress] = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, userId))
    .limit(1);

  let customerAddress = null;

  if (customerAddressId) {
    [customerAddress] = await db
      .select()
      .from(customerAddressesTable)
      .where(
        and(
          eq(customerAddressesTable.id, customerAddressId),
          eq(customerAddressesTable.customerId, customerId)
        )
      )
      .limit(1);
  }

  if (!customerAddress) {
    // principal primeiro, senão o mais recente
    [customerAddress] = await db
      .select()
      .from(customerAddressesTable)
      .where(eq(customerAddressesTable.customerId, customerId))
      .orderBy(desc(customerAddressesTable.isPrimary), desc(customerAddressesTable.id))
      .limit(1);
  }

  if (!customerAddress) {
    return { minutes: null, addressId: null };
  }

  if (!professionalAddress) {
    return { minutes: null, addressId: customerAddress.id };
  }

  const minutes = await estimateTravelMinutes(
    addressToString(professionalAddress),
    addressToString(customerAddress)
  );

  return { minutes, addressId: customerAddress.id };
};
