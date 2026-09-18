"use client";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FileText, Copy, Check, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fadeUp } from "@/components/landing/animations";
import { LOG_COLORS, getLogLevel } from "./utils";

export function LogsTerminal({ logs, deploymentId, isDeployed, copied, onCopy }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      custom={2}
      className="h-full"
    >
      <Card className="rounded-2xl shadow-lg border-slate-200/70 overflow-hidden py-0 gap-0">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-deploy-blue" />
            Deployment logs
          </CardTitle>
          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {logs.length} {logs.length === 1 ? "entry" : "entries"}
              </span>
            )}
            {logs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCopy}
                className="rounded-lg h-8"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="text-center py-14 px-6 text-slate-500">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                <Terminal className="w-14 h-14 text-slate-300 mx-auto mb-3" />
              </motion.div>
              <p className="font-medium text-slate-600">
                {deploymentId
                  ? "Waiting for first log line…"
                  : "No logs yet. Deploy your project to see logs here."}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {deploymentId
                  ? "Build output streams in every ~3 seconds."
                  : "Each deploy streams build output in real time."}
              </p>
            </div>
          ) : (
            <div className="bg-slate-950 border-t border-slate-800">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-[11px] font-mono text-slate-500">
                  {isDeployed ? "build finished" : "● streaming"}
                </span>
              </div>
              <div
                ref={scrollRef}
                className="font-mono text-[13px] leading-6 p-4 max-h-[600px] overflow-y-auto space-y-1"
              >
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className="flex gap-2 pb-1 border-b border-white/5 last:border-b-0"
                  >
                    <span className="text-slate-600 text-[11px] shrink-0 select-none">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className={`break-all ${LOG_COLORS[getLogLevel(log.log)]}`}>
                      {log.log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
