import { Router } from "express";
import Authentication from "../Service/authentication.js"
import AuthenticationPage from "../Service/authenticationPage.js"
import VerifyLoginCode from "../Service/verifyLoginCode.js"
import ForgotPassword from "../../Services/Password/forgotPassword.js"
import ResetPassword from "../../Services/Password/resetPassword.js"
import { authLimiter, passwordResetLimiter } from "../Middleware/rateLimit.js"
const Controllers = Router();


// Authentication
Controllers.post("/authentication", authLimiter, async (req, res) => {
 Authentication(req, res);
})

// Segunda etapa do login (código de verificação por email)
Controllers.post("/authentication/verify-code", authLimiter, async (req, res) => {
 VerifyLoginCode(req, res);
})

// Authentication Page
Controllers.post("/validate-token", async (req, res) => {
 AuthenticationPage(req, res);
})

// Esqueci minha senha
Controllers.post("/forgot-password", passwordResetLimiter, async (req, res) => {
 ForgotPassword(req, res);
})

Controllers.post("/reset-password", passwordResetLimiter, async (req, res) => {
 ResetPassword(req, res);
})

export default Controllers;