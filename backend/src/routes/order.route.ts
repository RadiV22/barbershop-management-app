import { Router } from "express";
import {
  createOrder,
  getAllOrder,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder,
} from "../controllers/order.controller.js";

const orderRouter = Router();

orderRouter.post("/", createOrder);
orderRouter.get("/", getAllOrder);
orderRouter.get("/:id", getOrderById);
orderRouter.patch("/:id/status", updateOrderStatus);
orderRouter.patch("/:id/payment", updatePaymentStatus);
orderRouter.delete("/:id", deleteOrder);

export default orderRouter;
