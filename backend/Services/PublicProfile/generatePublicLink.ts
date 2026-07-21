/**
 * Service: GeneratePublicLink
 *
 * POST /user/public-link
 * Gera (ou retorna, se já existir) o slug público único do profissional,
 * usado na página pública de agendamento: /p/<slug>
 */

import type { Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";

/** "João Barbearia" → "joao-barbearia" */
const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const GeneratePublicLink = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const [user] = await db
      .select({ name: usersTable.name, publicSlug: usersTable.publicSlug })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    let slug = user.publicSlug;

    if (!slug) {
      const base = slugify(user.name) || "profissional";

      // Tenta o slug base; em colisão, acrescenta sufixo aleatório até ser único
      for (let attempt = 0; attempt < 5 && !slug; attempt++) {
        const candidate = attempt === 0 ? base : `${base}-${randomBytes(3).toString("hex")}`;
        const [existing] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.publicSlug, candidate))
          .limit(1);
        if (!existing) slug = candidate;
      }

      if (!slug) {
        slug = randomBytes(8).toString("hex");
      }

      await db
        .update(usersTable)
        .set({ publicSlug: slug, updatedAt: new Date() })
        .where(eq(usersTable.id, userId));
    }

    return res.status(200).json({
      publicSlug: slug,
      publicPath: `/p/${slug}`,
    });
  } catch (error) {
    console.error("ERRO PUBLIC LINK:", error);
    return res.status(500).json({ error: "Erro ao gerar link público" });
  }
};

export default GeneratePublicLink;
