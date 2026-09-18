"use client";
import { motion } from "framer-motion";
import { Cloud } from "lucide-react";

const items = ["GitHub", "AWS ECS", "Amazon S3", "Docker", "Next.js", "Edge CDN"];

export function StackStrip() {
  return (
    <section className="border-y border-slate-200/70 bg-white/70 backdrop-blur py-5 mt-10">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-slate-500"
        >
          <span className="text-xs uppercase tracking-widest text-slate-400 w-full sm:w-auto text-center">
            Powered by
          </span>
          {items.map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-slate-400" /> {t}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
