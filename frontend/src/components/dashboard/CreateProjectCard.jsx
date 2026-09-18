"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Github, Clock, Rocket, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fadeUp } from "@/components/landing/animations";
import { FormAlert } from "@/components/shared/FormAlert";

export function CreateProjectCard({
  name,
  gitURL,
  loading,
  error,
  success,
  urlOk,
  onNameChange,
  onGitURLChange,
  onSubmit,
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={1}
      id="create-project"
      className="w-full lg:w-[360px] shrink-0 scroll-mt-24"
    >
      <div className="relative">
        <div className="absolute -inset-2 bg-gradient-to-r from-deploy-purple/15 to-deploy-blue/15 blur-xl rounded-3xl" />
        <Card className="relative rounded-2xl shadow-lg border-slate-200/70 lg:sticky lg:top-6 py-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-r from-deploy-purple to-deploy-blue flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </span>
              Create new project
            </CardTitle>
            <CardDescription>
              Point us at a public GitHub repo — we handle the build.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="proj-name">Project name</Label>
                <Input
                  id="proj-name"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  required
                  maxLength={50}
                  placeholder="my-awesome-app"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="proj-url">Git repository URL</Label>
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="proj-url"
                    value={gitURL}
                    onChange={(e) => onGitURLChange(e.target.value)}
                    required
                    placeholder="https://github.com/username/repo"
                    className={`pl-9 rounded-xl font-mono text-[13px] ${
                      urlOk ? "" : "border-red-400 focus-visible:ring-red-400"
                    }`}
                  />
                </div>
                {!urlOk ? (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> That doesn&apos;t look
                    like a GitHub repo URL.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">
                    Public repos work instantly. Private repos coming soon.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-deploy-purple to-deploy-blue hover:from-deploy-purple/90 hover:to-deploy-blue/90 rounded-xl py-2.5"
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin mr-1" /> Creating…
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-1" /> Create project
                  </>
                )}
              </Button>
            </form>

            <AnimatePresence>
              {error && (
                <FormAlert type="error" className="mt-4">
                  {error}
                </FormAlert>
              )}
              {success && (
                <FormAlert type="success" className="mt-4">
                  {success}
                </FormAlert>
              )}
            </AnimatePresence>

            <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
              {[
                "Zero-config builds on ECS",
                "Live streaming logs",
                "Edge URL + custom domains",
              ].map((t) => (
                <p key={t} className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500" /> {t}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
