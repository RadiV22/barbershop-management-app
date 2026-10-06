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
      <p role="status" className="px-5 py-6 text-sm text-gray-500">
        Memeriksa sesi...
      </p>
    );
  }

  return (
    <section className="px-5 py-6">
      <h1 className="text-2xl font-bold text-gray-900">Akun saya</h1>

      {sessionError && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
        >
          {sessionError}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-soft bg-white p-6">
        {user ? (
          <>
            <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>

            <p className="mt-2 break-words text-sm text-gray-500">
              {user.email}
            </p>

            <p className="mt-3 text-sm font-semibold text-primary">Customer</p>

            {logoutError && (
              <p role="alert" className="mt-4 text-sm text-red-700">
                {logoutError}
              </p>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="mt-6 min-h-12 w-full rounded-xl border border-primary px-4 py-3 font-semibold text-primary hover:bg-soft/50"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900">Selamat datang</h2>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Masuk untuk melihat profil, membership, dan pesananmu.
            </p>

            <Link
              to="/login"
              className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:opacity-90"
            >
              Masuk
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
