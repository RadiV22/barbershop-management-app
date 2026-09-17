import { Router } from "express";
import {
  createOrder,
  getAllOrder,
  getOrderHistory,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
} from "../controllers/order.controller.js";
import { createPayment } from "../controllers/payment.controller.js";
import { downloadInvoice } from "../controllers/invoice.controller.js";
import { role } from "../middlewares/role.middleware.js";

const orderRouter = Router();

orderRouter.post("/", role(["ADMIN", "STAFF"]), createOrder);
orderRouter.get("/", role(["ADMIN", "STAFF"]), getAllOrder);
orderRouter.get("/history", role(["ADMIN", "STAFF"]), getOrderHistory);
orderRouter.get("/:id", role(["ADMIN", "STAFF"]), getOrderById);
orderRouter.patch("/:id/status", role(["ADMIN", "STAFF"]), updateOrderStatus);
orderRouter.delete("/:id", role(["ADMIN", "STAFF"]), deleteOrder);
orderRouter.post("/:id/payment", role(["ADMIN", "STAFF"]), createPayment);
orderRouter.get("/:id/invoice", role(["ADMIN", "STAFF"]), downloadInvoice);

export default orderRouter;
