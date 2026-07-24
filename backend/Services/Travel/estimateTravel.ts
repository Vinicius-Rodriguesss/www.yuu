/**
 * Estimativa de tempo de deslocamento entre o profissional e o cliente.
 *
 * Provedores (em ordem):
 * 1. Google Routes API — usado quando GOOGLE_MAPS_API_KEY está definida no .env.
 *    Usa routingPreference "TRAFFIC_AWARE" (considera trânsito em tempo real,
 *    igual ao app do Google Maps). Precisa da "Routes API" habilitada no
 *    Google Cloud Console pro projeto dono da chave (com billing ativo —
 *    tem cota gratuita mensal, mas exige cartão cadastrado).
 * 2. Fallback gratuito: Nominatim (geocodificação) + OSRM (rota de carro,
 *    SEM considerar trânsito — tende a subestimar o tempo em vias
 *    congestionadas). Usado quando a chave não está configurada ou a
 *    chamada ao Google falha por qualquer motivo.
 *
 * Retorna minutos (arredondado pra cima) ou null se não conseguir calcular.
 */

import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { addressesTable } from "../../db/schema/addresses.js";
import { customerAddressesTable } from "../../db/schema/customerAddresses.js";
import { usersTable } from "../../db/schema/users.js";

/**
 * Custo de deslocamento = distância real da rota × 2 (ida e volta) × taxa
 * fixa por km. A taxa é uma configuração do sistema (.env), não depende do
 * veículo ou consumo de cada profissional — que só escolhe a zona (raio) de
 * atendimento.
 *
 * Calibração: trajeto real Jundiapeba → Poá (~8,5 km), onde R$30 é o valor
 * de ida → taxa = 30 / 8,5 ≈ R$3,53/km, arredondada para R$3,50/km.
 *
 *   TRAVEL_RATE_PER_KM — R$ por km rodado (padrão 3.50)
 *   TRAVEL_MIN_COST    — valor mínimo de cobrança, evita valores irrisórios
 *                        em distâncias muito curtas (padrão 0 = sem mínimo)
 */
const travelRatePerKm = () => {
  const v = Number(process.env.TRAVEL_RATE_PER_KM);
  return isFinite(v) && v > 0 ? v : 3.5;
};

const travelMinCost = () => {
  const v = Number(process.env.TRAVEL_MIN_COST);
  return isFinite(v) && v > 0 ? v : 0;
};

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

export interface TravelEstimate {
  minutes: number;
  km: number;
}

/**
 * Cache de rotas por par origem→destino (2h): endereços repetidos — cliente
 * fiel agendando de novo, revalidação na confirmação — não gastam chamadas
 * do Google. TTL curto porque o tempo com trânsito muda ao longo do dia;
 * a distância em si praticamente não varia.
 */
const routeCache = new Map<string, { fetchedAt: number; result: TravelEstimate }>();
const ROUTE_CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const ROUTE_CACHE_MAX = 500;

export const estimateTravel = async (
  origin: string,
  destination: string
): Promise<TravelEstimate | null> => {
  const cacheKey = `${origin}|${destination}`.toLowerCase();
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < ROUTE_CACHE_TTL_MS) {
    return cached.result;
  }

  const result = await fetchTravelEstimate(origin, destination);
  if (result) {
    if (routeCache.size >= ROUTE_CACHE_MAX) {
      // Descarta a entrada mais antiga (Map preserva ordem de inserção)
      const oldest = routeCache.keys().next().value;
      if (oldest !== undefined) routeCache.delete(oldest);
    }
    routeCache.set(cacheKey, { fetchedAt: Date.now(), result });
  }
  return result;
};

const fetchTravelEstimate = async (
  origin: string,
  destination: string
): Promise<TravelEstimate | null> => {
  try {
    const key = process.env.GOOGLE_MAPS_API_KEY;

    if (key) {
      const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
        },
        body: JSON.stringify({
          origin: { address: origin },
          destination: { address: destination },
          travelMode: "DRIVE",
          // TRAFFIC_AWARE_OPTIMAL: usa trânsito ao vivo (não só condição
          // típica/histórica) — o mais próximo do que o app do Google Maps
          // mostra. Mais lento de calcular, mas mais preciso.
          routingPreference: "TRAFFIC_AWARE_OPTIMAL",
          // Precisa ser estritamente no futuro (a API rejeita "agora exato" por
          // causa da latência entre gerar o timestamp e o Google validar).
          departureTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        }),
      });

      if (res.ok) {
        const data: any = await res.json();
        const durationStr: string | undefined = data?.routes?.[0]?.duration; // ex: "5233s"
        const distanceMeters: number | undefined = data?.routes?.[0]?.distanceMeters;
        if (durationStr && distanceMeters !== undefined) {
          const seconds = parseInt(durationStr, 10);
          if (!isNaN(seconds)) {
            return { minutes: Math.ceil(seconds / 60), km: distanceMeters / 1000 };
          }
        }
        console.warn("Routes API sem resultado, tentando fallback OSRM:", JSON.stringify(data));
      } else {
        const errorBody = await res.text().catch(() => "");
        console.warn(`Routes API retornou ${res.status}, tentando fallback OSRM:`, errorBody.slice(0, 500));
      }
    }

    // Fallback gratuito: Nominatim + OSRM (sem trânsito)
    const [o, d] = await Promise.all([geocode(origin), geocode(destination)]);
    if (!o || !d) return null;

    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${o.lon},${o.lat};${d.lon},${d.lat}?overview=false`
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const seconds = data?.routes?.[0]?.duration;
    const meters = data?.routes?.[0]?.distance;
    if (!seconds || meters === undefined) return null;
    return { minutes: Math.ceil(seconds / 60), km: meters / 1000 };
  } catch (error) {
    console.error("ERRO ESTIMATIVA DESLOCAMENTO:", error);
    return null;
  }
};

/** @deprecated use estimateTravel() — mantido só por compatibilidade */
export const estimateTravelMinutes = async (origin: string, destination: string): Promise<number | null> => {
  const result = await estimateTravel(origin, destination);
  return result?.minutes ?? null;
};

export interface HomeServiceTravelResult {
  minutes: number | null;
  km: number | null;
  addressId: number | null;
  /** custo de deslocamento ida e volta: distância real × 2 × taxa fixa por km (TRAVEL_RATE_PER_KM) */
  travelCost: number;
  /** true quando a distância excede o limite configurado pelo profissional */
  exceedsMaxDistance: boolean;
  maxDistanceKm: number | null;
}

/**
 * Núcleo do cálculo de deslocamento: endereço do profissional → endereço de
 * destino (já resolvido pelo chamador). Custo repassado ao cliente =
 * distância real da rota × 2 (ida e volta) × taxa fixa por km
 * (TRAVEL_RATE_PER_KM), com valor mínimo opcional (TRAVEL_MIN_COST).
 */
const computeTravelResult = async (
  userId: number,
  destination: AddressLike | null,
  addressId: number | null
): Promise<HomeServiceTravelResult> => {
  const [professional] = await db
    .select({ maxDistanceKm: usersTable.homeServiceMaxDistanceKm })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const maxDistanceKm = professional?.maxDistanceKm ?? null;

  if (!destination) {
    return { minutes: null, km: null, addressId: null, travelCost: 0, exceedsMaxDistance: false, maxDistanceKm };
  }

  const [professionalAddress] = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, userId))
    .limit(1);

  if (!professionalAddress) {
    return { minutes: null, km: null, addressId, travelCost: 0, exceedsMaxDistance: false, maxDistanceKm };
  }

  const travel = await estimateTravel(addressToString(professionalAddress), addressToString(destination));

  if (!travel) {
    return { minutes: null, km: null, addressId, travelCost: 0, exceedsMaxDistance: false, maxDistanceKm };
  }

  const exceedsMaxDistance = maxDistanceKm !== null && travel.km > maxDistanceKm;

  // Distância × 2 (ida e volta) × taxa fixa por km, respeitando o valor mínimo
  const rawCost = travel.km * 2 * travelRatePerKm();
  const travelCost = Math.round(Math.max(rawCost, travelMinCost()) * 100) / 100;

  return {
    minutes: travel.minutes,
    km: Math.round(travel.km * 100) / 100,
    addressId,
    travelCost,
    exceedsMaxDistance,
    maxDistanceKm,
  };
};

/**
 * Resolve o deslocamento de um atendimento a domicílio a partir de um
 * endereço JÁ VINCULADO a um cliente do profissional (customer_addresses):
 * o informado, o principal, ou o mais recente.
 */
export const resolveHomeServiceTravel = async (
  userId: number,
  customerId: number,
  customerAddressId?: number
): Promise<HomeServiceTravelResult> => {
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

  return computeTravelResult(userId, customerAddress ?? null, customerAddress?.id ?? null);
};

/**
 * Resolve o deslocamento a partir de um endereço da conta GLOBAL do cliente
 * (client_addresses) — usado na PRÉ-VISUALIZAÇÃO de disponibilidade da
 * página pública de agendamento, ANTES de o agendamento existir (por isso
 * não depende de customer_addresses, que só é criado ao confirmar).
 */
export const resolveHomeServiceTravelFromClientAddress = async (
  userId: number,
  clientAddress: AddressLike & { id: number }
): Promise<HomeServiceTravelResult> => {
  return computeTravelResult(userId, clientAddress, clientAddress.id);
};
