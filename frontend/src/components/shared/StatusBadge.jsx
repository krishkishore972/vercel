"use client";
import { cn } from "@/lib/utils";

const STYLES = {
  ready: "text-emerald-700 bg-emerald-50 border-emerald-200",
  live: "text-emerald-700 bg-emerald-50 border-emerald-200",
  building: "text-deploy-blue bg-deploy-blue/10 border-deploy-blue/20",
  idle: "text-slate-500 bg-slate-100 border-slate-200",
  failed: "text-red-700 bg-red-50 border-red-200",
};

const DOTS = {
  ready: "bg-emerald-500",
  live: "bg-emerald-500",
  building: "bg-deploy-blue",
  idle: "bg-slate-400",
  failed: "bg-red-500",
};

export function StatusBadge({ status = "idle", children, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 border w-fit",
        STYLES[status] || STYLES.idle,
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        {status === "building" && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-deploy-blue opacity-75"></span>
        )}
        <span
          className={cn("relative inline-flex rounded-full h-2 w-2", DOTS[status] || DOTS.idle)}
        ></span>
      </span>
      {children}
    </span>
  );
}
