import { Router } from "express";
import { handleMidtransNotification } from "../controllers/midtrans-webhook.controller.js";

const midtransRouter = Router();

midtransRouter.post("/notification", handleMidtransNotification);

midtransRouter.get("/return", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");

  return res.redirect(302, "http://localhost:5174/orders");
});
export default midtransRouter;
