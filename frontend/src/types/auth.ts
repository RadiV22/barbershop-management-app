export interface User {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
}

export interface LoginResponse {
  message: string;
  token: string;
  data: User;
}

export interface MeResponse {
  message: string;
  data: User;
}
