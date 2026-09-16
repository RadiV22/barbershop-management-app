import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Nama Customer wajib diisi!"),

  phone: z
    .string()
    .trim()
    .min(1, "Nama Customer tidak boleh kosong!")
    .optional(),
});

export const updateCustomerSchema = z
  .object({
    name: z.string().trim().min(1, "Nama Customer wajib diisi!").optional(),

    phone: z
      .string()
      .trim()
      .min(1, "nomor telepon tidak boleh kosong")
      .optional(),
  })

  .refine((data) => data.name !== undefined || data.phone !== undefined, {
    message: "Isi minimal satu field yang ingin diubah",
  });
