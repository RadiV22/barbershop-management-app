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
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6 text-gray-900">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-4 rounded-xl bg-white p-8 shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-bold">Barbershop Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Masuk menggunakan akun ADMIN atau STAFF.
          </p>
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-600 focus:outline-2 focus:outline-blue-600"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-600 focus:outline-2 focus:outline-blue-600"
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
          className="cursor-pointer rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60"
        >
          {isLoading ? "Memproses..." : "Login"}
        </button>
      </form>
    </main>
  );
}

export default LoginPage;
