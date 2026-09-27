import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().trim().min(1, "Nama layanan wajib diisi"),

  duration: z
    .number()
    .int("Durasi harus berupa bilangan bulat")
    .positive("Durasi harus lebih dari 0"),

  price: z
    .number()
    .int("Harga harus berupa bilangan bulat")
    .positive("Harga harus lebih dari 0"),
});

export const updateServiceSchema = z
  .object({
    name: z.string().trim().min(1, "Nama layanan wajib diisi").optional(),

    price: z
      .number()
      .int("Harga harus berupa bilangan bulat")
      .nonnegative("Harga tidak boleh negatif")
      .max(2147483647, "Harga terlalu besar")
      .optional(),

    duration: z
      .number()
      .int("Durasi harus berupa bilangan bulat")
      .positive("Durasi harus lebih dari 0")
      .max(2147483647, "Durasi terlalu besar")
      .optional(),

    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.duration !== undefined ||
      data.price !== undefined ||
      data.isActive !== undefined,
    {
      message: "Isi minimal satu field yang ingin diubah",
    },
  );
