import { CashLedgerTable } from "@/components/investor/underwrite/CashLedgerTable";
import { CarbonLedgerTable } from "@/components/investor/underwrite/CarbonLedgerTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUnderwriting } from "@/lib/investor/api";

export default async function Underwrite({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const u = await getUnderwriting(projectId);
  if (!u) return <div className="text-sm text-muted-foreground">Underwriting data not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Underwrite</h1>
          <div className="text-sm text-muted-foreground">Project ID: {u.projectId}</div>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">Readiness {u.readinessScore}%</Badge>
          <Badge variant="outline">Risk {u.riskRating}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Scenario controls (TODO)</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Implement Base/Downside/Upside assumptions and optional carbon price sensitivity.</CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CashLedgerTable terms={u.terms} />
        <CarbonLedgerTable terms={u.terms} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Export (placeholder)</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Add export underwriting JSON and IC memo placeholder actions.</CardContent>
      </Card>
    </div>
  );
}
