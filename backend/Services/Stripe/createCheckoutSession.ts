// Services/Stripe/createCheckoutSession.ts
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema/users.js";
import { subscriptionsTable } from "../../db/schema/subscriptions.js";
import { stripe } from "./client.js";

const CreateCheckoutSession = async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Pagamentos ainda não configurados" });
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return res.status(503).json({ error: "Plano de assinatura não configurado" });
    }

    const userId = (req as any).userId;

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    if (!user.email) {
      return res.status(400).json({ error: "Cadastre um email antes de assinar" });
    }

    const [existing] = await db
      .select({ stripeCustomerId: subscriptionsTable.stripeCustomerId })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId))
      .limit(1);

    let customerId = existing?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: String(user.id) },
      });
      customerId = customer.id;

      await db
        .insert(subscriptionsTable)
        .values({ userId: user.id, stripeCustomerId: customerId })
        .onConflictDoUpdate({
          target: subscriptionsTable.userId,
          set: { stripeCustomerId: customerId },
        });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/config?assinatura=sucesso`,
      cancel_url: `${frontendUrl}/config?assinatura=cancelado`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("ERRO CHECKOUT SESSION:", error);
    return res.status(500).json({ error: "Erro ao iniciar pagamento" });
  }
};

export default CreateCheckoutSession;
