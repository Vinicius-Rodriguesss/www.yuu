// Services/Stripe/createPortalSession.ts
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { subscriptionsTable } from "../../db/schema/subscriptions.js";
import { stripe } from "./client.js";

// Portal do Stripe pro dono do negócio gerenciar cartão/assinatura sem a
// gente precisar construir tela nenhuma pra isso.
const CreatePortalSession = async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Pagamentos ainda não configurados" });
    }

    const userId = (req as any).userId;

    const [subscription] = await db
      .select({ stripeCustomerId: subscriptionsTable.stripeCustomerId })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId))
      .limit(1);

    if (!subscription) {
      return res.status(404).json({ error: "Nenhuma assinatura encontrada" });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${frontendUrl}/config`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("ERRO PORTAL SESSION:", error);
    return res.status(500).json({ error: "Erro ao abrir portal de pagamento" });
  }
};

export default CreatePortalSession;
