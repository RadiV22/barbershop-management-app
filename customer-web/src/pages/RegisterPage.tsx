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
    "min-h-12 w-full rounded-2xl border border-soft bg-background px-4 py-3 text-base text-primary outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";

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
      <section className="min-h-dvh bg-background px-5 py-8">
        <div className="mx-auto max-w-md">
          <p
            role="status"
            className="rounded-2xl border border-soft bg-white p-5 text-sm text-muted"
          >
            Memeriksa sesi...
          </p>
        </div>
      </section>
    );
  }

  if (user) {
    return <Navigate to={destination} replace />;
  }

  if (isRegistered) {
    return (
      <section className="min-h-dvh bg-background px-5 py-8 sm:py-12">
        <div className="mx-auto max-w-md overflow-hidden rounded-[2rem] border border-soft bg-white">
          <header className="bg-peach-light p-6 sm:p-8">
            <p className="text-xs font-bold tracking-[0.18em] text-primary">
              BARBERBRO
            </p>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary">
              Akunmu sudah siap.
            </h1>
          </header>

          <div className="p-6 sm:p-8">
            <div
              role="status"
              className="rounded-2xl border border-green-200 bg-green-50 p-4"
            >
              <h2 className="font-bold text-green-800">Pendaftaran berhasil</h2>

              <p className="mt-2 text-sm leading-6 text-green-800">
                Akun customer kamu sudah dibuat. Silakan masuk menggunakan email
                dan password yang didaftarkan.
              </p>
            </div>

            <Link
              to={loginPath}
              className="mt-6 flex min-h-12 items-center justify-center rounded-2xl bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Masuk sekarang
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-dvh bg-background px-5 py-8 sm:py-12">
      <div className="mx-auto max-w-md">
        <Link
          to={loginPath}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          ← Kembali ke login
        </Link>

        <div className="mt-5 overflow-hidden rounded-[2rem] border border-soft bg-white">
          <header className="bg-peach-light p-6 sm:p-8">
            <p className="text-xs font-bold tracking-[0.18em] text-primary">
              BARBERBRO
            </p>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary">
              Mulai kunjunganmu.
            </h1>

            <p className="mt-3 text-sm leading-6 text-muted">
              Buat akun untuk memilih jadwal, melakukan pembayaran, dan melihat
              pesananmu.
            </p>
          </header>

          <div className="p-6 sm:p-8">
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void handleRegister();
              }}
            >
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-semibold text-primary"
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
                  className="mb-2 block text-sm font-semibold text-primary"
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
                  className="mb-2 block text-sm font-semibold text-primary"
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

                <p
                  id="phone-help"
                  className="mt-2 text-xs leading-5 text-muted"
                >
                  Gunakan awalan 08 atau +628, tanpa spasi dan tanda hubung.
                </p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-primary"
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
                  className="mb-2 block text-sm font-semibold text-primary"
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
                  className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                >
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-12 w-full rounded-2xl bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Mendaftarkan..." : "Buat akun"}
              </button>
            </form>

            <p className="mt-6 border-t border-soft pt-5 text-center text-sm leading-6 text-muted">
              Sudah punya akun?{" "}
              <Link
                to={loginPath}
                className="font-semibold text-primary underline underline-offset-4"
              >
                Masuk
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
