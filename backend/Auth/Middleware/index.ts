// middleware/auth.ts
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { config } from "dotenv";

config({ path: "../.env" });

interface TokenPayload extends JwtPayload {
  userId: number;
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: "Token não fornecido",
    });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      error: "Token mal formatado",
    });
  }

  const token = parts[1];

  if (!token) {
    return res.status(401).json({
      error: "Token não fornecido",
    });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({
      error: "JWT_SECRET não configurado",
    });
  }

  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;

    (req as any).userId = decoded.userId;

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Token inválido",
    });
  }
};