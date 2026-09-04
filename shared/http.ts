// Cliente HTTP agnóstico de plataforma. A web injeta localStorage; o app
// injeta SecureStore/AsyncStorage. Nenhuma referência a window/localStorage aqui.

export interface ApiClientOptions {
  /** Ex.: "https://api.yuu.ai" ou "http://localhost:3000". */
  baseUrl: string;
  /** Retorna o token atual (ou null). Pode ser async. */
  getToken?: () => string | null | Promise<string | null>;
  /** Chamado quando a API responde 401 com um token presente (sessão expirada). */
  onUnauthorized?: () => void | Promise<void>;
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export interface ApiClient {
  get<T = unknown>(path: string, init?: RequestInit): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
  put<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
  del<T = unknown>(path: string, init?: RequestInit): Promise<T>;
  request<T = unknown>(path: string, init?: RequestInit): Promise<T>;
}

/**
 * Fuso do dispositivo em minutos a leste de UTC (Brasil UTC-3 → -180).
 * Enviado ao backend para cálculos de "agora/hoje". Os horários em si são
 * "hora de parede": o que se agenda é o que aparece, sem conversão de fuso.
 */
export const tzOffsetMin = -new Date().getTimezoneOffset();

export function createApiClient(opts: ApiClientOptions): ApiClient {
  const base = opts.baseUrl.replace(/\/$/, "");

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const token = opts.getToken ? await opts.getToken() : null;

    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

    const data = await res.json().catch(() => null);

    if (res.status === 401 && token && opts.onUnauthorized) {
      await opts.onUnauthorized();
    }

    if (!res.ok) {
      const msg =
        (data && (data.error || data.message)) || `Erro na requisição (${res.status})`;
      throw new ApiError(msg, res.status, data);
    }

    return data as T;
  };

  const withBody =
    (method: string) =>
    <T>(path: string, body?: unknown, init: RequestInit = {}) =>
      request<T>(path, {
        ...init,
        method,
        body: body === undefined ? init.body : JSON.stringify(body),
      });

  return {
    request,
    get: (path, init) => request(path, { ...init, method: "GET" }),
    post: withBody("POST"),
    put: withBody("PUT"),
    patch: withBody("PATCH"),
    del: (path, init) => request(path, { ...init, method: "DELETE" }),
  };
}
