import { Router } from "express";
import { clientAuthMiddleware } from "../Auth/Middleware/clientAuth.js";
import RegisterClient from "../Services/ClientAuth/registerClient.js";
import LoginClient from "../Services/ClientAuth/loginClient.js";
import GetClientMe from "../Services/ClientAuth/getClientMe.js";

const router = Router();

// Conta global do cliente final (páginas públicas /p/:slug)
router.post("/client/register", async (req, res) => {
  RegisterClient(req, res);
});

router.post("/client/login", async (req, res) => {
  LoginClient(req, res);
});

router.get("/client/me", clientAuthMiddleware, async (req, res) => {
  GetClientMe(req, res);
});

export default router;
