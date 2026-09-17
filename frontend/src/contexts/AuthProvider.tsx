import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import api from "../lib/axios";
import { AuthContext } from "./AuthContext";
import type { User, LoginResponse, MeResponse } from "../types/auth";

const TOKEN_KEY = "barbershop_token";

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState("");

  useEffect(() => {
    let ignore = false;

    const checkSession = async () => {
      try {
        const token = sessionStorage.getItem(TOKEN_KEY);

        if (!token) return;

        api.defaults.headers.common.Authorization = `Bearer ${token}`;

        const response = await api.get<MeResponse>("/auth/me");

        if (!ignore) {
          setUser(response.data.data);
        }
      } catch (error) {
        if (ignore) return;

        if (
          axios.isAxiosError(error) &&
          error.response?.status === 401
        ) {
          sessionStorage.removeItem(TOKEN_KEY);
          delete api.defaults.headers.common.Authorization;
          setUser(null);
        } else {
          setInitializationError(
            "Tidak dapat memeriksa sesi. Pastikan backend berjalan, lalu coba lagi.",
          );
        }
      } finally {
        if (!ignore) {
          setIsInitializing(false);
        }
      }
    };

    void checkSession();

    return () => {
      ignore = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<LoginResponse>("/auth/login", {
      email: email.trim(),
      password,
    });

    const { token, data } = response.data;

    sessionStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    setUser(data);
  };

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
    setUser(null);
  };

  if (isInitializing) {
    return (
      <main className="grid min-h-screen place-items-center bg-gray-100">
        <p role="status">Memeriksa sesi...</p>
      </main>
    );
  }

  if (initializationError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-100 p-6">
        <p role="alert" className="text-red-700">
          {initializationError}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Coba lagi
        </button>
      </main>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isInitializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;