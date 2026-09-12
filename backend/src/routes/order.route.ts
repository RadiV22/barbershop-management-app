import { Router } from "express";
import {
  createOrder,
  getAllOrder,
  getOrderHistory,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder,
} from "../controllers/order.controller.js";
import { createPayment } from "../controllers/payment.controller.js";

const orderRouter = Router();

orderRouter.post("/", createOrder);
orderRouter.get("/", getAllOrder);
orderRouter.get("/history", getOrderHistory);
orderRouter.get("/:id", getOrderById);
orderRouter.patch("/:id/status", updateOrderStatus);
orderRouter.delete("/:id", deleteOrder);
orderRouter.post("/:id/payment", createPayment);

export default orderRouter;
