import { Router } from "express";
import { clientAuthMiddleware } from "../Auth/Middleware/clientAuth.js";
import { clientAuthOptional } from "../Auth/Middleware/clientAuthOptional.js";
import { guestBookingRateLimit } from "../Auth/Middleware/guestBookingRateLimit.js";
import GetPublicAvailability from "../Services/PublicProfile/getPublicAvailability.js";
import PublicBookAppointment from "../Services/PublicProfile/publicBookAppointment.js";
import GetClientHistory from "../Services/PublicProfile/getClientHistory.js";

const router = Router();

// Agendamento público por botões — login do cliente final é opcional aqui:
// sem login também dá pra agendar (como convidado), mas atendimento a
// domicílio continua exigindo conta (ver publicBookAppointment/getPublicAvailability).
router.get("/public/:slug/availability", clientAuthOptional, async (req, res) => {
  GetPublicAvailability(req, res);
});

router.post("/public/:slug/appointments", clientAuthOptional, guestBookingRateLimit, async (req, res) => {
  PublicBookAppointment(req as never, res);
});

// Histórico do cliente com este profissional + serviços mais usados
router.get("/public/:slug/history", clientAuthMiddleware, async (req, res) => {
  GetClientHistory(req as never, res);
});

export default router;
