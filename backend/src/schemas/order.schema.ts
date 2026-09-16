import { z } from "zod";

const orderItemSchema = z.object({
  serviceId: z
    .number()
    .int("ID layanan harus berupa bilangan bulat")
    .positive("ID layanan harus lebih dari 0"),

  quantity: z
    .number()
    .int("Quantity harus berupa bilangan bulat")
    .positive("Quantity harus lebih dari 0"),
});

export const createOrderSchema = z.object({
  customerId: z
    .number()
    .int("ID customer harus berupa bilangan bulat")
    .positive("ID customer harus lebih dari 0"),

  kapsterId: z
    .number()
    .int("ID kapster harus berupa bilangan bulat")
    .positive("ID kapster harus lebih dari 0"),

  items: z
    .array(orderItemSchema)
    .min(1, "Pilih minimal satu layanan")
    .refine(
      (items) =>
        new Set(items.map((item) => item.serviceId)).size === items.length,
      {
        message: "Layanan yang sama cukup ditulis sekali, sesuaikan quantity",
      },
    ),

  notes: z.string().trim().optional(),
});

export const updateOrderStatusSchema = z.object({
  serviceStatus: z.enum(["WAITING", "IN_SERVICE", "COMPLETED"]),
});
