"use client";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/footer";
import { Hero } from "./Hero";
import { StackStrip } from "./StackStrip";
import { Features } from "./Features";
import { HowItWorks } from "./HowItWorks";
import { Testimonials } from "./Testimonials";
import { FinalCta } from "./FinalCta";

export function LandingPage() {
  const router = useRouter();
  const goToAuth = () => router.push("/auth");

  return (
    <div className="min-h-screen scroll-smooth bg-gradient-to-br from-slate-50 via-white to-slate-100/50 text-slate-900">
      <Hero onGetStarted={goToAuth} />
      <StackStrip />
      <Features />
      <HowItWorks onGetStarted={goToAuth} />
      <Testimonials />
      <FinalCta onGetStarted={goToAuth} />
      <Footer />
    </div>
  );
}
