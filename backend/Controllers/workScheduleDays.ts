import { Router } from "express";
import { authMiddleware } from "../Auth/Middleware/index.js";

import CreateWorkScheduleDays from "../Services/WorkScheduleDays/createDays.js";
import ListWorkScheduleDays from "../Services/WorkScheduleDays/listDays.js";

const router = Router();

router.post("/work-schedules/:workScheduleId/days", authMiddleware, async (req, res) => {
  CreateWorkScheduleDays(req, res);
});

router.get("/work-schedules/:workScheduleId/days", authMiddleware, async (req, res) => {
  ListWorkScheduleDays(req, res);
});

export default router;
