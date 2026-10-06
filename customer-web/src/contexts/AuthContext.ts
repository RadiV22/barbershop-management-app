import { createContext } from "react";

export interface CustomerUser {
  id: number;
  name: string;
  email: string;
  role: "CUSTOMER";
}

export interface AuthContextValue {
  user: CustomerUser | null;
  isInitializing: boolean;
  sessionError: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
