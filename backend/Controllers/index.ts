import { Router } from "express";
import Signup from "../Services/signup.js";
import ListServices from "../Services/CreatedServicesUser/listServices.js";
import CreateService from "../Services/CreatedServicesUser/createService.js";
import UpdateService from "../Services/CreatedServicesUser/updateService.js";
import ToggleServiceStatus from "../Services/CreatedServicesUser/toggleServiceStatus.js";
import DeleteService from "../Services/CreatedServicesUser/deleteService.js";
import { authMiddleware } from "../Auth/Middleware/index.js"; // ← Importa o middleware

const Controllers = Router();

// Signup (NÃO precisa de autenticação)
Controllers.post("/signup", async (req, res) => {
  Signup(req, res);
});

// Services (CRUD) - Protegidas com autenticação
Controllers.get("/services", authMiddleware, async (req, res) => {
  ListServices(req, res);
});

Controllers.post("/services", authMiddleware, async (req, res) => {
  CreateService(req, res);
});

Controllers.put("/services/:id", authMiddleware, async (req, res) => {
  UpdateService(req, res);
});

Controllers.patch("/services/:id/toggle", authMiddleware, async (req, res) => {
  ToggleServiceStatus(req, res);
});

Controllers.delete("/services/:id", authMiddleware, async (req, res) => {
  DeleteService(req, res);
});

export default Controllers;