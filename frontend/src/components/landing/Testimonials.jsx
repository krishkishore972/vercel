"use client";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { fadeUp, staggerParent } from "./animations";
import { SectionHeading } from "@/components/shared/SectionHeading";

const testimonials = [
  {
    quote:
      "I pasted my repo URL and was live before my coffee cooled. The live logs make debugging builds trivial.",
    name: "Aarav Mehta",
    role: "Frontend Engineer",
    initials: "AM",
  },
  {
    quote:
      "Zero config is real. No Dockerfile, no CI file — just push and share the URL with the team.",
    name: "Sara Thomas",
    role: "Indie Hacker",
    initials: "ST",
  },
  {
    quote:
      "The deploy detail page with streaming logs replaced three tools for us. Clients love the instant preview links.",
    name: "Daniel K.",
    role: "Freelance Developer",
    initials: "DK",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Wall of love"
          title="Developers ship faster here"
        />
        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid md:grid-cols-3 gap-5"
        >
          {testimonials.map((t, i) => (
            <motion.figure
              key={i}
              variants={fadeUp}
              custom={i}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <span className="flex text-amber-400 mb-3">
                {[...Array(5)].map((_, s) => (
                  <Star key={s} className="w-4 h-4 fill-current" />
                ))}
              </span>
              <blockquote className="text-slate-700 leading-relaxed flex-1">
                “{t.quote}”
              </blockquote>
              <figcaption className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-100">
                <span className="w-10 h-10 rounded-full bg-gradient-to-r from-deploy-purple to-deploy-blue text-white text-sm font-bold flex items-center justify-center">
                  {t.initials}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{t.name}</span>
                  <span className="block text-xs text-slate-500">{t.role}</span>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
