"use client";
import { motion } from "framer-motion";
import { AlertCircle, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const STYLES = {
  error: "bg-red-50 text-red-700 border-red-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  info: "bg-deploy-blue/5 text-deploy-blue border-deploy-blue/20",
};

const ICONS = {
  error: AlertCircle,
  success: Check,
  info: Clock,
};

export function FormAlert({ type = "info", children, className }) {
  const Icon = ICONS[type] || ICONS.info;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn(
        "p-3 rounded-xl border text-sm flex items-start gap-2",
        STYLES[type],
        className
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />{" "}
      <span className={type === "info" ? "flex items-center gap-2" : undefined}>
        {children}
      </span>
    </motion.div>
  );
}
