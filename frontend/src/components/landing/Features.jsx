"use client";
import { motion } from "framer-motion";
import {
  Zap,
  Globe,
  Shield,
  BarChart3,
  GitBranch,
  Server,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fadeUp, staggerParent } from "./animations";
import { SectionHeading } from "@/components/shared/SectionHeading";

const features = [
  {
    icon: <GitBranch className="w-6 h-6 text-deploy-blue" />,
    title: "GitHub Integration",
    description:
      "Push to GitHub and we build automatically. Preview every commit with an isolated deployment.",
  },
  {
    icon: <Zap className="w-6 h-6 text-deploy-purple" />,
    title: "Lightning Fast Builds",
    description:
      "Containerized builds on AWS ECS with layer caching. Most apps live in under 30 seconds.",
  },
  {
    icon: <Globe className="w-6 h-6 text-deploy-blue" />,
    title: "Global Edge CDN",
    description:
      "Static assets on S3 + worldwide edge delivery for sub-100ms loads anywhere.",
  },
  {
    icon: <Server className="w-6 h-6 text-deploy-purple" />,
    title: "Custom Domains + SSL",
    description:
      "Attach any domain. Certificates are issued and renewed automatically.",
  },
  {
    icon: <Shield className="w-6 h-6 text-deploy-blue" />,
    title: "Secure by Default",
    description:
      "HTTPS everywhere, isolated build environments and encrypted env variables.",
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-deploy-purple" />,
    title: "Real-time Logs",
    description:
      "Stream build and deploy logs live. Debug failures without leaving the dashboard.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 px-4 scroll-mt-20">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to ship"
          description="From first push to custom domain — the whole deployment workflow in one dashboard."
        />

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((f, i) => (
            <motion.div key={i} variants={fadeUp} custom={i}>
              <Card className="h-full border-slate-200/70 bg-white/90 backdrop-blur-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group rounded-xl">
                <CardHeader className="pb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-deploy-blue/10 to-deploy-purple/10 border border-deploy-blue/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    {f.icon}
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    {f.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
