import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function AccountPage() {
  const { user, isInitializing, sessionError, logout } = useAuth();
  const [logoutError, setLogoutError] = useState("");

  function handleLogout() {
    setLogoutError("");

    try {
      logout();
    } catch {
      setLogoutError("Gagal keluar. Silakan coba lagi.");
    }
  }

  if (isInitializing) {
    return (
      <section className="px-5 py-6 sm:px-8 sm:py-8">
        <p
          role="status"
          className="rounded-2xl border border-soft bg-white p-5 text-sm text-muted"
        >
          Memeriksa sesi...
        </p>
      </section>
    );
  }

  return (
    <section className="px-5 py-6 sm:px-8 sm:py-8">
      <header className="rounded-[2rem] bg-peach-light p-6 sm:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-primary">
          AKUN BARBERBRO
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary">
          Akun saya
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted">
          Profil dan akses pesananmu dalam satu tempat.
        </p>
      </header>

      {sessionError && (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800"
        >
          {sessionError}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-3xl border border-soft bg-white">
        <div aria-hidden="true" className="h-2 bg-accent" />

        <div className="p-6">
          {user ? (
            <>
              <div className="flex items-center gap-4">
                <div
                  aria-hidden="true"
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-peach-light text-2xl font-bold text-primary"
                >
                  {user.name.trim().charAt(0).toUpperCase() || "C"}
                </div>

                <div className="min-w-0">
                  <h2 className="break-words text-xl font-bold text-primary">
                    {user.name}
                  </h2>

                  <span className="mt-2 inline-flex rounded-full bg-sage-light px-3 py-1 text-xs font-semibold text-primary">
                    Customer
                  </span>
                </div>
              </div>

              <dl className="mt-6 rounded-2xl bg-background p-4">
                <dt className="text-xs font-semibold text-muted">
                  Alamat email
                </dt>

                <dd className="mt-2 break-words text-sm font-medium text-primary">
                  {user.email}
                </dd>
              </dl>

              <Link
                to="/orders"
                className="mt-5 flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-soft px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-peach-light"
              >
                Pesanan & riwayat kunjungan
                <span aria-hidden="true">→</span>
              </Link>

              <div className="mt-6 border-t border-soft pt-5">
                {logoutError && (
                  <p
                    role="alert"
                    className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                  >
                    {logoutError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="min-h-12 w-full rounded-2xl border border-primary px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-peach-light"
                >
                  Keluar dari akun
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                aria-hidden="true"
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-peach-light text-xl font-bold text-primary"
              >
                B
              </div>

              <h2 className="mt-5 text-xl font-bold text-primary">
                Selamat datang di BarberBro
              </h2>

              <p className="mt-3 text-sm leading-6 text-muted">
                Masuk untuk membuat booking, melanjutkan pembayaran, dan melihat
                pesananmu.
              </p>

              <Link
                to="/login"
                className="mt-6 flex min-h-12 items-center justify-center rounded-2xl bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary/90"
              >
                Masuk ke akun
              </Link>

              <p className="mt-4 text-center text-sm text-muted">
                Belum punya akun?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  Daftar
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
