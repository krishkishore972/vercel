"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  GitBranch,
  ExternalLink,
  Check,
  Copy,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fadeUp } from "@/components/landing/animations";
import { formatGitURL } from "./utils";
import { ProjectAvatar } from "@/components/shared/ProjectAvatar";
import { StatusBadge } from "@/components/shared/StatusBadge";

export function ProjectCard({ project, index, copied, onCopy }) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index % 6}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group"
    >
      <Card className="p-5 rounded-xl hover:shadow-lg hover:border-deploy-blue/30 hover:-translate-y-0.5 transition-all duration-300 py-5">
        <CardContent className="p-0">
          <div className="flex items-start gap-3 mb-4">
            <ProjectAvatar name={project.name} size="lg" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold truncate">{project.name}</h3>
              <p className="flex items-center text-xs text-slate-500 truncate">
                <GitBranch className="w-3.5 h-3.5 mr-1 shrink-0" />
                <span className="truncate font-mono">
                  {formatGitURL(project.gitURL)}
                </span>
              </p>
            </div>
            <StatusBadge status="ready" className="text-[11px] px-2 py-0.5 shrink-0">
              Ready
            </StatusBadge>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/deploy/${project.id}`} className="flex-1">
              <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm">
                Deploy{" "}
                <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="icon"
              title="Copy project ID"
              aria-label="Copy project ID"
              onClick={() => onCopy(project.id)}
              className="rounded-lg shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
            <a
              href={project.gitURL}
              target="_blank"
              rel="noreferrer"
              title="Open repo on GitHub"
              aria-label="Open repository on GitHub"
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <p className="mt-3 text-[11px] text-slate-400 font-mono truncate">
            ID: {project.id}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
