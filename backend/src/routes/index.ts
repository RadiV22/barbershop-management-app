import { Router } from "express";
import serviceRouter from "./service.route.js";
import customerRouter from "./customer.route.js";
import kapsterRouter from "./kapster.route.js";
import orderRouter from "./order.route.js";
import authRouter from "./auth.route.js";
import dashboardRouter from "./dashboard.route.js";
import { authentication } from "../middlewares/auth.middleware.js";

const router = Router();

router.use("/auth", authRouter);

router.use(authentication);

router.use("/dashboard", dashboardRouter);
router.use("/services", serviceRouter);
router.use("/customer", customerRouter);
router.use("/kapster", kapsterRouter);
router.use("/order", orderRouter);

export default router;
