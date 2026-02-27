import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDisputes } from "@/lib/admin/api";

export default async function AdminDisputesPage() {
  const disputes = await getDisputes();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dispute Handling</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Disputes</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {disputes.map((d) => (
            <div key={d.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{d.id} | Trade {d.tradeId}</div>
                <Badge variant={d.resolutionStatus === "ESCALATED" ? "destructive" : d.resolutionStatus === "RESOLVED" ? "secondary" : "outline"}>{d.resolutionStatus}</Badge>
              </div>
              <div className="mt-1">{d.disputeReason}</div>
              <div className="text-muted-foreground">Evidence: {d.evidence.join(", ")}</div>
              {d.escalationNotes && <div className="text-muted-foreground">Escalation: {d.escalationNotes}</div>}
              <div className="pt-1"><Link className="underline" href={`/admin/trading/trades/${d.tradeId}`}>Open trade oversight</Link></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
