import { Router } from "express";
import { authMiddleware } from "../Auth/Middleware/index.js";

import ListServices from "../Services/CreatedServicesUser/listServices.js";
import CreateService from "../Services/CreatedServicesUser/createService.js";
import UpdateService from "../Services/CreatedServicesUser/updateService.js";
import ToggleServiceStatus from "../Services/CreatedServicesUser/toggleServiceStatus.js";
import DeleteService from "../Services/CreatedServicesUser/deleteService.js";

const router = Router();

router.get("/services", authMiddleware, async (req, res) => {
  ListServices(req, res);
});

router.post("/services", authMiddleware, async (req, res) => {
  CreateService(req, res);
});

router.put("/services/:id", authMiddleware, async (req, res) => {
  UpdateService(req, res);
});

router.patch("/services/:id/toggle", authMiddleware, async (req, res) => {
  ToggleServiceStatus(req, res);
});

router.delete("/services/:id", authMiddleware, async (req, res) => {
  DeleteService(req, res);
});

export default router;
