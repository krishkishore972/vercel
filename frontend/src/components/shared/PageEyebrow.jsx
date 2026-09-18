"use client";
import { cn } from "@/lib/utils";

export function PageEyebrow({ icon, children, className }) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-deploy-blue bg-deploy-blue/10 border border-deploy-blue/15 rounded-full px-3 py-1 mb-3",
        className
      )}
    >
      {icon}
      {children}
    </p>
  );
}
