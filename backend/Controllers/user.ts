import { Router } from "express";
import { authMiddleware } from "../Auth/Middleware/index.js";
import { signupLimiter } from "../Auth/Middleware/rateLimit.js";

import Signup from "../Services/signup.js";
import UpdateSettings from "../Services/UpdateSettings.js";
import GetProfile from "../Services/GetProfile.js";
import GeneratePublicLink from "../Services/PublicProfile/generatePublicLink.js";
import GetPublicProfile from "../Services/PublicProfile/getPublicProfile.js";
import RequestPasswordChangeCode from "../Services/Password/requestPasswordChangeCode.js";
import ConfirmPasswordChange from "../Services/Password/confirmPasswordChange.js";

const router = Router();

// Signup não precisa de autenticação
router.post("/signup", signupLimiter, async (req, res) => {
  Signup(req, res);
});

router.put("/user/settings", authMiddleware, async (req, res) => {
  UpdateSettings(req, res);
});

router.get("/user/profile", authMiddleware, async (req, res) => {
  GetProfile(req, res);
});

router.post("/user/public-link", authMiddleware, async (req, res) => {
  GeneratePublicLink(req, res);
});

router.post("/user/password/request-code", authMiddleware, async (req, res) => {
  RequestPasswordChangeCode(req, res);
});

router.post("/user/password/confirm", authMiddleware, async (req, res) => {
  ConfirmPasswordChange(req, res);
});

// Página pública do profissional (sem autenticação)
router.get("/public/:slug", async (req, res) => {
  GetPublicProfile(req, res);
});

export default router;
