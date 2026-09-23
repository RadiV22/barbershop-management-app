import { createContext } from "react";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
}

export interface AuthContextValue {
  user: AuthUser | null;
  isInitializing: boolean;
  sessionError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
