"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Clock, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeployHeader } from "@/components/deploy/DeployHeader";
import { ProjectInfoCard } from "@/components/deploy/ProjectInfoCard";
import { LogsTerminal } from "@/components/deploy/LogsTerminal";
import { getLiveProjectUrl } from "@/components/deploy/utils";
import { useRequireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useCopy } from "@/hooks/useCopy";

export default function DeployPage() {
  const { id } = useParams(); // projectId from URL
  useRequireAuth();
  const [project, setProject] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deploymentId, setDeploymentId] = useState(null);
  const [error, setError] = useState(null);
  const [isDeployed, setIsDeployed] = useState(false);
  const [copiedId, copyIdText] = useCopy();
  const [copiedLogs, copyLogsText] = useCopy();
  const API_URL_S3 = process.env.NEXT_PUBLIC_S3_PROXY_URL;

  // Fetch project details
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const { data } = await api.get("/user/getProjects");
        const found = data.projects.find((p) => p.id === id);
        if (!found) setNotFound(true);
        else setProject(found);
      } catch (err) {
        console.error("Error fetching project", err);
      }
    };
    fetchProject();
  }, [id]);

  // Fetch logs (immediate + polling with deploymentId)
  useEffect(() => {
    if (!deploymentId) return;

    const fetchLogs = async () => {
      try {
        const { data } = await api.get(`/project/logs/${deploymentId}`);
        const newLogs = data.logs || [];
        setLogs(newLogs);
        if (
          newLogs.some((log) =>
            log.log.includes("All files uploaded successfully")
          )
        ) {
          setIsDeployed(true);
          return true;
        }
        return false;
      } catch (err) {
        console.error("Error fetching logs", err);
        return true; // stop polling on error
      }
    };

    let interval;
    fetchLogs().then((done) => {
      if (!done) {
        interval = setInterval(async () => {
          const finished = await fetchLogs();
          if (finished && interval) clearInterval(interval);
        }, 3000);
      }
    });

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [deploymentId]);

  // Deploy handler (redeploy allowed)
  const handleDeploy = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsDeployed(false);
    setLogs([]);
    setDeploymentId(null);

    try {
      const { data } = await api.post("/project/deploy", { projectId: id });
      setDeploymentId(data.deploymentId);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Deployment failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const copyId = () => {
    if (project) copyIdText(project.id);
  };

  const copyLogs = () => {
    copyLogsText(
      logs.map((l) => `[${l.timestamp}] ${l.log}`).join("\n"),
      "logs"
    );
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center py-10">
          <CardContent>
            <FolderOpen className="w-14 h-14 text-slate-300 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-1">Project not found</h2>
            <p className="text-sm text-slate-500 mb-5">
              This project doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Link href="/dashboard">
              <Button>Back to dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-slate-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  const liveUrl = getLiveProjectUrl(API_URL_S3, project.subDomain);
  const status = isDeployed ? "live" : deploymentId ? "building" : error ? "failed" : "idle";
  const statusLabel = isDeployed
    ? "Live"
    : deploymentId
      ? "Building…"
      : error
        ? "Deploy failed"
        : "Ready to deploy";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100/60 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <DeployHeader
          projectName={project.name}
          status={status}
          statusLabel={statusLabel}
        />

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="w-full lg:w-[360px] shrink-0">
            <ProjectInfoCard
              project={project}
              loading={loading}
              error={error}
              deploymentId={deploymentId}
              isDeployed={isDeployed}
              liveUrl={liveUrl}
              copied={copiedId === project.id}
              onDeploy={handleDeploy}
              onCopyId={copyId}
            />
          </div>

          <div className="flex-1 w-full min-w-0">
            <LogsTerminal
              logs={logs}
              deploymentId={deploymentId}
              isDeployed={isDeployed}
              copied={copiedLogs === "logs"}
              onCopy={copyLogs}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
