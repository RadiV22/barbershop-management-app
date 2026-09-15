import { Router } from "express";
import {
  createService,
  getAllService,
  getServiceById,
  updateService,
  deleteService,
} from "../controllers/service.controller.js";
import { role } from "../middlewares/role.middleware.js";

const serviceRouter = Router();

serviceRouter.post("/", role(["ADMIN"]), createService);
serviceRouter.get("/", role(["ADMIN", "STAFF"]), getAllService);
serviceRouter.get("/:id", role(["ADMIN", "STAFF"]), getServiceById);
serviceRouter.put("/:id", role(["ADMIN"]), updateService);
serviceRouter.delete("/:id", role(["ADMIN"]), deleteService);

export default serviceRouter;
