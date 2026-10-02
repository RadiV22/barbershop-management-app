import { Router } from "express";
import serviceRouter from "./service.route.js";
import customerRouter from "./customer.route.js";
import kapsterRouter from "./kapster.route.js";
import orderRouter from "./order.route.js";
import authRouter from "./auth.route.js";
import dashboardRouter from "./dashboard.route.js";
import { authentication } from "../middlewares/auth.middleware.js";
import { role } from "../middlewares/role.middleware.js";
import publicRouter from "./public.route.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/public", publicRouter);

router.use(authentication);

router.use("/dashboard", role(["ADMIN", "STAFF"]), dashboardRouter);
router.use("/services", serviceRouter);
router.use("/customer", role(["ADMIN", "STAFF"]), customerRouter);
router.use("/kapster", role(["ADMIN", "STAFF"]), kapsterRouter);
router.use("/order", orderRouter);

export default router;
