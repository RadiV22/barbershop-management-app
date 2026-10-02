import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller.js";
import { authentication } from "../middlewares/auth.middleware.js";
import { role } from "../middlewares/role.middleware.js";
import { registerCustomer } from "../controllers/customer-auth.controller.js";

const authRouter = Router();

authRouter.post("/register", authentication, role(["ADMIN"]), register);

authRouter.post("/customer/register", registerCustomer);

authRouter.post("/login", login);

authRouter.get("/me", authentication, getMe);

export default authRouter;
