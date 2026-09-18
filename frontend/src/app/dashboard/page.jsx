"use client";
import React, { useCallback, useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CreateProjectCard } from "@/components/dashboard/CreateProjectCard";
import { ProjectsGrid } from "@/components/dashboard/ProjectsGrid";
import { isValidGitHubURL } from "@/components/dashboard/utils";
import { useRequireAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useCopy } from "@/hooks/useCopy";

function Page() {
  const { authName } = useRequireAuth();
  const [name, setName] = useState("");
  const [gitURL, setGitURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [projects, setProjects] = useState([]);
  const [copiedId, copyId] = useCopy();

  const fetchProjects = useCallback(async () => {
    try {
      setFetching(true);
      const { data } = await api.get("/user/getProjects");
      setProjects(data.projects || []);
    } catch (err) {
      console.error("Error fetching projects", err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Auto-dismiss success toast
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const handleCreateProject = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");
      setSuccess("");

      if (!name.trim() || !gitURL.trim()) {
        setError("Please fill in all fields.");
        return;
      }
      if (!isValidGitHubURL(gitURL)) {
        setError("Enter a valid GitHub repo URL, e.g. https://github.com/user/repo");
        return;
      }

      setLoading(true);
      try {
        const { data } = await api.post("/project", {
          name: name.trim(),
          gitURL: gitURL.trim(),
        });
        console.log("Project:", data.project);
        setSuccess(`“${name.trim()}” created — ready to deploy!`);
        setName("");
        setGitURL("");
        fetchProjects();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to create project");
      } finally {
        setLoading(false);
      }
    },
    [name, gitURL, fetchProjects]
  );

  const scrollToCreate = () =>
    document
      .getElementById("create-project")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });

  const urlOk = gitURL.trim() === "" || isValidGitHubURL(gitURL);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100/60">
      <DashboardHeader
        authName={authName}
        total={projects.length}
        fetching={fetching}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <CreateProjectCard
            name={name}
            gitURL={gitURL}
            loading={loading}
            error={error}
            success={success}
            urlOk={urlOk}
            onNameChange={setName}
            onGitURLChange={setGitURL}
            onSubmit={handleCreateProject}
          />

          <div className="flex-1 w-full min-w-0">
            <ProjectsGrid
              projects={projects}
              fetching={fetching}
              copiedId={copiedId}
              onCopy={copyId}
              onCreateFirst={scrollToCreate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Page;
