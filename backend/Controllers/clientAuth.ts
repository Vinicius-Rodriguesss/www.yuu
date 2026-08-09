import { Router } from "express";
import { clientAuthMiddleware } from "../Auth/Middleware/clientAuth.js";
import RegisterClient from "../Services/ClientAuth/registerClient.js";
import LoginClient from "../Services/ClientAuth/loginClient.js";
import GetClientMe from "../Services/ClientAuth/getClientMe.js";
import {
  ListClientAddresses,
  CreateClientAddress,
  UpdateClientAddress,
  DeleteClientAddress,
} from "../Services/ClientAuth/clientAddresses.js";

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

// Endereços do cliente (lista com CRUD — usados no atendimento a domicílio)
router.get("/client/addresses", clientAuthMiddleware, async (req, res) => {
  ListClientAddresses(req, res);
});

router.post("/client/addresses", clientAuthMiddleware, async (req, res) => {
  CreateClientAddress(req, res);
});

router.put("/client/addresses/:id", clientAuthMiddleware, async (req, res) => {
  UpdateClientAddress(req as never, res);
});

router.delete("/client/addresses/:id", clientAuthMiddleware, async (req, res) => {
  DeleteClientAddress(req as never, res);
});

export default router;
