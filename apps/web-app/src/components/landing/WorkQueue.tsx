import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkQueue() {
  const items = [
    { title: "Onboarding: Upload beneficial ownership evidence", meta: "Due in 2 days", severity: "BLOCKER" },
    { title: "Trade settlement: Provide cash confirmation", meta: "RFQ -> Trade #T-1021", severity: "URGENT" },
    { title: "Project readiness: Missing permits matrix", meta: "Project P-001", severity: "WARNING" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">My tasks & blockers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {items.map((it, idx) => (
          <div key={idx} className="rounded-md border p-3">
            <div className="font-medium">{it.title}</div>
            <div className="text-xs text-muted-foreground">
              {it.meta} • {it.severity}
            </div>
          </div>
        ))}
        <div className="text-xs text-muted-foreground">TODO: connect to unified task engine and role-specific workflow states.</div>
      </CardContent>
    </Card>
  );
}
