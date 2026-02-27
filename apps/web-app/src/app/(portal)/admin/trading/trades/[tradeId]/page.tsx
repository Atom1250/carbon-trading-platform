import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminTradeOversight } from "@/lib/admin/api";

export default async function AdminTradeOversight({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params;
  const data = await getAdminTradeOversight(tradeId);
  if (!data) return <div className="text-sm text-muted-foreground">Trade not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Trade Oversight: {data.trade.id}</h1>
        <Badge variant={data.trade.status === "SETTLED" ? "secondary" : data.trade.status === "FAILED" ? "destructive" : "outline"}>{data.trade.status}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Settlement Summary</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>Counterparty: {data.trade.counterparty}</div>
            <div>Executed: {data.trade.executedQty.toLocaleString()} @ {data.trade.currency} {data.trade.executedPrice}</div>
            <div>Pending milestones: {data.pending}</div>
            <div>Counterparty responsibility: {data.counterpartyResponsibility}</div>
            <div className="pt-1 text-muted-foreground">Use this panel to triage blockage ownership before escalation.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Blockage Indicator</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {!data.blockage && <div className="text-muted-foreground">No blocked milestones.</div>}
            {data.blockage && (
              <div className="space-y-1 rounded-md border p-2">
                <div className="font-medium">Blocked at {data.blockage.type}</div>
                <div>{data.blockage.comment ?? "No comment captured"}</div>
                <div className="text-muted-foreground">Last updated by {data.blockage.updatedBy} at {data.blockage.updatedAt}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Settlement Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.timeline.map((m) => (
            <div key={m.id} className="rounded-md border p-2">
              <div className="flex items-center justify-between">
                <div>{m.type}</div>
                <Badge variant={m.status === "DONE" ? "secondary" : m.status === "BLOCKED" ? "destructive" : "outline"}>{m.status}</Badge>
              </div>
              <div className="text-muted-foreground">Updated by {m.updatedBy} at {m.updatedAt}{m.adminOverride ? " | admin override" : ""}</div>
              {m.evidence && m.evidence.length > 0 && <div className="text-muted-foreground">Evidence: {m.evidence.map((e) => e.name).join(", ")}</div>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
