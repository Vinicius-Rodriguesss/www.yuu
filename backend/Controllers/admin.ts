import { Router } from "express";
import { authMiddleware, requireSuperAdmin } from "../Auth/Middleware/index.js";

import GetAdminOverview from "../Services/Admin/getAdminOverview.js";
import ListBusinesses from "../Services/Admin/listBusinesses.js";
import GetBusinessDetail from "../Services/Admin/getBusinessDetail.js";

const router = Router();

// Todas as rotas /admin exigem sessão válida E role super_admin (conferido no banco).
router.use("/admin", authMiddleware, requireSuperAdmin);

router.get("/admin/overview", (req, res) => {
  GetAdminOverview(req, res);
});

router.get("/admin/businesses", (req, res) => {
  ListBusinesses(req, res);
});

router.get("/admin/businesses/:id", (req, res) => {
  GetBusinessDetail(req, res);
});

export default router;
