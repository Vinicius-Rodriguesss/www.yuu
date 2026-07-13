import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const AuthenticationPage = (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1]; // pega o que vem depois de "Bearer "

    if (!token) {
      return res.status(400).json({
        error: 'Token é obrigatório'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');

    return res.status(200).json({
      valid: true,
      message: 'Token válido'
    });

  } catch (error) {
    return res.status(401).json({
      valid: false,
      error: 'Token inválido ou expirado'
    });
  }
};

export default AuthenticationPage;