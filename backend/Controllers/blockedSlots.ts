import { Router } from "express";
import { authMiddleware } from "../Auth/Middleware/index.js";

import CreateBlockedSlot from "../Services/BlockedSlots/createBlockedSlot.js";
import ListBlockedSlots from "../Services/BlockedSlots/listBlockedSlots.js";
import DeleteBlockedSlot from "../Services/BlockedSlots/deleteBlockedSlot.js";

const router = Router();

router.post("/blocked-slots", authMiddleware, async (req, res) => {
  CreateBlockedSlot(req, res);
});

router.get("/blocked-slots", authMiddleware, async (req, res) => {
  ListBlockedSlots(req, res);
});

router.delete("/blocked-slots/:id", authMiddleware, async (req, res) => {
  DeleteBlockedSlot(req, res);
});

export default router;
