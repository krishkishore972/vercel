"use client";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { fadeUp, staggerParent } from "@/components/landing/animations";
import { PageEyebrow } from "@/components/shared/PageEyebrow";

export function DashboardHeader({ authName, total, fetching }) {
  return (
    <div className="border-b border-slate-200/70 bg-white/70 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
        >
          <div>
            <PageEyebrow icon={<Sparkles className="w-3.5 h-3.5" />}>
              Dashboard
            </PageEyebrow>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {authName ? (
                <>
                  Welcome back,{" "}
                  <span className="bg-gradient-to-r from-deploy-purple to-deploy-blue bg-clip-text text-transparent">
                    {authName}
                  </span>
                </>
              ) : (
                "Projects Dashboard"
              )}
            </h1>
            <p className="text-slate-600 mt-1.5">
              Create a project from any GitHub repo, then deploy it in one click.
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3 mt-6 max-w-md"
        >
          {[
            { label: "Total projects", value: fetching ? "…" : total },
            { label: "Git providers", value: "GitHub" },
          ].map((s, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              custom={i}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm"
            >
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
