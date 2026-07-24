export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Fuso do navegador em minutos a leste de UTC (Brasil UTC-4 → -240).
 * Enviado ao backend para cálculos de "agora/hoje". Os horários em si são
 * "hora de parede": o que você agenda é o que aparece, sem conversão de fuso.
 */
export const tzOffsetMin = -new Date().getTimezoneOffset();

export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Erro na requisição");
  }

  return data;
};

// ===================== Sessão do CLIENTE FINAL (páginas públicas /p/:slug) =====================

export interface ClientAddress {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface ClientSession {
  id: number;
  name: string;
  cpf: string;
  phone: string;
  address: ClientAddress | null;
}

export const getClientToken = () => localStorage.getItem("clientToken");

export const getClientSession = (): ClientSession | null => {
  try {
    const raw = localStorage.getItem("clientSession");
    return raw ? (JSON.parse(raw) as ClientSession) : null;
  } catch {
    return null;
  }
};

export const saveClientSession = (token: string, client: ClientSession) => {
  localStorage.setItem("clientToken", token);
  localStorage.setItem("clientSession", JSON.stringify(client));
};

export const clearClientSession = () => {
  localStorage.removeItem("clientToken");
  localStorage.removeItem("clientSession");
};

/**
 * Igual ao apiFetch, mas autentica com o token do CLIENTE FINAL.
 * Se a sessão expirou (401), limpa a sessão e recarrega — o ClientAuthGate
 * volta a pedir login.
 */
export const clientApiFetch = async (path: string, options: RequestInit = {}) => {
  const token = getClientToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (response.status === 401) {
    clearClientSession();
    window.location.reload();
    throw new Error(data?.error || "Sessão expirada");
  }

  if (!response.ok) {
    throw new Error(data?.error || "Erro na requisição");
  }

  return data;
};
