import { Router } from "express";
import { authMiddleware } from "../Auth/Middleware/index.js";
import CreateCheckoutSession from "../Services/Stripe/createCheckoutSession.js";
import CreatePortalSession from "../Services/Stripe/createPortalSession.js";

const router = Router();

router.post("/billing/checkout-session", authMiddleware, async (req, res) => {
  CreateCheckoutSession(req, res);
});

router.post("/billing/portal-session", authMiddleware, async (req, res) => {
  CreatePortalSession(req, res);
});

export default router;
