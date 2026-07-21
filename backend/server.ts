import express from "express";
import cors from "cors";
import Auth from "./Auth/Controller/index.js"
import UserController from "./Controllers/user.js";
import ServicesController from "./Controllers/services.js";
import CustomersController from "./Controllers/customers.js";
import CustomerAddressesController from "./Controllers/customerAddresses.js";
import CustomerHistoriesController from "./Controllers/customerHistories.js";
import AppointmentsController from "./Controllers/appointments.js";
import WorkScheduleDaysController from "./Controllers/workScheduleDays.js";
import BlockedSlotsController from "./Controllers/blockedSlots.js";
import DashboardController from "./Controllers/dashboard.js";
import AvailabilityController from "./Controllers/availability.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173", // endereço do seu frontend
    credentials: true, // se for usar cookies/sessão futuramente
  })
);

app.use(express.json());

// Responsável por fazer a autenticação dos usuários
app.use(Auth);

app.use(UserController);
app.use(ServicesController);
app.use(CustomersController);
app.use(CustomerAddressesController);
app.use(CustomerHistoriesController);
app.use(AppointmentsController);
app.use(WorkScheduleDaysController);
app.use(BlockedSlotsController);
app.use(DashboardController);
app.use(AvailabilityController);

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});