import { useCallback, useEffect, useState, type ReactNode } from "react";
import axios from "axios";
import api from "../lib/axios";
import { getToken, removeToken, saveToken } from "../lib/tokenStorage";
import { AuthContext, type AuthUser } from "./AuthContext";

interface MeResponse {
  message: string;
  data: AuthUser;
}

interface LoginResponse {
  message: string;
  token: string;
  data: AuthUser;
}

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const restoreSession = useCallback(async (): Promise<void> => {
    setIsInitializing(true);
    setSessionError(null);

    try {
      const token = await getToken();

      if (!token) {
        delete api.defaults.headers.common.Authorization;
        setUser(null);
        return;
      }

      const response = await api.get<MeResponse>("/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      setUser(response.data.data);
    } catch (error) {
      delete api.defaults.headers.common.Authorization;
      setUser(null);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        try {
          await removeToken();
        } catch {
          setSessionError("Gagal menghapus sesi lama. Silakan coba lagi.");
        }
      } else {
        setSessionError(
          "Sesi belum dapat diperiksa. Pastikan backend berjalan, lalu coba lagi.",
        );
      }
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  async function login(email: string, password: string): Promise<void> {
    const response = await api.post<LoginResponse>("/auth/login", {
      email: email.trim(),
      password,
    });

    const token = response.data.token;

    if (typeof token !== "string" || !token) {
      throw new Error("Respons login tidak memiliki token yang valid.");
    }

    const meResponse = await api.get<MeResponse>("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await saveToken(token);

    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    setSessionError(null);
    setUser(meResponse.data.data);
  }

  async function logout(): Promise<void> {
    await removeToken();

    delete api.defaults.headers.common.Authorization;
    setUser(null);
    setSessionError(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isInitializing,
        sessionError,
        login,
        logout,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
