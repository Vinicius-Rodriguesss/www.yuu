import { Router } from "express";
import { clientAuthMiddleware } from "../Auth/Middleware/clientAuth.js";
import SendChatMessage from "../Services/Chat/sendChatMessage.js";

const router = Router();

// Chat público do assistente de IA do profissional — exige login do cliente final
router.post("/public/:slug/chat", clientAuthMiddleware, async (req, res) => {
  SendChatMessage(req, res);
});

export default router;
