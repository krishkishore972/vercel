"use client";
import { Cat, Zap, LogOut, User } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  AUTH_CHANGED_EVENT,
  getAuthName,
  getToken,
  logout,
} from "@/lib/auth";

export function Header() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  const checkAuthStatus = useCallback(() => {
    setIsLoggedIn(!!getToken());
    setUsername(getAuthName());
  }, []);

  useEffect(() => {
    checkAuthStatus();

    // Same-tab updates (login/logout) come via AUTH_CHANGED_EVENT,
    // cross-tab updates via the native storage event. No polling needed.
    window.addEventListener("storage", checkAuthStatus);
    window.addEventListener(AUTH_CHANGED_EVENT, checkAuthStatus);

    return () => {
      window.removeEventListener("storage", checkAuthStatus);
      window.removeEventListener(AUTH_CHANGED_EVENT, checkAuthStatus);
    };
  }, [checkAuthStatus]);

  const goToAuth = () => {
    router.push("/auth");
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setUsername("");

    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-deploy-purple to-deploy-blue rounded-md flex items-center justify-center">
              <Link href="/" aria-label="Home">
                <Zap className="w-5 h-5 text-white" />
              </Link>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-deploy-purple to-deploy-blue bg-clip-text text-transparent">
              DEPLOY
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {isLoggedIn && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
                <User className="w-4 h-4" />
                <span>Hello, {username}</span>
              </div>
            )}
            <Button
              onClick={isLoggedIn ? handleLogout : goToAuth}
              className="flex items-center gap-2 bg-gradient-to-r from-deploy-purple to-deploy-blue hover:from-deploy-purple/90 hover:to-deploy-blue/90 text-white"
            >
              {isLoggedIn ? (
                <>
                  <LogOut className="w-4 h-4" />
                  LOGOUT
                </>
              ) : (
                <>
                  <Cat className="w-4 h-4" />
                  LOGIN
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
