import { Router } from "express";
import { authMiddleware } from "../Auth/Middleware/index.js";

import GetDashboard from "../Services/Dashboard/getDashboard.js";

const router = Router();

router.get("/dashboard", authMiddleware, async (req, res) => {
  GetDashboard(req, res);
});

export default router;
