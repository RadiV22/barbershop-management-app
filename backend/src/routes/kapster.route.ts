import { Router } from "express";
import {
  createKapster,
  getAllKapster,
  getKapsterById,
  getKapsterSchedule,
  updateKapster,
  deleteKapster,
} from "../controllers/kapster.controller.js";
import { role } from "../middlewares/role.middleware.js";

const kapsterRouter = Router();

kapsterRouter.use(role(["ADMIN", "STAFF"]));

kapsterRouter.post("/", createKapster);
kapsterRouter.get("/", getAllKapster);
kapsterRouter.get("/:id/schedule", getKapsterSchedule);
kapsterRouter.get("/:id", getKapsterById);
kapsterRouter.put("/:id", updateKapster);
kapsterRouter.delete("/:id", deleteKapster);

export default kapsterRouter;
