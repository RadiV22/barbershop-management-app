import { Router } from "express";
import {
  createKapster,
  getAllKapster,
  getKapsterById,
  updateKapster,
  deleteKapster,
} from "../controllers/kapster.controller.js";

const kapsterRouter = Router();

kapsterRouter.post("/", createKapster);
kapsterRouter.get("/", getAllKapster);
kapsterRouter.get("/:id", getKapsterById);
kapsterRouter.put("/:id", updateKapster);
kapsterRouter.delete("/:id", deleteKapster);

export default kapsterRouter;
