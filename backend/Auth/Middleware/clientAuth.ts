// Auth/Middleware/clientAuth.ts
//
// Autenticação do CLIENTE FINAL (conta global usada nas páginas públicas
// /p/:slug e /p/:slug/agendar). Token separado do token do profissional:
// o payload carrega type: "client", que o authMiddleware do profissional
// rejeita — e aqui só aceitamos tokens com esse type.

import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { config } from "dotenv";

config({ path: "../.env" });

interface ClientTokenPayload extends JwtPayload {
  id: number;
  name: string;
  type: "client";
}

export const clientAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: "Faça login para continuar" });
    return;
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    res.status(401).json({ error: "Token mal formatado" });
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ error: "JWT_SECRET não configurado" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as ClientTokenPayload;

    if (decoded.type !== "client") {
      res.status(401).json({ error: "Token inválido" });
      return;
    }

    (req as any).clientAccountId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ error: "Sessão expirada, faça login novamente" });
  }
};
