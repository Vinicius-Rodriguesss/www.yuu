// Auth/Middleware/index.ts

import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { config } from "dotenv";

config({ path: "../.env" });

interface TokenPayload extends JwtPayload {
  id: number;
  name: string;
  document: string;
  accountType: string;
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

    (req as any).userId = decoded.id;
    next();
  } catch (error) {
    console.error(error);

    res.status(401).json({
      error: "Token inválido",
    });
  }
}