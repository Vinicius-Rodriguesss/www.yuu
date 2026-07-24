/**
 * Service: SendChatMessage
 *
 * POST /public/:slug/chat — SEM autenticação.
 * Recebe uma mensagem do cliente final e responde usando a IA configurada,
 * seguindo o "treinamento" (aiStyle/customAiStyle) definido pelo profissional
 * no cadastro/configurações.
 */

import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { servicesTable } from "../../db/schema/services.js";
import { clientAccountsTable } from "../../db/schema/clientAccounts.js";
import {
  AiNotConfiguredError,
  callAiProvider,
  type ChatMessage,
} from "./aiProvider.js";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 20;

const AI_STYLE_INSTRUCTIONS: Record<string, string> = {
  direto: "Responda de forma direta, objetiva e curta, sem enrolação.",
  amigavel: "Responda de forma calorosa, simpática e acolhedora, como alguém que gosta de atender bem.",
  profissional: "Responda de forma profissional e cordial.",
};

const buildSystemPrompt = (user: {
  name: string;
  businessType: string;
  homeService: boolean;
  aiStyle: string;
  customAiStyle: string | null;
}, services: { title: string; description: string | null; duration: number; price: string }[], clientName?: string | null) => {
  const styleInstruction = AI_STYLE_INSTRUCTIONS[user.aiStyle] ?? AI_STYLE_INSTRUCTIONS.profissional;

  const servicesList = services.length
    ? services
        .map((s) => `- ${s.title} (${s.duration} min, R$ ${s.price})${s.description ? `: ${s.description}` : ""}`)
        .join("\n")
    : "Nenhum serviço cadastrado no momento.";

  return [
    `Você é a assistente de atendimento virtual de "${user.name}", um negócio do tipo "${user.businessType}".`,
    user.homeService ? "Este profissional também atende a domicílio." : "",
    styleInstruction,
    user.customAiStyle ? `Instruções adicionais definidas pelo profissional: ${user.customAiStyle}` : "",
    `Serviços disponíveis:\n${servicesList}`,
    clientName ? `Você está falando com o(a) cliente "${clientName}" (já logado e identificado).` : "",
    "Ajude o cliente a entender os serviços e tirar dúvidas. Não invente informações que você não tem.",
  ]
    .filter(Boolean)
    .join("\n\n");
};

const SendChatMessage = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { message, history } = req.body as { message?: unknown; history?: unknown };

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Mensagem inválida" });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: "Mensagem muito longa" });
    }

    const safeHistory: ChatMessage[] = Array.isArray(history)
      ? history
          .filter(
            (m): m is ChatMessage =>
              m &&
              typeof m === "object" &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string" &&
              m.content.length <= MAX_MESSAGE_LENGTH
          )
          .slice(-MAX_HISTORY_MESSAGES)
      : [];

    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        businessType: usersTable.businessType,
        homeService: usersTable.homeService,
        aiStyle: usersTable.aiStyle,
        customAiStyle: usersTable.customAiStyle,
      })
      .from(usersTable)
      .where(eq(usersTable.publicSlug, String(slug)))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "Página não encontrada" });
    }

    const services = await db
      .select({
        title: servicesTable.title,
        description: servicesTable.description,
        duration: servicesTable.duration,
        price: servicesTable.price,
      })
      .from(servicesTable)
      .where(and(eq(servicesTable.userId, user.id), eq(servicesTable.active, true)));

    // Cliente final logado (clientAuthMiddleware): personaliza o atendimento
    const clientAccountId = (req as any).clientAccountId as number | undefined;
    let clientName: string | null = null;
    if (clientAccountId) {
      const [client] = await db
        .select({ name: clientAccountsTable.name })
        .from(clientAccountsTable)
        .where(eq(clientAccountsTable.id, clientAccountId))
        .limit(1);
      clientName = client?.name ?? null;
    }

    const systemPrompt = buildSystemPrompt(user, services, clientName);

    const reply = await callAiProvider(systemPrompt, [
      ...safeHistory,
      { role: "user", content: message.trim() },
    ]);

    return res.status(200).json({ reply });
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return res.status(503).json({ error: error.message });
    }
    console.error("ERRO CHAT IA:", error);
    return res.status(500).json({ error: "Erro ao processar mensagem" });
  }
};

export default SendChatMessage;
