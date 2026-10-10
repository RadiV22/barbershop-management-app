import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { user, login, isInitializing } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceIdsParam = searchParams.get("services");

  const destination = serviceIdsParam
    ? `/booking?services=${encodeURIComponent(serviceIdsParam)}`
    : "/account";

  async function handleLogin() {
    if (isSubmitting || isInitializing) return;

    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Email dan password wajib diisi.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(destination, { replace: true });
    } catch (error) {
      let message = "Gagal masuk. Silakan coba lagi.";

      if (axios.isAxiosError<{ message?: string }>(error)) {
        message = error.response?.data?.message ?? message;
      } else if (error instanceof Error) {
        message = error.message;
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

  return (
    <section className="px-5 py-8">
      <div className="mx-auto max-w-md">
        <Link to="/" className="text-sm font-semibold text-primary">
          ← Kembali ke beranda
        </Link>

        <div className="mt-6 rounded-3xl border border-soft bg-white p-6">
          <p className="text-sm font-semibold text-primary">Barbershop</p>

          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Masuk ke akun
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            Masuk untuk membuat booking dan melihat pesananmu.
          </p>

          <form
            className="mt-6 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleLogin();
            }}
          >
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
                className="w-full rounded-xl border border-soft px-4 py-3 text-base text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
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
                autoComplete="current-password"
                placeholder="Masukkan password"
                required
                className="w-full rounded-xl border border-soft px-4 py-3 text-base text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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
              className="min-h-12 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Memproses..." : "Masuk"}
            </button>

            <p className="mt-6 text-center text-sm text-gray-500">
              Belum punya akun?{" "}
              <Link
                to={
                  serviceIdsParam
                    ? `/register?services=${encodeURIComponent(serviceIdsParam)}`
                    : "/register"
                }
                className="font-semibold text-primary"
              >
                Daftar
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
