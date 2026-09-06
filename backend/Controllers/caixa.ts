import { Router } from "express";
import { authMiddleware } from "../Auth/Middleware/index.js";

import ListCaixaSales from "../Services/Caixa/listCaixaSales.js";
import CreateCaixaSale from "../Services/Caixa/createCaixaSale.js";
import DeleteCaixaSale from "../Services/Caixa/deleteCaixaSale.js";

const router = Router();

router.get("/caixa", authMiddleware, async (req, res) => {
  ListCaixaSales(req, res);
});

router.post("/caixa", authMiddleware, async (req, res) => {
  CreateCaixaSale(req, res);
});

router.delete("/caixa/:id", authMiddleware, async (req, res) => {
  DeleteCaixaSale(req, res);
});

export default router;
