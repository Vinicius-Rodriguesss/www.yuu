// Auth/Middleware/clientAuthOptional.ts
//
// Variante do clientAuthMiddleware que NÃO exige login: usada nas rotas
// públicas que também aceitam agendamento como convidado (sem cadastro).
// Se vier um Bearer token válido de cliente, popula req.clientAccountId
// normalmente; se não vier token (ou vier inválido/expirado), apenas segue
// em frente sem clientAccountId — a rota decide o que fazer nesse caso
// (ex: bloquear atendimento a domicílio, exigir nome/telefone no corpo).

import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { config } from "dotenv";

config({ path: "../.env" });

interface ClientTokenPayload extends JwtPayload {
  id: number;
  name: string;
  type: "client";
}

export const clientAuthOptional = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    next();
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as ClientTokenPayload;
    if (decoded.type === "client") {
      (req as any).clientAccountId = decoded.id;
    }
  } catch {
    // Token inválido/expirado: segue como convidado, sem derrubar a requisição.
  }

  next();
};
