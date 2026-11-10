import { useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";

function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLoading) return;

    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      await login(email, password);

      setSuccessMessage("Login berhasil. Sesi akun sudah tersimpan.");
      setPassword("");
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.message ??
            "Tidak dapat menghubungi server. Pastikan backend berjalan.",
        );
      } else {
        setErrorMessage("Terjadi kesalahan. Silakan coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-stone-800">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-5 rounded-xl border border-border bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="mb-2">
          <div
            aria-hidden="true"
            className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-soft text-xl font-bold text-primary"
          >
            B
          </div>

          <h1 className="text-2xl font-bold text-primary">
            Masuk ke BarberBro
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted">
            Gunakan akun admin atau staff untuk mengelola barbershop.
          </p>
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
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-stone-800 outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-secondary/15"
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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-stone-800 outline-none transition-colors focus:border-secondary focus:ring-2 focus:ring-secondary/15"
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

        {successMessage && (
          <p
            role="status"
            className="rounded-lg bg-green-50 p-3 text-sm text-green-700"
          >
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="min-h-11 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-wait disabled:opacity-60"
        >
          {isLoading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </main>
  );
}

export default LoginPage;
