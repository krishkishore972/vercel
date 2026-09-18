"use client";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Plus, LayoutGrid, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fadeUp, staggerParent } from "@/components/landing/animations";
import { ProjectCard } from "./ProjectCard";

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="p-5 animate-pulse">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-slate-200" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
            <div className="h-9 bg-slate-100 rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ProjectsGrid({ projects, fetching, copiedId, onCopy, onCreateFirst }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={2}
      className="p-6 bg-white rounded-2xl shadow-lg border border-slate-200/70"
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-deploy-blue" />
          Your projects
        </h2>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </span>
      </div>

      {fetching ? (
        <LoadingSkeleton />
      ) : projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-14 px-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/60"
        >
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
            <FolderOpen className="w-14 h-14 text-slate-300 mx-auto mb-3" />
          </motion.div>
          <h3 className="text-lg font-semibold mb-1">No projects yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
            Create your first project with a GitHub URL — you&apos;ll get a live
            deployment in under a minute.
          </p>
          <Button onClick={onCreateFirst} variant="outline" className="rounded-xl">
            <Plus className="w-4 h-4 mr-1" /> Create your first project
          </Button>
        </motion.div>
      ) : (
        <motion.div
          variants={staggerParent}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {projects.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={i}
                copied={copiedId === project.id}
                onCopy={onCopy}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {projects.length > 0 && (
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
          className="text-xs text-slate-400 mt-4 flex items-center gap-1.5 px-1"
        >
          <Github className="w-3.5 h-3.5" /> Click a project to open live logs and
          deploy it to the edge.
        </motion.p>
      )}
    </motion.div>
  );
}
