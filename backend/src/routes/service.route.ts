import { Router } from "express";
import {
  createService,
  getAllService,
  getServiceById,
  updateService,
  deleteService,
} from "../controllers/service.controller.js";

const serviceRouter = Router();

serviceRouter.post("/", createService);
serviceRouter.get("/", getAllService);
serviceRouter.get("/:id", getServiceById);
serviceRouter.put("/:id", updateService);
serviceRouter.delete("/", deleteService);

export default serviceRouter;
