import { Router } from "express";
import { authMiddleware } from "../Auth/Middleware/index.js";

import ListProducts from "../Services/Products/listProducts.js";
import CreateProduct from "../Services/Products/createProduct.js";
import UpdateProduct from "../Services/Products/updateProduct.js";
import ToggleProductStatus from "../Services/Products/toggleProductStatus.js";
import DeleteProduct from "../Services/Products/deleteProduct.js";

const router = Router();

router.get("/products", authMiddleware, async (req, res) => {
  ListProducts(req, res);
});

router.post("/products", authMiddleware, async (req, res) => {
  CreateProduct(req, res);
});

router.put("/products/:id", authMiddleware, async (req, res) => {
  UpdateProduct(req, res);
});

router.patch("/products/:id/toggle", authMiddleware, async (req, res) => {
  ToggleProductStatus(req, res);
});

router.delete("/products/:id", authMiddleware, async (req, res) => {
  DeleteProduct(req, res);
});

export default router;
