import { Router } from "express";
import { authMiddleware } from "../Auth/Middleware/index.js";

import GetAvailability from "../Services/Availability/getAvailability.js";

const router = Router();

router.get("/availability", authMiddleware, async (req, res) => {
  GetAvailability(req, res);
});

export default router;
