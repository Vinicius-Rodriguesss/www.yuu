/**
 * Cotação da gasolina em tempo real.
 *
 * Fonte: https://combustivelapi.com.br/ (dados da Petrobras, por estado).
 * A resposta traz o preço médio por UF (ex: "sp": "6,43") e a média
 * nacional ("br").
 *
 * Estratégia:
 * - Cache em memória por 6h (o preço muda no máximo diariamente).
 * - Se a API falhar, usa o último valor em cache mesmo vencido.
 * - Se nunca respondeu, usa o preço padrão FALLBACK_GASOLINE_PRICE.
 */

const FUEL_API_URL = "https://combustivelapi.com.br/api/precos/";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas
/** Usado apenas se a API nunca respondeu desde que o servidor subiu */
export const FALLBACK_GASOLINE_PRICE = 6.5;

interface FuelCache {
  fetchedAt: number;
  /** preço por UF em minúsculo + "br" (média nacional), em R$/litro */
  gasolina: Record<string, number>;
}

let cache: FuelCache | null = null;

const parsePrice = (v: unknown): number | null => {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const n = Number(String(v).replace(",", "."));
  return isFinite(n) && n > 0 ? n : null;
};

const fetchPrices = async (): Promise<Record<string, number> | null> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(FUEL_API_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data: any = await res.json();
    const raw = data?.precos?.gasolina;
    if (!raw || typeof raw !== "object") return null;

    const parsed: Record<string, number> = {};
    for (const [uf, value] of Object.entries(raw)) {
      const price = parsePrice(value);
      if (price) parsed[uf.toLowerCase()] = price;
    }
    return Object.keys(parsed).length ? parsed : null;
  } catch (error) {
    console.warn("Cotação da gasolina indisponível:", error instanceof Error ? error.message : error);
    return null;
  }
};

/**
 * Preço atual da gasolina em R$/litro.
 * @param state UF do profissional (ex: "SP") — usa a média nacional se a UF
 *              não estiver na resposta da API.
 */
export const getGasolinePrice = async (state?: string | null): Promise<number> => {
  const now = Date.now();

  if (!cache || now - cache.fetchedAt > CACHE_TTL_MS) {
    const prices = await fetchPrices();
    if (prices) {
      cache = { fetchedAt: now, gasolina: prices };
    }
    // Se falhou, mantém o cache antigo (mesmo vencido) como melhor estimativa
  }

  if (!cache) return FALLBACK_GASOLINE_PRICE;

  const uf = state?.trim().toLowerCase();
  return (uf && cache.gasolina[uf]) || cache.gasolina["br"] || FALLBACK_GASOLINE_PRICE;
};
