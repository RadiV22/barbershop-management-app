import { Router } from "express";
import {
  createBooking,
  getMyBookings,
} from "../controllers/booking.controller.js";
import { role } from "../middlewares/role.middleware.js";

const bookingRouter = Router();

bookingRouter.post("/", role(["CUSTOMER"]), createBooking);
bookingRouter.get("/", role(["CUSTOMER"]), getMyBookings);

export default bookingRouter;
