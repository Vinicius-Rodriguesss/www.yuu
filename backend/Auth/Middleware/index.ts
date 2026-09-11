// Auth/Middleware/index.ts

import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { config } from "dotenv";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";

config({ path: "../.env" });

interface TokenPayload extends JwtPayload {
  id: number;
  name: string;
  document: string;
  accountType: string;
  role?: string; // "owner" | "super_admin" — ausente em tokens antigos
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: "Token não fornecido",
    });
    return;
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    res.status(401).json({
      error: "Token mal formatado",
    });
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({
      error: "JWT_SECRET não configurado",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;

    // Tokens temporários (ex: pendingToken do login 2FA) não dão acesso a rotas protegidas
    if ((decoded as any).type) {
      res.status(401).json({ error: "Token inválido" });
      return;
    }

    (req as any).userId = decoded.id;
    (req as any).userRole = decoded.role ?? "owner";
    next();
  } catch (error) {
    console.error(error);

    res.status(401).json({
      error: "Token inválido",
    });
  }
}

/**
 * Restringe a rota ao super admin da plataforma. Precisa rodar DEPOIS do
 * `authMiddleware` (usa o `userId` que ele injeta).
 *
 * O `role` do token serve só como filtro rápido — a decisão final confere o
 * banco, porque o JWT vale 1 dia e um usuário pode ter sido rebaixado nesse
 * meio-tempo (ou o token ter sido emitido antes da coluna existir).
 */
export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).userId as number | undefined;

    if (!userId) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }

    const [user] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user || user.role !== "super_admin") {
      res.status(403).json({ error: "Acesso restrito ao administrador da plataforma" });
      return;
    }

    next();
  } catch (error) {
    console.error("Erro no requireSuperAdmin:", error);
    res.status(500).json({ error: "Erro ao validar permissão" });
  }
};