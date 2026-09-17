import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller.js";

const dashboardRouter = Router();

dashboardRouter.get("/summary", getDashboardSummary);

export default dashboardRouter;
