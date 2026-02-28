import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSnapshot } from "@/lib/api/contracts";

export function WorkQueue({ items }: { items: DashboardSnapshot["workQueue"] }) {
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
        {items.length === 0 && <div className="text-xs text-muted-foreground">No tasks at the moment.</div>}
      </CardContent>
    </Card>
  );
}
