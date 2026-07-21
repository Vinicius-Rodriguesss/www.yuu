import { Router } from "express";
import { authMiddleware } from "../Auth/Middleware/index.js";

import CreateCustomer from "../Services/Customers/createCustomer.js";
import ListCustomers from "../Services/Customers/listCustomers.js";
import GetCustomer from "../Services/Customers/getCustomer.js";
import UpdateCustomer from "../Services/Customers/updateCustomer.js";
import DeleteCustomer from "../Services/Customers/deleteCustomer.js";

const router = Router();

router.post("/customers", authMiddleware, async (req, res) => {
  CreateCustomer(req, res);
});

router.get("/customers", authMiddleware, async (req, res) => {
  ListCustomers(req, res);
});

router.get("/customers/:id", authMiddleware, async (req, res) => {
  GetCustomer(req, res);
});

router.put("/customers/:id", authMiddleware, async (req, res) => {
  UpdateCustomer(req, res);
});

router.delete("/customers/:id", authMiddleware, async (req, res) => {
  DeleteCustomer(req, res);
});

export default router;
