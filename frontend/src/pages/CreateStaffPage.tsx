import { useState } from "react";
import axios from "axios";
import api from "../lib/axios";

interface RegisterStaffResponse {
  message: string;
  data: {
    id: number;
    name: string;
    email: string;
    role: "STAFF";
    createdAt: string;
  };
}

export default function CreateStaffPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleCreateStaff() {
    if (isSubmitting) return;

    setErrorMessage("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi password tidak cocok.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post<RegisterStaffResponse>("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });

      const staff = response.data.data;

      setSuccessMessage(
        `Akun staff ${staff.name} (${staff.email}) berhasil dibuat.`,
      );

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      let message = "Akun staff belum berhasil dibuat.";

      if (
        axios.isAxiosError<{
          message?: string;
          errors?: { field: string; message: string }[];
        }>(error)
      ) {
        if (error.response) {
          message =
            error.response.data.errors
              ?.map((issue) => issue.message)
              .join(" ") ||
            error.response.data.message ||
            message;
        } else {
          message =
            "Respons server belum diterima. Akun mungkin sudah dibuat. Periksa terlebih dahulu sebelum mencoba kembali.";
        }
      }

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClassName =
    "mt-2 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50";

  return (
    <section className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">Tambah staff</h1>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        Buat akun staff untuk membantu mengelola operasional barbershop.
      </p>

      {successMessage && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {successMessage}
        </p>
      )}

      <form
        className="mt-6 space-y-5 rounded-2xl border border-gray-200 bg-white p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleCreateStaff();
        }}
      >
        <div>
          <label htmlFor="staff-name" className="text-sm font-semibold">
            Nama staff
          </label>
          <input
            id="staff-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isSubmitting}
            autoComplete="off"
            required
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="staff-email" className="text-sm font-semibold">
            Email staff
          </label>
          <input
            id="staff-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="staff-password" className="text-sm font-semibold">
            Password
          </label>
          <input
            id="staff-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            autoComplete="new-password"
            minLength={8}
            required
            className={inputClassName}
          />
          <p className="mt-2 text-xs text-gray-500">
            Minimal 8 karakter, maksimal 72 byte.
          </p>
        </div>

        <div>
          <label
            htmlFor="staff-confirm-password"
            className="text-sm font-semibold"
          >
            Konfirmasi password
          </label>
          <input
            id="staff-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isSubmitting}
            autoComplete="new-password"
            minLength={8}
            required
            className={inputClassName}
          />
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Membuat akun..." : "Buat akun staff"}
        </button>
      </form>
    </section>
  );
}
