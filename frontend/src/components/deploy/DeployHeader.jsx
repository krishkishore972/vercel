"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Rocket } from "lucide-react";
import { fadeUp } from "@/components/landing/animations";
import { PageEyebrow } from "@/components/shared/PageEyebrow";
import { StatusBadge } from "@/components/shared/StatusBadge";

export function DeployHeader({ projectName, status, statusLabel }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <PageEyebrow icon={<Rocket className="w-3.5 h-3.5" />}>
            Deploy
          </PageEyebrow>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight truncate">
            {projectName || "Deploy Project"}
          </h1>
          <p className="text-slate-600 mt-1.5">
            Deploy your project to the cloud with one click.
          </p>
        </div>
        <StatusBadge status={status}>{statusLabel}</StatusBadge>
      </div>
    </motion.div>
  );
}
