// Services/Email/confirmEmailChange.ts
// Confirma a troca de email: exige o código enviado para o email pendente.
// Só aqui o `email` da conta é efetivamente alterado.
import type { Request, Response } from "express";
import { and, eq, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { verifyCode } from "./authCode.js";

const ConfirmEmailChange = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { code } = req.body as { code?: string };

    if (!code || String(code).trim().length !== 6) {
      return res.status(400).json({ error: "Informe o código de 6 dígitos" });
    }

    const [user] = await db
      .select({ id: usersTable.id, pendingEmail: usersTable.pendingEmail })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    if (!user.pendingEmail) {
      return res.status(400).json({ error: "Nenhuma troca de email pendente" });
    }

    const isValid = await verifyCode(userId, "email_change", String(code).trim());
    if (!isValid) {
      return res.status(400).json({ error: "Código inválido ou expirado" });
    }

    // Revalida unicidade no momento da confirmação (o email pode ter sido
    // tomado por outra conta entre o pedido e a confirmação).
    const [emailOwner] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.email, user.pendingEmail), ne(usersTable.id, userId)))
      .limit(1);

    if (emailOwner) {
      await db.update(usersTable).set({ pendingEmail: null }).where(eq(usersTable.id, userId));
      return res.status(409).json({ error: "Este email já está em uso por outra conta" });
    }

    await db
      .update(usersTable)
      .set({ email: user.pendingEmail, pendingEmail: null })
      .where(eq(usersTable.id, userId));

    return res.status(200).json({ email: user.pendingEmail, message: "Email alterado com sucesso" });
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: "Este email já está em uso por outra conta" });
    }
    console.error("ERRO CONFIRM EMAIL CHANGE:", error);
    return res.status(500).json({ error: "Erro ao alterar email" });
  }
};

export default ConfirmEmailChange;
