"use client";
import { getGradient, getInitials } from "@/components/dashboard/utils";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "w-8 h-8 rounded-lg text-xs",
  md: "w-10 h-10 rounded-lg text-sm",
  lg: "w-11 h-11 rounded-xl text-sm",
};

export function ProjectAvatar({ name = "?", size = "lg", className }) {
  return (
    <span
      className={cn(
        "bg-gradient-to-r text-white font-bold flex items-center justify-center shadow-md shrink-0",
        getGradient(name),
        SIZES[size] || SIZES.lg,
        className
      )}
    >
      {getInitials(name)}
    </span>
  );
}
