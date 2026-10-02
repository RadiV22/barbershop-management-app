import { z } from "zod";

export const registerCustomerSchema = z
  .object({
    name: z.string().trim().min(1, "Nama wajib diisi."),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email({ error: "Email tidak valid" })),

    phone: z
      .string()
      .trim()
      .regex(
        /^(?:08|\+628)[0-9]{8,11}$/,
        "Nomor telepon harus diawali 08 atau +628 dan berisi angka",
      ),

    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .refine(
        (value) => Buffer.byteLength(value, "utf8") <= 72,
        "password maksimal 72 byte",
      ),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });
