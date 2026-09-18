"use client";
import { LandingPage } from "@/components/landing/LandingPage";
import { useRequireGuest } from "@/lib/auth";

export default function Home() {
  const checkingAuth = useRequireGuest();

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100/50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-deploy-blue"></div>
      </div>
    );
  }

  return <LandingPage />;
}
