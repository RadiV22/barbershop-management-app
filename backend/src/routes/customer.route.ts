import { Router } from "express";
import {
  createCustomer,
  getAllCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customer.controller.js";
import {
  activateMembership,
  updateMembership,
} from "../controllers/membership.controller.js";

const customerRouter = Router();

customerRouter.post("/", createCustomer);
customerRouter.get("/", getAllCustomer);
customerRouter.get("/:id", getCustomerById);
customerRouter.put("/:id", updateCustomer);
customerRouter.delete("/:id", deleteCustomer);
customerRouter.post("/:id/membership", activateMembership);
customerRouter.patch("/:id/membership", updateMembership);

export default customerRouter;
