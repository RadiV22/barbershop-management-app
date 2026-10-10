import { Router } from "express";
import {
  getPublicServices,
  getPublicKapsters,
} from "../controllers/public.controller.js";
import { getAvailability } from "../controllers/schedule.controller.js";

const publicRouter = Router();

publicRouter.get("/services", getPublicServices);
publicRouter.get("/kapster", getPublicKapsters);
publicRouter.get("/availability", getAvailability);

export default publicRouter;
