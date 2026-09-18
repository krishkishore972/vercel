"use client";
import { motion } from "framer-motion";
import { Github, Container, Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeUp, staggerParent } from "./animations";
import { SectionHeading } from "@/components/shared/SectionHeading";

const steps = [
  {
    n: "01",
    icon: <Github className="w-5 h-5" />,
    title: "Connect your repo",
    description:
      "Paste a GitHub URL, give your project a name. No YAML, no Dockerfile required.",
  },
  {
    n: "02",
    icon: <Container className="w-5 h-5" />,
    title: "We build automatically",
    description:
      "Every push triggers an ECS build with live streaming logs and artifact upload to S3.",
  },
  {
    n: "03",
    icon: <Rocket className="w-5 h-5" />,
    title: "Go live instantly",
    description:
      "Get a public URL on our edge proxy. Attach a custom domain when you're ready.",
  },
];

export function HowItWorks({ onGetStarted }) {
  return (
    <section
      id="how-it-works"
      className="py-20 px-4 bg-slate-950 text-white scroll-mt-20 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.25),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(37,99,235,0.2),transparent_60%)]" />
      <div className="max-w-6xl mx-auto relative">
        <SectionHeading
          dark
          eyebrow="How it works"
          title="Live in three steps"
          description="No CI files, no Docker knowledge, no DNS headaches to start."
        />

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid md:grid-cols-3 gap-5"
        >
          {steps.map((s, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              custom={i}
              className="relative bg-white/[0.04] border border-white/10 rounded-2xl p-6 backdrop-blur hover:border-deploy-blue/40 hover:bg-white/[0.06] transition-colors"
            >
              <span className="text-5xl font-bold text-white/10 absolute top-4 right-5">
                {s.n}
              </span>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-deploy-purple to-deploy-blue flex items-center justify-center mb-4">
                {s.icon}
              </div>
              <h3 className="font-semibold text-lg mb-1.5">{s.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{s.description}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Button
            onClick={onGetStarted}
            className="bg-white text-slate-950 hover:bg-slate-200 px-8 py-3 h-auto rounded-xl font-semibold"
          >
            Create your first project <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
