import { Router } from "express";
import { authMiddleware } from "../Auth/Middleware/index.js";

import CreateCustomerHistory from "../Services/CustomerHistories/createHistory.js";
import ListCustomerHistories from "../Services/CustomerHistories/listHistories.js";
import DeleteCustomerHistory from "../Services/CustomerHistories/deleteHistory.js";

const router = Router();

router.post("/customers/:customerId/histories", authMiddleware, async (req, res) => {
  CreateCustomerHistory(req, res);
});

router.get("/customers/:customerId/histories", authMiddleware, async (req, res) => {
  ListCustomerHistories(req, res);
});

router.delete("/customers/histories/:id", authMiddleware, async (req, res) => {
  DeleteCustomerHistory(req, res);
});

export default router;
