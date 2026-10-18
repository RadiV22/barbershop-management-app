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
  const quantitiesParam = searchParams.get("quantities");

  const bookingParams = new URLSearchParams();

  if (serviceIdsParam !== null) {
    bookingParams.set("services", serviceIdsParam);

    if (quantitiesParam !== null) {
      bookingParams.set("quantities", quantitiesParam);
    }
  }

  const bookingQuery = bookingParams.toString();

  const destination =
    serviceIdsParam !== null ? `/booking?${bookingQuery}` : "/account";

  const registerPath =
    serviceIdsParam !== null ? `/register?${bookingQuery}` : "/register";

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

  return (
    <section className="min-h-dvh bg-background px-5 py-8 sm:py-12">
      <div className="mx-auto max-w-md">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          ← Kembali ke beranda
        </Link>

        <div className="mt-5 overflow-hidden rounded-[2rem] border border-soft bg-white">
          <header className="bg-peach-light p-6 sm:p-8">
            <p className="text-xs font-bold tracking-[0.18em] text-primary">
              BARBERBRO
            </p>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary">
              Selamat datang kembali.
            </h1>

            <p className="mt-3 text-sm leading-6 text-muted">
              Masuk untuk merencanakan kunjungan dan melihat pesananmu.
            </p>
          </header>

          <div className="p-6 sm:p-8">
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void handleLogin();
              }}
            >
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
                  className="min-h-12 w-full rounded-2xl border border-soft bg-background px-4 py-3 text-base text-primary outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                />
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
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  required
                  className="min-h-12 w-full rounded-2xl border border-soft bg-background px-4 py-3 text-base text-primary outline-none placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
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
                {isSubmitting ? "Memproses..." : "Masuk ke akun"}
              </button>
            </form>

            <p className="mt-6 border-t border-soft pt-5 text-center text-sm leading-6 text-muted">
              Belum punya akun?{" "}
              <Link
                to={registerPath}
                className="font-semibold text-primary underline underline-offset-4"
              >
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
