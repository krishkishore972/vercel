"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  GitBranch,
  ExternalLink,
  Clock,
  Rocket,
  Globe,
  Check,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fadeUp } from "@/components/landing/animations";
import { formatGitURL } from "@/components/dashboard/utils";
import { ProjectAvatar } from "@/components/shared/ProjectAvatar";
import { FormAlert } from "@/components/shared/FormAlert";

export function ProjectInfoCard({
  project,
  loading,
  error,
  deploymentId,
  isDeployed,
  liveUrl,
  copied,
  onDeploy,
  onCopyId,
}) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1}>
      <Card className="rounded-2xl shadow-lg border-slate-200/70 lg:sticky lg:top-6 py-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-deploy-blue" />
            Project Details
          </CardTitle>
          <CardDescription>Review the source before you ship it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <ProjectAvatar name={project.name} size="md" />
              <h3 className="font-semibold truncate">{project.name}</h3>
            </div>
            <a
              href={project.gitURL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center text-slate-600 hover:text-slate-900 text-sm mb-3 transition-colors"
            >
              <GitBranch className="w-4 h-4 mr-1.5 shrink-0" />
              <span className="truncate font-mono text-[13px]">
                {formatGitURL(project.gitURL)}
              </span>
              <ExternalLink className="w-3.5 h-3.5 ml-1.5 shrink-0" />
            </a>
            <button
              onClick={onCopyId}
              title="Copy full project ID"
              aria-label="Copy full project ID"
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-full transition-colors"
            >
              ID: {project.id.slice(0, 8)}…
              {copied ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>

          <Button
            onClick={onDeploy}
            disabled={loading}
            className="w-full bg-gradient-to-r from-deploy-purple to-deploy-blue hover:from-deploy-purple/90 hover:to-deploy-blue/90 text-white py-2.5 text-base rounded-xl"
          >
            {loading ? (
              <>
                <Clock className="w-5 h-5 animate-spin" /> Deploying…
              </>
            ) : isDeployed ? (
              <>
                <Rocket className="w-5 h-5" /> Redeploy project
              </>
            ) : deploymentId ? (
              <>
                <Clock className="w-5 h-5 animate-pulse" /> Building…
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" /> Deploy project
              </>
            )}
          </Button>

          <AnimatePresence>
            {error && <FormAlert type="error">{error}</FormAlert>}
            {deploymentId && !isDeployed && !error && (
              <FormAlert type="info">
                Deployment in progress — streaming logs…
              </FormAlert>
            )}
            {isDeployed && liveUrl && liveUrl !== "#" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Globe className="w-3 h-3 text-emerald-600" />
                  </span>
                  <p className="font-semibold text-sm">Your project is live!</p>
                </div>
                <p className="truncate font-mono text-xs text-emerald-700 mb-3">
                  {liveUrl.replace(/^https?:\/\//, "")}
                </p>
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  View live project
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
