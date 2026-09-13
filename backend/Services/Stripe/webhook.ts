// Services/Stripe/webhook.ts
//
// Única fonte de verdade pro status da assinatura — nunca escrevemos
// status "na mão" fora daqui. Precisa chegar com o corpo raw (sem o
// express.json ter processado antes), por causa da verificação de
// assinatura do Stripe.
import type { Request, Response } from "express";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { subscriptionsTable } from "../../db/schema/subscriptions.js";
import { stripe } from "./client.js";

const upsertFromSubscription = async (subscription: Stripe.Subscription) => {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const periodEndItem = subscription.items.data[0];

  await db
    .update(subscriptionsTable)
    .set({
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: periodEndItem ? new Date(periodEndItem.current_period_end * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionsTable.stripeCustomerId, customerId));
};

const StripeWebhook = async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ error: "Pagamentos ainda não configurados" });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers["stripe-signature"];

  if (!webhookSecret || !signature) {
    return res.status(400).json({ error: "Assinatura do webhook ausente" });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    console.error("ERRO WEBHOOK STRIPE (assinatura inválida):", error);
    return res.status(400).json({ error: "Assinatura inválida" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertFromSubscription(subscription);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertFromSubscription(subscription);
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("ERRO WEBHOOK STRIPE (processamento):", error);
    return res.status(500).json({ error: "Erro ao processar evento" });
  }
};

export default StripeWebhook;
