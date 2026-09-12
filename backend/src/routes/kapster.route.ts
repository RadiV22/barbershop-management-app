import { Router } from "express";
import {
  createKapster,
  getAllKapster,
  getKapsterById,
  updateKapster,
  deleteKapster,
} from "../controllers/kapster.controller.js";

const customerRouter = Router();

customerRouter.post("/", createKapster);
customerRouter.get("/", getAllKapster);
customerRouter.get("/:id", getKapsterById);
customerRouter.put("/:id", updateKapster);
customerRouter.delete("/:id", deleteKapster);

export default customerRouter;
