import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { listOwnerProjects } from "@/lib/api/client";

export default async function OwnerDashboard() {
  const projects = await listOwnerProjects();
  const avgReadiness =
    projects.length === 0
      ? 0
      : Math.round(projects.reduce((acc, project) => acc + (project.readinessScore ?? 0), 0) / projects.length);

  return (
    <FigmaPage title="Dashboard" subtitle="Project owner control center for portfolio readiness and investor engagement.">
      <FigmaStatGrid
        stats={[
          { key: "projects", label: "Active Projects", value: String(projects.length) },
          { key: "readiness", label: "Avg Readiness", value: `${avgReadiness}%` },
          { key: "requests", label: "Investor Requests", value: "0" },
          { key: "qa", label: "Open Q and A", value: "0" },
        ]}
      />
      <FigmaPanel title="Portfolio Pulse" subtitle="Quick view of owner-side readiness and engagement status.">
        <div className="text-sm text-white/75">
          Keep project readiness above 70% to improve investor discoverability and underwriting throughput.
        </div>
      </FigmaPanel>
    </FigmaPage>
  );
}
