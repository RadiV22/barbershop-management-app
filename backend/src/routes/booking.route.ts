import { Router } from "express";
import {
  createBooking,
  getMyBookings,
  getAllBookings,
  checkInBooking,
  markBookingNoShow,
} from "../controllers/booking.controller.js";
import { role } from "../middlewares/role.middleware.js";
import { createBookingPayment } from "../controllers/booking-payment.controller.js";
import {
  checkBookingPayment,
  confirmBookingPaymentReview,
} from "../controllers/booking-payment-review.controller.js";

const bookingRouter = Router();

bookingRouter.post("/", role(["CUSTOMER"]), createBooking);
bookingRouter.get("/", role(["CUSTOMER"]), getMyBookings);
bookingRouter.get("/all", role(["ADMIN", "STAFF"]), getAllBookings);
bookingRouter.post("/:id/payment", role(["CUSTOMER"]), createBookingPayment);
bookingRouter.post("/:id/check-in", role(["ADMIN", "STAFF"]), checkInBooking);
bookingRouter.post("/:id/no-show", role(["ADMIN", "STAFF"]), markBookingNoShow);
bookingRouter.post(
  "/payments/:id/check",
  role(["ADMIN", "STAFF"]),
  checkBookingPayment,
);
bookingRouter.post(
  "/payments/:id/confirm-review",
  role(["ADMIN"]),
  confirmBookingPaymentReview,
);

export default bookingRouter;
