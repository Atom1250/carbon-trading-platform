import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OwnerProjectDetail({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Project: {projectId}</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-500">
            TODO: snapshot, readiness meter, and tabs for Overview, Tasks, Documents, Access, and Q and A.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Readiness</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-500">TODO: readiness scoring from required documents.</CardContent>
        </Card>
      </div>
    </div>
  );
}
