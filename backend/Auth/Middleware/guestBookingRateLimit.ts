// Auth/Middleware/guestBookingRateLimit.ts
//
// Agendamento como convidado (sem cadastro) não tem token pra identificar
// quem está fazendo a requisição, então fica mais fácil de abusar (spam de
// horários fake). Esse limitador é só pra esse caminho: por IP, no máximo
// GUEST_BOOKING_LIMIT tentativas de POST /public/:slug/appointments dentro
// de GUEST_BOOKING_WINDOW_MS. Clientes logados (com clientAccountId) não
// passam por aqui — eles já são identificáveis pelo token.

import type { Request, Response, NextFunction } from "express";

const GUEST_BOOKING_LIMIT = 5;
const GUEST_BOOKING_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

const attemptsByIp = new Map<string, number[]>();

// Evita crescimento infinito do Map em processos de longa duração.
setInterval(() => {
  const cutoff = Date.now() - GUEST_BOOKING_WINDOW_MS;
  for (const [ip, timestamps] of attemptsByIp) {
    const recent = timestamps.filter((t) => t > cutoff);
    if (recent.length === 0) attemptsByIp.delete(ip);
    else attemptsByIp.set(ip, recent);
  }
}, GUEST_BOOKING_WINDOW_MS).unref();

export const guestBookingRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Cliente logado: não é convidado, não entra no limite.
  if ((req as any).clientAccountId) {
    next();
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const cutoff = now - GUEST_BOOKING_WINDOW_MS;
  const recent = (attemptsByIp.get(ip) ?? []).filter((t) => t > cutoff);

  if (recent.length >= GUEST_BOOKING_LIMIT) {
    res.status(429).json({ error: "Muitas tentativas de agendamento. Tente novamente em alguns minutos." });
    return;
  }

  recent.push(now);
  attemptsByIp.set(ip, recent);
  next();
};
