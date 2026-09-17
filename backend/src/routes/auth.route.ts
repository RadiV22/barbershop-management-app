import { Router } from "express";
import { register, login, getMe } from "../controllers/auth.controller.js";
import { authentication } from "../middlewares/auth.middleware.js";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);

authRouter.get("/me", authentication, getMe);

export default authRouter;
