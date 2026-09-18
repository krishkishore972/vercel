"use client";
import { motion } from "framer-motion";
import { fadeUp } from "@/components/landing/animations";
import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, description, dark = false }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className="text-center mb-12"
    >
      <p className="text-sm font-semibold text-deploy-blue uppercase tracking-widest mb-2">
        {eyebrow}
      </p>
      <h2 className="text-3xl md:text-4xl font-bold mb-3">{title}</h2>
      {description && (
        <p
          className={cn(
            "max-w-2xl mx-auto",
            dark ? "text-slate-400 max-w-xl" : "text-lg text-slate-600"
          )}
        >
          {description}
        </p>
      )}
    </motion.div>
  );
}
