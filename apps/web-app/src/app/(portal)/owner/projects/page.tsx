import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { listOwnerProjects } from "@/lib/api/client";

export default async function OwnerProjects() {
  const projects = await listOwnerProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button asChild>
          <Link href="/owner/projects/new">Create Project</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <p className="text-sm text-slate-500">
                    {project.country}
                    {project.region ? ` | ${project.region}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{project.category}</Badge>
                  <Badge variant="outline">{project.stage}</Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Funding Ask</p>
                  <p className="font-medium">
                    {project.fundingAskAmount
                      ? `${project.fundingAskCurrency ?? ""} ${project.fundingAskAmount.toLocaleString()}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Annual Credits</p>
                  <p className="font-medium">
                    {project.annualCreditsTco2e ? `${project.annualCreditsTco2e.toLocaleString()} tCO2e` : "N/A"}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Readiness</span>
                  <span className="font-medium">{project.readinessScore ?? 0}%</span>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
