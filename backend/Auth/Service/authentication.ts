// services/authentication.ts
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { config } from "dotenv";
config({ path: "../.env" });

interface LoginBody {
  document: string;
  password: string;
}

const Authentication = async (req: Request<{}, {}, LoginBody>, res: Response) => {
  try {
    const { document, password } = req.body;

    if (!document || !password) {
      return res.status(400).json({
        message: "Documento e senha são obrigatórios",
      });
    }

    const cleanDocument = document.replace(/\D/g, "");

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.document, cleanDocument))
      .limit(1);


    if (!users || users.length === 0 || !users[0]) {
      return res.status(401).json({
        message: "Documento ou senha inválidos",
      });
    }

    const user = users[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Documento ou senha inválidos",
      });
    }

    const token = jwt.sign(
      { 
        id: user.id,
        name: user.name,
        document: user.document,
        accountType: user.accountType,
      },
      process.env.JWT_SECRET || "default_secret_key",
      { expiresIn: "1d" }
    );
 
    const userWithoutPassword = {
      id: user.id,
      name: user.name,
      document: user.document,
      accountType: user.accountType,
      homeService: user.homeService,
      businessType: user.businessType,
      aiStyle: user.aiStyle,
      customAiStyle: user.customAiStyle,
      privacyAccepted: user.privacyAccepted,
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      message: "Login realizado com sucesso",
      token,
      user: userWithoutPassword,
    });

  } catch (error: any) {
    console.error("Erro na autenticação:", error);
    return res.status(500).json({
      message: "Erro interno ao realizar login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export default Authentication;