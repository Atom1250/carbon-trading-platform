import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listOwnerProjects } from "@/lib/api/client";

export default async function OwnerDashboard() {
  const projects = await listOwnerProjects();
  const avgReadiness =
    projects.length === 0
      ? 0
      : Math.round(projects.reduce((acc, project) => acc + (project.readinessScore ?? 0), 0) / projects.length);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active Projects</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{projects.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avg Readiness</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{avgReadiness}%</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Investor Requests</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">0</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Open Q and A</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">0</CardContent>
        </Card>
      </div>
    </div>
  );
}
