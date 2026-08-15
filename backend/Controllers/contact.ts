import { Router } from "express";
import { contactLimiter } from "../Auth/Middleware/rateLimit.js";

import SendContactMessage from "../Services/Contact/sendContactMessage.js";

const router = Router();

router.post("/contact", contactLimiter, async (req, res) => {
  SendContactMessage(req, res);
});

export default router;
