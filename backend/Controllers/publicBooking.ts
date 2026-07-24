import { Router } from "express";
import { clientAuthMiddleware } from "../Auth/Middleware/clientAuth.js";
import GetPublicAvailability from "../Services/PublicProfile/getPublicAvailability.js";
import PublicBookAppointment from "../Services/PublicProfile/publicBookAppointment.js";

const router = Router();

// Agendamento público por botões — exige login do cliente final
router.get("/public/:slug/availability", clientAuthMiddleware, async (req, res) => {
  GetPublicAvailability(req, res);
});

router.post("/public/:slug/appointments", clientAuthMiddleware, async (req, res) => {
  PublicBookAppointment(req as never, res);
});

export default router;
