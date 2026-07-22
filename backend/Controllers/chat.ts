import { Router } from "express";
import SendChatMessage from "../Services/Chat/sendChatMessage.js";

const router = Router();

// Chat público do assistente de IA do profissional (sem autenticação)
router.post("/public/:slug/chat", async (req, res) => {
  SendChatMessage(req, res);
});

export default router;
