import { Router } from "express";
import { signupLimiter } from "../Auth/Middleware/rateLimit.js";
import GetSetupStatus from "../Services/Setup/getSetupStatus.js";
import CreateSuperAdmin from "../Services/Setup/createSuperAdmin.js";

const router = Router();

// Público — checado pelo front antes de mostrar a tela de login normal.
router.get("/setup/status", async (req, res) => {
  GetSetupStatus(req, res);
});

// Público, mas só funciona uma vez (enquanto não existir super admin).
router.post("/setup/super-admin", signupLimiter, async (req, res) => {
  CreateSuperAdmin(req, res);
});

export default router;
