import { Router } from "express";
import { authMiddleware, requireSuperAdmin } from "../Auth/Middleware/index.js";
import GetAdminOverview from "../Services/Admin/getAdminOverview.js";
import GetAdminUsers from "../Services/Admin/getAdminUsers.js";

const router = Router();

router.get("/admin/overview", authMiddleware, requireSuperAdmin, async (req, res) => {
  GetAdminOverview(req, res);
});

router.get("/admin/users", authMiddleware, requireSuperAdmin, async (req, res) => {
  GetAdminUsers(req, res);
});

export default router;
