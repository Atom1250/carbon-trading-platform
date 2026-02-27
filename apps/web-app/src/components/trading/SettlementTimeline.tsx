import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SettlementMilestone } from "@/lib/trading/types";

export function SettlementTimeline({ milestones }: { milestones: SettlementMilestone[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">DvP Settlement Timeline</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {milestones.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
            <div>{m.type}</div>
            <Badge variant={m.status === "DONE" ? "secondary" : m.status === "BLOCKED" ? "destructive" : "outline"}>{m.status}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
