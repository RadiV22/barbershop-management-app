import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import api from "../lib/axios";
import { useAuth } from "../hooks/useAuth";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const { user, isInitializing } = useAuth();
  const [searchParams] = useSearchParams();
  const serviceIdsParam = searchParams.get("services");

  const loginPath = serviceIdsParam
    ? `/login?services=${encodeURIComponent(serviceIdsParam)}`
    : "/login";

  const destination = serviceIdsParam
    ? `/booking?services=${encodeURIComponent(serviceIdsParam)}`
    : "/account";

  const inputClassName =
    "w-full rounded-xl border border-soft px-4 py-3 text-base text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  async function handleRegister() {
    if (isSubmitting || isRegistered) return;

    setErrorMessage("");

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setErrorMessage("Nama, email, dan nomor telepon wajib diisi.");
      return;
    }

    if (!/^(?:08|\+628)[0-9]{8,11}$/.test(phone.trim())) {
      setErrorMessage(
        "Nomor telepon harus diawali 08 atau +628, tanpa spasi dan tanda hubung.",
      );
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password minimal 8 karakter.");
      return;
    }

    if (new TextEncoder().encode(password).length > 72) {
      setErrorMessage("Password maksimal 72 byte.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi password tidak cocok.");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("/auth/customer/register", {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        confirmPassword,
      });

      setPassword("");
      setConfirmPassword("");
      setIsRegistered(true);
    } catch (error) {
      let message = "Pendaftaran belum berhasil. Silakan coba lagi.";

      if (
        axios.isAxiosError<{
          message?: string;
          errors?: { field: string; message: string }[];
        }>(error)
      ) {
        if (error.response) {
          const validationMessage = error.response.data.errors
            ?.map((issue) => issue.message)
            .join(" ");

          message = validationMessage || error.response.data.message || message;
        } else {
          message =
            "Respons server belum diterima. Coba login dengan akun yang didaftarkan untuk memastikan apakah pendaftaran sudah berhasil.";
        }
      }

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isInitializing) {
    return (
      <section className="px-5 py-8">
        <p role="status" className="text-sm text-gray-600">
          Memeriksa sesi...
        </p>
      </section>
    );
  }

  if (user) {
    return <Navigate to={destination} replace />;
  }

  if (isRegistered) {
    return (
      <section className="px-5 py-8">
        <div className="mx-auto max-w-md rounded-3xl border border-soft bg-white p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Pendaftaran berhasil
          </h1>

          <p role="status" className="mt-3 text-sm leading-6 text-gray-600">
            Akun customer kamu sudah dibuat. Silakan masuk menggunakan email dan
            password yang didaftarkan.
          </p>

          <Link
            to={loginPath}
            className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:opacity-90"
          >
            Masuk sekarang
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="px-5 py-8">
      <p role="status" className="text-sm text-gray-600">
        Memeriksa sesi...
      </p>
      <div className="mx-auto max-w-md rounded-3xl border border-soft bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Pendaftaran berhasil
        </h1>

        <p role="status" className="mt-3 text-sm leading-6 text-gray-600">
          Akun customer kamu sudah dibuat. Silakan masuk menggunakan email dan
          password yang didaftarkan.
        </p>

        <Link
          to={loginPath}
          className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:opacity-90"
        >
          Masuk sekarang
        </Link>
      </div>
      <div className="mx-auto max-w-md">
        <Link to={loginPath} className="text-sm font-semibold text-primary">
          ← Kembali ke login
        </Link>

        <div className="mt-6 rounded-3xl border border-soft bg-white p-6">
          <p className="text-sm font-semibold text-primary">Barbershop</p>

          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Buat akun customer
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            Daftar untuk membuat booking dan melihat riwayat kunjunganmu.
          </p>

          <form
            className="mt-6 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleRegister();
            }}
          >
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Nama
              </label>

              <input
                id="name"
                type="text"
                disabled={isSubmitting}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder="Masukkan nama"
                required
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                disabled={isSubmitting}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="nama@email.com"
                required
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Nomor telepon
              </label>

              <input
                id="phone"
                type="tel"
                disabled={isSubmitting}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                placeholder="081234567890"
                aria-describedby="phone-help"
                required
                className={inputClassName}
              />

              <p id="phone-help" className="mt-2 text-xs text-gray-500">
                Gunakan awalan 08 atau +628, tanpa spasi dan tanda hubung.
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                disabled={isSubmitting}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                minLength={8}
                required
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Konfirmasi password
              </label>

              <input
                id="confirmPassword"
                type="password"
                disabled={isSubmitting}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Ulangi password"
                minLength={8}
                required
                className={inputClassName}
              />
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-12 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Mendaftarkan..." : "Daftar"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Sudah punya akun?{" "}
            <Link to={loginPath} className="font-semibold text-primary">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
