import { useEffect, useState, type ReactNode } from "react";
import axios from "axios";
import { AuthContext, type CustomerUser } from "./AuthContext";
import api from "../lib/axios";
import { getToken, removeToken, saveToken } from "../lib/tokenStorage";
import { socket } from "../lib/socket";

interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
}

interface LoginResponse {
  message: string;
  token: string;
  data: ApiUser;
}

interface MeResponse {
  message: string;
  data: ApiUser;
}

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [sessionError, setSessionError] = useState("");

  const userId = user?.id;

  useEffect(() => {
    let isActive = true;

    async function restoreSession() {
      try {
        const token = getToken();

        if (!token) {
          return;
        }

        const response = await api.get<MeResponse>("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!isActive) return;

        const account = response.data.data;

        if (account.role !== "CUSTOMER") {
          removeToken();
          delete api.defaults.headers.common.Authorization;
          setSessionError("Silahkan masuk menggunakan akun customer.");
          return;
        }

        api.defaults.headers.common.Authorization = `Bearer ${token}`;

        setUser({
          id: account.id,
          name: account.name,
          email: account.email,
          role: "CUSTOMER",
        });
      } catch (error) {
        if (!isActive) return;

        delete api.defaults.headers.common.Authorization;

        if (axios.isAxiosError(error) && error.response?.status === 401) {
          removeToken();
          setSessionError("Sesi berakhir. Silahkan masuk kembali");
        } else {
          setSessionError(
            "Belum bisa memeriksa sesi. Periksa koneksi lalu memuat ulang halaman",
          );
        }
      } finally {
        if (isActive) {
          setIsInitializing(false);
        }
      }
    }

    void restoreSession();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (isInitializing || userId === undefined) {
      return;
    }

    function handleConnect() {
      console.log("Koneksi realtime customer terhubung.");
    }

    function handleConnectError(error: Error) {
      console.error("Koneksi realtime belum berhasil:", error.message);
    }

    function handleSessionExpired() {
      socket.disconnect();

      removeToken();
      delete api.defaults.headers.common.Authorization;

      setUser(null);
      setSessionError("Sesi berakhir. Silakan masuk kembali.");
    }

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("session:expired", handleSessionExpired);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("session:expired", handleSessionExpired);

      socket.disconnect();
    };
  }, [userId, isInitializing]);

  async function login(email: string, password: string): Promise<void> {
    if (isInitializing) {
      throw new Error("Pemeriksaan sesi masih berlangsung.");
    }

    const response = await api.post<LoginResponse>("/auth/login", {
      email: email.trim(),
      password,
    });

    const account = response.data.data;

    if (account.role !== "CUSTOMER") {
      throw new Error("Silakan gunakan akun customer untuk masuk.");
    }

    saveToken(response.data.token);

    api.defaults.headers.common.Authorization = `Bearer ${response.data.token}`;

    setUser({
      id: account.id,
      name: account.name,
      email: account.email,
      role: "CUSTOMER",
    });

    setSessionError("");
  }

  function logout(): void {
    socket.disconnect();

    removeToken();
    delete api.defaults.headers.common.Authorization;

    setUser(null);
    setSessionError("");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isInitializing,
        sessionError,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
