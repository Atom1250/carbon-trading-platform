import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FigmaPage, FigmaPanel, FigmaStatGrid } from "@/components/figma/FigmaPortalPrimitives";
import { listOwnerProjects } from "@/lib/api/client";

export default async function OwnerProjects() {
  const projects = await listOwnerProjects();
  const avgReadiness =
    projects.length === 0 ? 0 : Math.round(projects.reduce((acc, item) => acc + (item.readinessScore ?? 0), 0) / projects.length);
  const fundingProjects = projects.filter((item) => typeof item.fundingAskAmount === "number" && item.fundingAskAmount > 0).length;

  return (
    <FigmaPage
      title="Projects"
      subtitle="Manage project readiness, funding asks, and investor exposure."
      right={
        <Button asChild>
          <Link href="/owner/projects/new">Create Project</Link>
        </Button>
      }
    >
      <FigmaStatGrid
        stats={[
          { key: "total", label: "Total Projects", value: String(projects.length) },
          { key: "avg-readiness", label: "Average Readiness", value: `${avgReadiness}%` },
          { key: "funding", label: "With Funding Ask", value: String(fundingProjects) },
          { key: "investor-preview", label: "Investor Preview", value: "Enabled" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <FigmaPanel key={project.id} title={project.name} subtitle={`${project.country}${project.region ? ` | ${project.region}` : ""}`}>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="text-xs text-white/60">Project ID: {project.id}</div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{project.category}</Badge>
                  <Badge variant="outline">{project.stage}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-white/60">Funding Ask</p>
                  <p className="font-medium text-white">
                    {project.fundingAskAmount
                      ? `${project.fundingAskCurrency ?? ""} ${project.fundingAskAmount.toLocaleString()}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-white/60">Annual Credits</p>
                  <p className="font-medium text-white">
                    {project.annualCreditsTco2e ? `${project.annualCreditsTco2e.toLocaleString()} tCO2e` : "N/A"}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Readiness</span>
                  <span className="font-medium text-white">{project.readinessScore ?? 0}%</span>
                </div>
                <Progress value={project.readinessScore ?? 0} />
              </div>

              <div className="flex gap-2">
                <Button asChild variant="secondary">
                  <Link href={`/owner/projects/${project.id}`}>Open</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/investor/projects/${project.id}`}>Preview Investor View</Link>
                </Button>
              </div>
            </div>
          </FigmaPanel>
        ))}
      </div>
      {projects.length === 0 ? (
        <FigmaPanel title="No Projects Yet" subtitle="Start by creating your first project intake.">
          <div className="text-sm text-white/75">
            Use the "Create Project" action to launch the owner project wizard.
          </div>
        </FigmaPanel>
      ) : null}
    </FigmaPage>
  );
}
