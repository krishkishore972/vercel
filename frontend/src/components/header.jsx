"use client";
import { Cat, Zap, LogOut, User } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Header() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  // Check if user is logged in on component mount
  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem("token");
      const authName = localStorage.getItem("username");
      setIsLoggedIn(!!token);
      setUsername(authName || "");
    };

    // Check initially
    checkAuthStatus();

    // Listen for storage changes (in case of login/logout from other tabs)
    const handleStorageChange = () => {
      checkAuthStatus();
    };

    window.addEventListener("storage", handleStorageChange);

    // Also check when the page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAuthStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [username,isLoggedIn]);

  const goToAuth = () => {
    router.push("/auth");
  };

  const handleLogout = () => {
    // Remove auth data from localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("username");

    // Update state
    setIsLoggedIn(false);
    setUsername("");

    // Redirect to home page
    router.push("/");
  };

  return (
    <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-deploy-purple to-deploy-blue rounded-md flex items-center justify-center">
              <Link href="/">
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
