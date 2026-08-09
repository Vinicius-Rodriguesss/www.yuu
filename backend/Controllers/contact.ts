import { Router } from "express";

import SendContactMessage from "../Services/Contact/sendContactMessage.js";

const router = Router();

router.post("/contact", async (req, res) => {
  SendContactMessage(req, res);
});

export default router;
