import { Router } from "express";
import { authMiddleware } from "../Auth/Middleware/index.js";

import CreateCustomerAddress from "../Services/CustomerAddresses/createAddress.js";
import ListCustomerAddresses from "../Services/CustomerAddresses/listAddresses.js";
import UpdateCustomerAddress from "../Services/CustomerAddresses/updateAddress.js";
import DeleteCustomerAddress from "../Services/CustomerAddresses/deleteAddress.js";

const router = Router();

router.post("/customers/:customerId/addresses", authMiddleware, async (req, res) => {
  CreateCustomerAddress(req, res);
});

router.get("/customers/:customerId/addresses", authMiddleware, async (req, res) => {
  ListCustomerAddresses(req, res);
});

router.put("/customers/addresses/:id", authMiddleware, async (req, res) => {
  UpdateCustomerAddress(req, res);
});

router.delete("/customers/addresses/:id", authMiddleware, async (req, res) => {
  DeleteCustomerAddress(req, res);
});

export default router;
