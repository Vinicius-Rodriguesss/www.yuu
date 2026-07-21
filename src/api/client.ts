export const API_URL = "http://localhost:3000";

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
