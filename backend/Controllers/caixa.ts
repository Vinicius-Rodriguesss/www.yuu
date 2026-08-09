import { Router } from "express";
import { authMiddleware } from "../Auth/Middleware/index.js";

import ListCaixaEntries from "../Services/Caixa/listCaixaEntries.js";
import CreateCaixaEntry from "../Services/Caixa/createCaixaEntry.js";
import DeleteCaixaEntry from "../Services/Caixa/deleteCaixaEntry.js";

const router = Router();

router.get("/caixa", authMiddleware, async (req, res) => {
  ListCaixaEntries(req, res);
});

router.post("/caixa", authMiddleware, async (req, res) => {
  CreateCaixaEntry(req, res);
});

router.delete("/caixa/:id", authMiddleware, async (req, res) => {
  DeleteCaixaEntry(req, res);
});

export default router;
