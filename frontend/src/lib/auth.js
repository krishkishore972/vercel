"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getAuthName() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("authName") || "";
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: token } : {};
}

export const AUTH_CHANGED_EVENT = "auth-changed";

function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

// Persist a session and notify listeners (e.g. Header) instantly.
export function login(token, authName) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
  localStorage.setItem("authName", authName || "");
  notifyAuthChanged();
}

// Clear the session and notify listeners (e.g. Header) instantly.
export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("authName");
  notifyAuthChanged();
}

// Redirect logged-out users to /auth. Returns { authName, ready }.
export function useRequireAuth() {
  const router = useRouter();
  const [authName, setAuthName] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/auth");
      return;
    }
    setAuthName(getAuthName());
    setReady(true);
  }, [router]);

  return { authName, ready };
}

// Redirect logged-in users to /dashboard. Returns `checking` flag.
export function useRequireGuest() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
    } else {
      setChecking(false);
    }
  }, [router]);

  return checking;
}
