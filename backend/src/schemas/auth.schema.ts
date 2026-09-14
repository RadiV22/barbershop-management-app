import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Nama wajib diisi"),

    email: z.string().trim().email("Email tidak valid").toLowerCase(),

    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .refine(
        (value) => Buffer.byteLength(value, "utf8") <= 72,
        "Password maksimal 72 byte",
      ),

    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Email tidak valid" })),

  password: z.string().min(1, "Password wajib diisi"),
});
