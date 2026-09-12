import { Router } from "express";
import serviceRouter from "./service.route.js";
import customerRouter from "./customer.route.js";
import kapsterRouter from "./kapster.route.js";
import orderRouter from "./order.route.js";

const router = Router();

router.use("/services", serviceRouter);
router.use("/customer", customerRouter);
router.use("/kapster", kapsterRouter);
router.use("/order", orderRouter);

export default router;
