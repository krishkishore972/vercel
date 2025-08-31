"use client";
import { Cat } from "lucide-react";
import { Button } from "./ui/button";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function Header() {
  const router = useRouter();

  const goToAuth = () => {
    router.push("/auth");
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
              VERCEL
            </h1>
          </div>
          <Button
            onClick={goToAuth}
            className="flex items-center gap-2 bg-gradient-to-r from-deploy-purple to-deploy-blue hover:from-deploy-purple/90 hover:to-deploy-blue/90 text-white"
          >
            <Cat className="w-4 h-4" />
            LOGIN
          </Button>
        </div>
      </div>
    </header>
  );
}
