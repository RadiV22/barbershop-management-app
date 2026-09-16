import { z } from "zod";

export const createKapsterSchema = z.object({
  name: z.string().trim().min(1, "Nama Kapster wajib diisi!"),
});

export const updateKapsterSchema = z
  .object({
    name: z.string().trim().min(1, "Nama Kapster wajib diisi!").optional(),

    isActive: z.boolean().optional(),
  })

  .refine((data) => data.name !== undefined || data.isActive !== undefined, {
    message: "Isi minimal satu field yang ingin diubah",
  });
