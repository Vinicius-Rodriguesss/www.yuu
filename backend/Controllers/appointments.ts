import { Router } from "express";
import { authMiddleware } from "../Auth/Middleware/index.js";

import CreateAppointment from "../Services/Appointments/createAppointment.js";
import ListAppointments from "../Services/Appointments/listAppointments.js";
import GetAppointment from "../Services/Appointments/getAppointment.js";
import UpdateAppointmentStatus from "../Services/Appointments/updateStatus.js";
import GenerateMeetingLink from "../Services/Appointments/generateMeetingLink.js";

const router = Router();

router.post("/appointments", authMiddleware, async (req, res) => {
  CreateAppointment(req, res);
});

router.get("/appointments", authMiddleware, async (req, res) => {
  ListAppointments(req, res);
});

router.get("/appointments/:id", authMiddleware, async (req, res) => {
  GetAppointment(req, res);
});

router.patch("/appointments/:id/status", authMiddleware, async (req, res) => {
  UpdateAppointmentStatus(req, res);
});

router.post("/appointments/:id/meeting-link", authMiddleware, async (req, res) => {
  GenerateMeetingLink(req, res);
});

export default router;
