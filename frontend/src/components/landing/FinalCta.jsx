"use client";
import { motion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scrollToId } from "./animations";

export function FinalCta({ onGetStarted }) {
  return (
    <section className="pb-20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-5xl mx-auto relative overflow-hidden rounded-3xl bg-gradient-to-r from-deploy-purple to-deploy-blue p-10 md:p-14 text-center text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-sm mb-5">
            <Lock className="w-3.5 h-3.5" /> Free to start · No credit card
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Your next deploy is 30 seconds away
          </h2>
          <p className="text-white/80 max-w-xl mx-auto mb-8">
            Sign up, paste your repo URL and get a live edge URL with streaming
            build logs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={onGetStarted}
              className="bg-white text-slate-950 hover:bg-slate-100 px-8 py-3 text-base h-auto rounded-xl font-semibold"
            >
              Start deploying now <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              onClick={() => scrollToId("features")}
              variant="outline"
              className="px-8 py-3 text-base h-auto rounded-xl bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white"
            >
              Revisit features
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
