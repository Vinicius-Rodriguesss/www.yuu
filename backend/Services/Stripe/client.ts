// Services/Stripe/client.ts
import Stripe from "stripe";
import { config } from "dotenv";
config({ path: "../.env" });

const secretKey = process.env.STRIPE_SECRET_KEY;

// Sem a chave configurada, os endpoints de billing respondem 503 em vez de
// derrubar o servidor inteiro — o resto do sistema não depende do Stripe.
export const stripe = secretKey ? new Stripe(secretKey) : null;
