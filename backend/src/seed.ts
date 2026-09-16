import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "./lib/prisma.js";

async function main() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error("ADMIN_NAME, ADMIN_EMAIL, dan ADMIN_PASSWORD wajib diisi");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email admin tidak valid");
  }

  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Password admin minimal 8 karakter dan maksimal 72 byte");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    if (existingUser.role !== "ADMIN") {
      throw new Error(
        "Email tersebut sudah digunakan akun STAFF. Gunakan email lain untuk seed admin",
      );
    }

    console.log("Akun admin sudah tersedia. Data tidak diubah.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Akun admin berhasil dibuat.");
}

main()
  .catch((error) => {
    console.error(
      "Seed gagal:",
      error instanceof Error ? error.message : "Kesalahan tidak diketahui",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
