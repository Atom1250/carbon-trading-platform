import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCatalog } from "@/lib/investor/api";

export default async function InvestorProject({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const catalog = await listCatalog();
  const p = catalog.find((x) => x.projectId === projectId);

  if (!p) return <div className="text-sm text-muted-foreground">Project not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{p.name}</h1>
          <div className="text-sm text-muted-foreground">
            {p.country}
            {p.region ? ` | ${p.region}` : ""}
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{p.category}</Badge>
          <Badge variant="outline">{p.stage}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Teaser vs Dataroom gating (TODO)</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>Implement NDA/approval-based access gating and dataroom tabs for full investor diligence.</div>
          <div className="flex gap-3">
            <Link className="underline" href={`/investor/projects/${p.projectId}/underwrite`}>Go to Underwrite</Link>
            <Link className="underline" href={`/investor/messages?projectId=${p.projectId}`}>Go to Q&A</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
