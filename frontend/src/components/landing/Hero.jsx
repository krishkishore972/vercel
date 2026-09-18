"use client";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Play,
  Star,
  ChevronRight,
  Timer,
  Activity,
  Layers,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fadeUp, staggerParent, scrollToId } from "./animations";

const stats = [
  { icon: <Timer className="w-4 h-4" />, value: "<30s", label: "Median build time" },
  { icon: <Activity className="w-4 h-4" />, value: "99.99%", label: "Deploy success rate" },
  { icon: <Layers className="w-4 h-4" />, value: "10k+", label: "Deployments shipped" },
  { icon: <Globe className="w-4 h-4" />, value: "Global", label: "S3 + edge delivery" },
];

const pipeline = [
  { label: "Git push detected", done: true },
  { label: "ECS container build", done: true },
  { label: "Assets → S3 + CDN", done: true },
  { label: "Edge URL assigned", done: false },
];

export function Hero({ onGetStarted }) {
  return (
    <main className="container mx-auto px-4 pt-14 pb-8">
      <div className="max-w-6xl mx-auto text-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-sm text-slate-600 mb-6"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          All systems operational · v2 now live
          <button
            onClick={() => scrollToId("how-it-works")}
            className="text-deploy-blue font-medium inline-flex items-center gap-0.5 hover:gap-1.5 transition-all"
          >
            See what&apos;s new <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]"
        >
          Ship frontend apps
          <br />
          <span className="bg-gradient-to-r from-deploy-purple to-deploy-blue bg-clip-text text-transparent">
            in seconds, not hours
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
          className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mt-6 leading-relaxed"
        >
          Paste your GitHub URL, we build on AWS ECS, host on S3 and put you on
          a global edge URL — with live logs and zero configuration.
        </motion.p>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="flex flex-col sm:flex-row gap-3 justify-center mt-8"
        >
          <Button
            onClick={onGetStarted}
            className="bg-deploy-blue hover:bg-deploy-blue/90 px-8 py-3 text-base h-auto rounded-xl shadow-lg shadow-deploy-blue/25"
          >
            Start deploying — it&apos;s free
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button
            onClick={() => scrollToId("how-it-works")}
            variant="outline"
            className="px-8 py-3 text-base h-auto rounded-xl border-2 bg-white"
          >
            <Play className="w-4 h-4 mr-1" />
            See how it works
          </Button>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={4}
          className="flex items-center justify-center gap-4 mt-6 text-sm text-slate-500"
        >
          <span className="flex items-center gap-1">
            <span className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </span>
            Loved by developers
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-500" /> No credit card required
          </span>
        </motion.div>

        {/* Product mock / terminal */}
        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.35, ease: "easeOut" }}
          className="mt-12 text-left"
        >
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-deploy-purple/15 via-deploy-blue/15 to-deploy-purple/15 blur-2xl rounded-3xl" />
            <div className="relative bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs text-slate-400 font-mono">
                  deploy — live build logs
                </span>
                <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-mono">
                  ● LIVE
                </span>
              </div>
              <div className="grid md:grid-cols-5">
                <div className="md:col-span-3 p-5 font-mono text-[13px] leading-6">
                  <p className="text-slate-500">$ deploy --repo my-awesome-app</p>
                  <p className="text-slate-300">
                    <span className="text-emerald-400">✓</span> Cloned{" "}
                    <span className="text-deploy-blue">github.com/you/my-awesome-app</span>
                  </p>
                  <p className="text-slate-300">
                    <span className="text-emerald-400">✓</span> Build completed in 24s
                    (ECS + cache)
                  </p>
                  <p className="text-slate-300">
                    <span className="text-emerald-400">✓</span> Uploaded 142 files to S3
                  </p>
                  <p className="text-slate-300">
                    <span className="text-emerald-400">✓</span> Live at{" "}
                    <button
                      onClick={onGetStarted}
                      className="text-deploy-blue underline underline-offset-2 hover:text-white transition-colors"
                    >
                      my-awesome-app.deploy.live
                    </button>
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 font-sans">
                    <Button
                      size="sm"
                      onClick={onGetStarted}
                      className="bg-white text-slate-900 hover:bg-slate-200 rounded-lg"
                    >
                      Try it yourself <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => scrollToId("features")}
                      className="rounded-lg border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white bg-transparent"
                    >
                      Explore features
                    </Button>
                  </div>
                </div>
                <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/60 p-5">
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">
                    Deployment pipeline
                  </p>
                  {pipeline.map((s, i) => (
                    <div key={i} className="flex items-center gap-2.5 py-1.5 text-sm">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                          s.done
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-deploy-blue/20 text-deploy-blue animate-pulse"
                        }`}
                      >
                        {s.done ? <Check className="w-3 h-3" /> : i + 1}
                      </span>
                      <span className={s.done ? "text-slate-300" : "text-white font-medium"}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mt-10"
        >
          {stats.map((s, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              custom={i}
              className="bg-white border border-slate-200 rounded-xl px-4 py-4 shadow-sm flex flex-col items-center gap-1"
            >
              <span className="flex items-center gap-1.5 text-2xl font-bold">
                <span className="text-deploy-blue">{s.icon}</span> {s.value}
              </span>
              <span className="text-xs text-slate-500">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
