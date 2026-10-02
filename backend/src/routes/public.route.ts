import { Router } from "express";
import { getPublicServices } from "../controllers/public.controller.js";

const publicRouter = Router();

publicRouter.get("/services", getPublicServices);

export default publicRouter;
