import axios from "axios";
import { getToken, logout } from "./auth";

// Single axios client: base URL + auth header in one place,
// replacing the repeated `axios.get(url, { headers: { Authorization } })` calls.
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = token;
  return config;
});

// Expired/invalid token -> drop the session and send the user to /auth.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      logout();
      if (!window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth";
      }
    }
    return Promise.reject(error);
  }
);
